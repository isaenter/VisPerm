# VisPerm 权限管理系统 RBAC 重新设计方案

**文档版本：** v1.0  
**创建日期：** 2026-04-09  
**设计者：** Planner Agent  

---

## RALPLAN-DR 摘要

### Principles（设计原则）

1. **简单直观优先**：权限管理应当直观易懂，管理员无需学习复杂概念即可上手
2. **标准 RBAC 模型**：采用业界标准的 Role-Based Access Control 模型，降低认知成本
3. **渐进式增强**：保留扩展现有数据模型的能力，支持平滑迁移
4. **多租户隔离**：tenantId 全链路贯通，确保租户数据严格隔离
5. **性能可预测**：权限计算时间复杂度 O(1) 或 O(log n)，避免图遍历的不确定性

### Decision Drivers（决策驱动因素）

1. **用户体验问题**：当前画布拓扑图方案学习成本高，用户难以理解权限计算逻辑
2. **维护复杂度**：vis.service.ts 900+ 行复杂 DFS 逻辑，bug 难以定位和修复
3. **业务适配性**：大多数企业权限场景只需标准 RBAC，复杂图计算属于过度设计

### Viable Options（可行方案对比）

| 方案 | 描述 | 优点 | 缺点 |
|------|------|------|------|
| **方案 A：纯 RBAC** | 完全替换画布方案，只保留标准 RBAC | 简单清晰，易于理解和维护 | 失去灵活编排能力 |
| **方案 B：RBAC + 画布降级** | RBAC 作为主权限模型，画布作为可视化辅助工具 | 兼顾简单性和灵活性 | 实现复杂度较高 |
| **方案 C：双模并存** | RBAC 和画布拓扑并行，用户可选 | 最大灵活性 | 维护成本最高 |

**推荐方案：方案 A（纯 RBAC）**

**选择理由：**
- 用户反馈明确表示画布方案"不是一个好方案"
- 标准 RBAC 已能满足 90% + 企业权限需求
- 复杂编排需求可通过"角色继承"或"权限组"实现
- 降低长期维护成本

**替代方案无效化原因：**
- 方案 B：画布作为辅工具的价值的前提是用户理解其语义，当前反馈表明用户已放弃该心智模型
- 方案 C：双模并存会导致系统复杂度指数级上升，且多数用户不会使用高级功能

---

## 一、现状分析

### 1.1 当前方案架构

```
┌─────────────────────────────────────────────────────────────┐
│                    画布拓扑图权限方案                        │
├─────────────────────────────────────────────────────────────┤
│  节点类型：RESOURCE / ROLE / FILTER / ADDON                 │
│  连线类型：INHERITANCE / NARROWING / EXTENSION / DENY       │
│  计算方式：DFS 遍历 + EdgeType 合并策略                      │
│  核心文件：vis.service.ts (900+ 行)                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 当前方案问题

| 问题维度 | 具体描述 |
|----------|----------|
| **认知成本** | 用户需理解 4 种节点 + 4 种连线的组合语义，学习曲线陡峭 |
| **可解释性差** | 权限计算结果难以追溯，"为什么用户 A 没有订单删除权限？"难以回答 |
| **交互复杂** | 拖拽画布 + 连线配置 + 过滤器表达式，操作步骤繁琐 |
| **维护困难** | DFS 递归逻辑 + 边界情况处理，代码复杂度高达 900+ 行 |
| **性能不确定** | 图遍历时间复杂度 O(V+E)，大型拓扑图可能性能下降 |

### 1.3 需要保留的部分

| 保留内容 | 理由 |
|----------|------|
| 多租户架构 | tenantId 过滤已全链路贯通，设计良好 |
| Redis 缓存层 | 权限缓存机制有效，TTL=300s 合理 |
| 审计日志服务 | WORM 特性符合合规要求 |
| SysRole / SysUserRole 表 | 标准 RBAC 数据模型基础 |
| Snapshot 快照机制 | 配置回滚能力有价值 |

### 1.4 需要废弃的部分

| 废弃内容 | 替代方案 |
|----------|----------|
| VisNode / VisEdge / VisTopology 表 | 不再需要图结构存储 |
| DFS 权限计算逻辑 | 替换为标准 RBAC 权限聚合 |
| EdgeType 合并策略 | 不再需要复杂的权限合并逻辑 |
| 画布拓扑前端页面 | 替换为标准 RBAC 管理界面 |
| Filter 节点表达式计算 | 由数据权限层单独处理（可选扩展） |

---

## 二、新方案设计

### 2.1 核心概念定义

| 概念 | 说明 | 示例 |
|------|------|------|
| **资源 (Resource)** | 系统中可被访问的实体对象 | 订单、客户、产品 |
| **权限点 (Permission)** | 资源 + 操作的组合 | `order:read`, `order:edit`, `order:delete` |
| **角色 (Role)** | 权限点的集合 | 订单管理员、普通用户 |
| **用户 (User)** | 系统使用者，可分配多个角色 | user_123 |
| **数据范围 (Data Scope)** | 行级权限过滤规则 | 仅本部门、仅本人 |

### 2.2 数据模型设计（Prisma Schema）

```prisma
// ============================================
// RBAC 核心模型 - 替换现有画布拓扑模型
// ============================================

// --- 资源定义（保留现有 SysResourceMeta，简化） ---
model SysResource {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id") @db.VarChar(50)
  code        String   @db.VarChar(100)  // 资源编码：order, customer
  name        String   @db.VarChar(100)  // 资源名称：订单，客户
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 关系
  permissions SysPermission[]
  dataScopes  SysDataScope[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("sys_resource")
}

// --- 权限点定义（新增核心表） ---
model SysPermission {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id") @db.VarChar(50)
  resourceId String   @map("resource_id") @db.VarChar(100)
  resource   SysResource @relation(fields: [resourceId], references: [id])
  
  action     String   @db.VarChar(50)  // 操作类型：read/write/delete/manage
  code       String   @db.VarChar(100) // 权限编码：order:read
  name       String   @db.VarChar(100) // 权限名称：订单查看
  createdAt  DateTime @default(now()) @map("created_at")

  // 关系
  roles      SysRolePermission[]

  @@unique([tenantId, code])
  @@index([tenantId, resourceId])
  @@map("sys_permission")
}

// --- 角色定义（扩展现有 SysRole） ---
model SysRole {
  id          String   @id @default(uuid())
  tenantId    String   @map("tenant_id") @db.VarChar(50)
  name        String   @db.VarChar(100)
  code        String   @db.VarChar(100)
  description String?  @db.Text
  isSystem    Boolean  @default(false) @map("is_system")  // 系统内置角色不可删除
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 关系
  permissions SysRolePermission[]  // 角色 - 权限关联
  users       SysUserRole[]        // 用户 - 角色关联

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("sys_role")
}

// --- 角色 - 权限关联（新增关联表） ---
model SysRolePermission {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id") @db.VarChar(50)
  roleId       String   @map("role_id")
  permissionId String   @map("permission_id")
  createdAt    DateTime @default(now()) @map("created_at")

  // 关系
  role       SysRole      @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission SysPermission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([tenantId, roleId, permissionId])
  @@index([tenantId, roleId])
  @@index([tenantId, permissionId])
  @@map("sys_role_permission")
}

// --- 用户 - 角色关联（保留现有 SysUserRole） ---
model SysUserRole {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id") @db.VarChar(50)
  userId    String   @map("user_id") @db.VarChar(100)
  roleId    String   @map("role_id")
  createdAt DateTime @default(now()) @map("created_at")

  role SysRole @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, roleId])
  @@index([tenantId, userId])
  @@index([tenantId, roleId])
  @@map("sys_user_role")
}

// --- 数据范围/行级权限（可选扩展） ---
model SysDataScope {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id") @db.VarChar(50)
  resourceId String   @map("resource_id") @db.VarChar(100)
  resource   SysResource @relation(fields: [resourceId], references: [id])
  
  roleId     String   @map("role_id")
  scopeType  String   @db.VarChar(50)  // all(全部)/dept(本部门)/dept_sub(本部门及下级)/self(仅本人)
  deptIds    Json?    // 指定部门 ID 列表 [deptId1, deptId2]
  filterExpr String?  @db.Text  // 自定义过滤表达式（高级）
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([tenantId, resourceId, roleId])
  @@index([tenantId, roleId])
  @@map("sys_data_scope")
}

// --- 审计日志（保留现有 VisAuditLog，可重命名为 SysAuditLog） ---
// 保持现有结构不变
```

### 2.3 API 设计（RESTful 端点）

#### 资源管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/rbac/resources` | 获取资源列表 |
| GET | `/api/rbac/resources/:id` | 获取资源详情 |
| POST | `/api/rbac/resources` | 创建资源 |
| PUT | `/api/rbac/resources/:id` | 更新资源 |
| DELETE | `/api/rbac/resources/:id` | 删除资源 |

#### 权限点管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/rbac/permissions` | 获取权限点列表（支持按资源过滤） |
| GET | `/api/rbac/permissions/:id` | 获取权限点详情 |
| POST | `/api/rbac/permissions` | 创建权限点 |
| PUT | `/api/rbac/permissions/:id` | 更新权限点 |
| DELETE | `/api/rbac/permissions/:id` | 删除权限点 |

#### 角色管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/rbac/roles` | 获取角色列表 |
| GET | `/api/rbac/roles/:id` | 获取角色详情（含权限列表） |
| POST | `/api/rbac/roles` | 创建角色 |
| PUT | `/api/rbac/roles/:id` | 更新角色 |
| PUT | `/api/rbac/roles/:id/permissions` | 分配权限给角色 |
| DELETE | `/api/rbac/roles/:id` | 删除角色 |

#### 用户 - 角色管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/rbac/users/:userId/roles` | 获取用户角色列表 |
| POST | `/api/rbac/users/:userId/roles` | 分配角色给用户 |
| DELETE | `/api/rbac/users/:userId/roles/:roleId` | 移除用户角色 |
| GET | `/api/rbac/roles/:roleId/users` | 获取角色下的用户列表 |

#### 权限校验

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/rbac/users/:userId/permissions` | 获取用户权限列表 |
| GET | `/api/rbac/users/:userId/permissions/:resourceCode` | 检查用户对指定资源的权限 |
| POST | `/api/rbac/permissions/check` | 批量权限检查 |

### 2.4 权限校验机制（Guard 设计）

#### 2.4.1 权限装饰器

```typescript
// decorators/permissions.decorator.ts

/**
 * 权限检查装饰器
 * @usage: @RequirePermission('order', 'read')
 */
export function RequirePermission(resource: string, action: string) {
  return SetMetadata('rbac:permission', { resource, action });
}

/**
 * 数据范围装饰器
 * @usage: @RequireDataScope('order')
 */
export function RequireDataScope(resource: string) {
  return SetMetadata('rbac:dataScope', resource);
}
```

#### 2.4.2 RBAC Guard

```typescript
// guards/rbac.guard.ts

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private iamService: IamService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 获取当前用户（从请求头或 session）
    const user = this.getUserFromRequest(context);
    if (!user) return false;

    // 2. 获取装饰器定义的权限要求
    const permission = this.reflector.get<{ resource: string; action: string }>(
      'rbac:permission',
      context.getHandler(),
    );

    if (!permission) return true; // 无需权限检查

    // 3. 检查用户权限
    const hasPermission = await this.iamService.checkPermission(
      user.id,
      permission.resource,
      permission.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(`无权限访问：${permission.resource}:${permission.action}`);
    }

    return true;
  }
}
```

#### 2.4.3 数据范围拦截器

```typescript
// interceptors/data-scope.interceptor.ts

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const user = this.getUserFromRequest(context);
    const resource = this.reflector.get<string>('rbac:dataScope', context.getHandler());

    if (!resource || !user) return next.handle();

    // 获取用户对该资源的数据范围
    const scope = this.iamService.getDataScope(user.id, resource);

    // 在查询结果中注入数据范围过滤
    return next.handle().pipe(
      map(data => this.applyDataScope(data, scope, user)),
    );
  }
}
```

### 2.5 权限计算逻辑

```typescript
// modules/iam/iam.service.ts - 核心方法

/**
 * 检查用户是否有指定权限
 * 时间复杂度：O(R * P) R=用户角色数，P=角色权限数
 */
async checkPermission(userId: string, resourceCode: string, action: string): Promise<boolean> {
  const permissions = await this.getUserPermissions(userId);
  const targetCode = `${resourceCode}:${action}`;
  return permissions.includes(targetCode);
}

/**
 * 获取用户所有权限编码列表
 * 使用 Redis 缓存：key = `rbac:perm:${userId}:${tenantId}`, TTL = 300s
 */
async getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `rbac:perm:${userId}:${this.tenantId}`;
  const cached = await this.cacheService.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 1. 查询用户所有角色
  const userRoles = await this.prisma.sysUserRole.findMany({
    where: { userId, tenantId: this.tenantId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  // 2. 聚合所有权限编码（去重）
  const permissionCodes = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      permissionCodes.add(rp.permission.code);
    }
  }

  const result = Array.from(permissionCodes);
  
  // 3. 写入缓存
  await this.cacheService.set(cacheKey, JSON.stringify(result), 300);
  
  return result;
}
```

---

## 三、前端交互设计

### 3.1 管理页面结构

```
权限管理后台
├── 资源管理 (resource-list.vue)
│   ├── 资源列表
│   ├── 创建/编辑资源
│   └── 资源权限点配置
├── 角色管理 (role-list.vue) - 重构
│   ├── 角色列表
│   ├── 创建/编辑角色
│   ├── 权限分配（树形选择器）
│   └── 角色用户管理
├── 用户角色 (user-role-management.vue) - 保留
│   ├── 用户查询
│   ├── 用户角色分配
│   └── 批量操作
└── 权限审计 (audit-log.vue) - 保留
```

### 3.2 角色权限分配交互

```vue
<!-- 权限分配树形选择器 -->
<template>
  <div class="permission-tree">
    <el-tree
      :data="resourceTree"
      show-checkbox
      node-key="code"
      :default-checked-keys="assignedPermissions"
      :props="{ children: 'permissions', label: 'name' }"
    >
      <template #default="{ node, data }">
        <span class="tree-node">
          <el-icon v-if="data.type === 'resource'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span>{{ node.label }}</span>
          <el-tag v-if="data.type === 'permission'" size="small">{{ data.action }}</el-tag>
        </span>
      </template>
    </el-tree>
  </div>
</template>
```

### 3.3 页面操作流程

#### 角色创建流程
```
1. 点击"新建角色" → 弹出对话框
2. 填写角色名称、编码、描述
3. 进入"权限分配"页面
4. 在资源权限树中勾选需要的权限点
5. 可选：配置数据范围（如：仅本部门）
6. 保存 → 角色创建完成
```

#### 用户分配角色流程
```
1. 进入"用户角色"页面
2. 输入用户 ID 搜索
3. 查看用户当前角色
4. 从角色列表勾选新角色
5. 点击"批量分配"
6. 完成分配
```

---

## 四、迁移方案

### 4.1 迁移策略

采用**渐进式迁移**策略，分阶段完成：

| 阶段 | 目标 | 回滚方案 |
|------|------|----------|
| Phase 1 | 新增 RBAC 数据模型，与现有模型并存 | 无影响，直接使用旧模型 |
| Phase 2 | 实现 RBAC 权限计算，新旧并行 | 配置开关切换回旧模型 |
| Phase 3 | 前端迁移至 RBAC 管理界面 | 保留画布入口作为降级 |
| Phase 4 | 数据迁移（角色→权限映射） | 保留旧数据 30 天 |
| Phase 5 | 废弃画布拓扑功能 | 仅保留审计追溯 |

### 4.2 数据迁移脚本

```prisma
// migration/001_rbac_init.sql

-- 1. 保留 SysRole 表结构（添加 isSystem 字段）
ALTER TABLE sys_role ADD COLUMN is_system BOOLEAN DEFAULT false;

-- 2. 创建 SysResource 表
CREATE TABLE sys_resource (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_code (tenant_id, code)
);

-- 3. 创建 SysPermission 表
CREATE TABLE sys_permission (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_code (tenant_id, code),
  FOREIGN KEY (resource_id) REFERENCES sys_resource(id)
);

-- 4. 创建 SysRolePermission 表
CREATE TABLE sys_role_permission (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL,
  role_id VARCHAR(100) NOT NULL,
  permission_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_role_perm (tenant_id, role_id, permission_id)
);
```

### 4.3 兼容性处理

```typescript
// 兼容层：将旧角色映射到标准权限
async migrateLegacyRole(roleCode: string): Promise<Permission[]> {
  // 从 VisNode 中查找角色节点
  const roleNode = await this.prisma.visNode.findFirst({
    where: { code: roleCode, type: 'ROLE' }
  });
  
  if (!roleNode) return [];
  
  // DFS 遍历获取资源（复用现有逻辑）
  const legacyPerms = await this.visService.calculatePermissionsForRole(roleCode);
  
  // 映射为标准权限格式
  return legacyPerms.resources.map(r => ({
    resource: r,
    action: 'manage', // 默认授予管理权限
    code: `${r}:manage`
  }));
}
```

---

## 五、实施计划

### Phase 1：数据模型与基础 API（优先级：P0）

**预计工期：** 3-5 天

| 任务 | 描述 | 验收标准 |
|------|------|----------|
| 1.1 | 新增 Prisma Schema 模型 | migration 脚本可执行 |
| 1.2 | 实现资源管理 API | CRUD 接口可用，Swagger 文档完整 |
| 1.3 | 实现权限点管理 API | 支持按资源过滤，批量创建 |
| 1.4 | 实现角色 - 权限关联 API | 支持批量分配/移除 |

### Phase 2：权限校验核心（优先级：P0）

**预计工期：** 2-3 天

| 任务 | 描述 | 验收标准 |
|------|------|----------|
| 2.1 | 实现 RBAC Guard | 装饰器可拦截无权限请求 |
| 2.2 | 实现数据范围拦截器 | 查询结果自动过滤 |
| 2.3 | Redis 缓存集成 | 权限缓存命中，TTL 可配置 |
| 2.4 | 编写单元测试 | 覆盖率 > 80% |

### Phase 3：前端管理界面（优先级：P1）

**预计工期：** 3-4 天

| 任务 | 描述 | 验收标准 |
|------|------|----------|
| 3.1 | 重构角色管理页面 | 权限分配树形选择器可用 |
| 3.2 | 新增资源管理页面 | 支持权限点批量管理 |
| 3.3 | 用户角色页面优化 | 批量分配性能优化 |
| 3.4 | 权限审计页面 | 与现有审计日志集成 |

### Phase 4：数据迁移与验证（优先级：P1）

**预计工期：** 2-3 天

| 任务 | 描述 | 验收标准 |
|------|------|----------|
| 4.1 | 编写迁移脚本 | 现有角色→权限映射完成 |
| 4.2 | 双模式并行验证 | 新旧权限计算结果一致 |
| 4.3 | 灰度发布 | 10% 流量切换至 RBAC |
| 4.4 | 全量切换 | 100% 流量使用 RBAC |

### Phase 5：清理与文档（优先级：P2）

**预计工期：** 1-2 天

| 任务 | 描述 | 验收标准 |
|------|------|----------|
| 5.1 | 移除画布相关代码 | vis.service.ts 删除 |
| 5.2 | 清理废弃数据表 | VisNode/VisEdge/VisTopology 软删除 |
| 5.3 | 更新 API 文档 | Swagger 文档完整 |
| 5.4 | 编写用户迁移指南 | 管理员可独立完成迁移 |

---

## 六、与画布功能的关系

### 6.1 决策：废弃画布拓扑功能

**原因：**
1. 用户明确表示"不是一个好方案"
2. 复杂度与收益不成正比
3. 标准 RBAC 已满足绝大多数场景

### 6.2 降级处理

| 画布功能 | 处理方式 |
|----------|----------|
| 画布前端页面 | 保留但标记为"已废弃"，引导用户使用新界面 |
| VisNode/VisEdge 表 | 软删除（保留 30 天），用于审计追溯 |
| VisTopology 表 | 保留历史记录，支持快照回滚查询 |
| vis.service.ts | 完整删除 |

### 6.3 未来扩展可能

如后续确实需要复杂权限编排，可考虑：
- **角色继承**：父角色→子角色的权限继承
- **权限组**：将多个权限打包为权限组
- **条件权限**：基于时间/IP/环境的条件授权

---

## 七、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据迁移丢失 | 高 | 迁移前全量备份，迁移后双重验证 |
| 权限计算不一致 | 高 | 双模式并行运行 7 天，比对结果 |
| 用户学习成本 | 中 | 提供操作手册和视频教程 |
| API 兼容性问题 | 中 | 保留旧 API 路径 30 天，添加迁移提示 |

---

## 八、成功标准

1. **功能完整性**：所有 RBAC 核心功能可用
2. **性能达标**：权限检查 < 50ms（含缓存）
3. **用户验收**：管理员可在 5 分钟内完成角色配置
4. **零数据丢失**：迁移后权限数据 100% 完整
5. **代码质量**：单元测试覆盖率 > 80%

---

## 附录：开放问题

- [ ] 是否需要支持角色继承（父角色权限自动传递给子角色）？
- [ ] 数据范围是否需要支持自定义 SQL 表达式？
- [ ] 是否需要有权限变更的实时通知机制？
- [ ] 多租户场景下，是否需要支持跨租户角色模板？

---

**文档结束**
