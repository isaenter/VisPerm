# VisPerm 权限裁决语义精确定义 V1.0

## 文档信息

| 字段 | 值 |
|------|-----|
| 版本 | V1.0 |
| 创建日期 | 2026/04/09 |
| 状态 | 已批准 |
| 关联评审 | P0-1 权限语义歧义修复 |

---

## 一、术语定义

### 1.1 核心概念

| 术语 | 定义 | 示例 |
|------|------|------|
| **资源 (Resource)** | 被授权的数据实体 | 订单、客户、产品 |
| **角色 (Role)** | 用户的权限集合 | 销售经理、区域主管 |
| **过滤器 (Filter)** | 数据范围规则表达式 | `region = '华东' AND status = 'active'` |
| **策略 (Policy)** | 资源 + 过滤器的完整授权单元 | 查看华东区 active 订单 |
| **效果 (Effect)** | 授权裁决结果 | Allow / Deny |

### 1.2 节点类型

| 节点类型 | 英文 | 说明 |
|----------|------|------|
| 资源节点 | RESOURCE | 代表一个数据实体 |
| 角色节点 | ROLE | 代表一个用户角色 |
| 过滤器节点 | FILTER | 代表一个数据范围规则 |
| 增量包节点 | ADDON | 代表额外附加的权限 |

### 1.3 连线类型与语义

| 连线类型 | 英文 | 集合运算 | 数据层合并 |
|----------|------|----------|------------|
| 继承 | INHERITANCE | UNION (并集) | OR (或) |
| 收窄 | NARROWING | INTERSECTION (交集) | AND (与) |
| 扩展 | EXTENSION | APPEND (追加) | OR (或) + 优先级提升 |
| 排除 | DENY | EXCLUSION (排除) | AND NOT (非) |

---

## 二、分层裁决模型

### 2.1 两层裁决架构

```
┌─────────────────────────────────────────────────────────┐
│                    裁决流程                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: 资源层 (Resource Level)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  输入：用户 U + 角色 R + 资源类型 RT               │  │
│  │  处理：计算 Allow 集合 和 Deny 集合                │  │
│  │  输出：Effect = Allow / Deny                       │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                               │
│  Layer 2: 数据层 (Data Level)                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │  输入：Effect=Allow + 过滤器集合 F                 │  │
│  │  处理：合并过滤器表达式                            │  │
│  │  输出：FilterExpression                            │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 资源层裁决规则

**步骤 1：收集路径**
- 从角色节点出发，遍历所有可达的资源节点
- 记录每条路径的边类型序列

**步骤 2：分类资源**
```
AllowSet = { r | 存在路径 P，r ∈ Resources(P)，且路径不含 DENY 边 }
DenySet  = { r | 存在路径 P，r ∈ Resources(P)，且路径含 DENY 边 }
```

**步骤 3：最终裁决**
```
if (resource ∈ DenySet) return Deny;  // 拒绝优先
if (resource ∈ AllowSet) return Allow;
return Deny;  // 默认拒绝
```

### 2.3 数据层合并规则

**过滤器合并优先级：**

| 路径边类型 | 合并操作 | 说明 |
|------------|----------|------|
| INHERITANCE | OR | 继承条件，满足任一即可 |
| NARROWING | AND | 收窄条件，必须同时满足 |
| EXTENSION | OR (优先级提升) | 扩展条件，满足即可，优先级高于继承 |
| DENY | - | 不产生过滤器，仅用于资源层拒绝 |

**合并算法：**
```javascript
function mergeFilters(filters) {
  // 分组：按优先级分组
  const extensionFilters = filters.filter(f => f.priority === 'extension');
  const inheritanceFilters = filters.filter(f => f.priority === 'inheritance');
  const narrowingFilters = filters.filter(f => f.priority === 'narrowing');
  
  // 合并策略
  const extensionExpr = extensionFilters.map(f => f.expr).join(' OR ');
  const inheritanceExpr = inheritanceFilters.map(f => f.expr).join(' OR ');
  const narrowingExpr = narrowingFilters.map(f => f.expr).join(' AND ');
  
  // 组合：扩展优先，继承次之，收窄最后
  const parts = [];
  if (extensionExpr) parts.push(`(${extensionExpr})`);
  if (inheritanceExpr) parts.push(`(${inheritanceExpr})`);
  if (narrowingExpr) parts.push(`(${narrowingExpr})`);
  
  return parts.join(' OR ');  // 各优先级组之间为 OR 关系
}
```

---

## 三、规则冲突决策表

### 3.1 同资源多路径冲突

| 路径 1 类型 | 路径 2 类型 | 资源层结果 | 数据层合并 |
|-------------|-------------|------------|------------|
| INHERITANCE | INHERITANCE | Allow | F1 OR F2 |
| INHERITANCE | NARROWING | Allow | F1 OR F2 (但 F2 更严格) |
| INHERITANCE | DENY | **Deny** | - |
| NARROWING | NARROWING | Allow | F1 AND F2 |
| NARROWING | DENY | **Deny** | - |
| EXTENSION | INHERITANCE | Allow | F1(扩展) OR F2(继承) |
| EXTENSION | DENY | **Deny** | - |
| DENY | DENY | **Deny** | - |

### 3.2 冲突解决原则

1. **拒绝优先原则**：任何路径包含 DENY 边，最终结果为 Deny
2. **扩展优先原则**：EXTENSION 过滤器优先级高于 INHERITANCE
3. **最严原则**：NARROWING 路径越多的条件越严格
4. **默认拒绝原则**：无任何 Allow 路径时，结果为 Deny

---

## 四、裁决算法伪代码

### 4.1 主算法

```typescript
interface PermissionResult {
  effect: 'Allow' | 'Deny';
  filterExpression?: string;
  paths: PathInfo[];  // 用于审计追溯
}

interface PathInfo {
  path: string[];  // 节点 ID 序列
  edgeTypes: string[];  // 边类型序列
  resources: string[];  // 资源集合
  filters: FilterInfo[];  // 过滤器集合
}

/**
 * 权限裁决主函数
 */
async function adjudicatePermissions(
  userId: string,
  resourceType: string
): Promise<PermissionResult> {
  // 步骤 1：获取用户所有角色
  const roles = await getUserRoles(userId);
  
  // 步骤 2：遍历所有路径
  const allowPaths: PathInfo[] = [];
  const denyPaths: PathInfo[] = [];
  const allFilters: FilterInfo[] = [];
  
  for (const role of roles) {
    const paths = await findPaths(role.id, resourceType);
    
    for (const path of paths) {
      const hasDeny = path.edgeTypes.includes('DENY');
      const pathResources = await collectResources(path);
      const pathFilters = await collectFilters(path);
      
      if (hasDeny) {
        denyPaths.push({ ...path, resources: pathResources, filters: pathFilters });
      } else {
        allowPaths.push({ ...path, resources: pathResources, filters: pathFilters });
        allFilters.push(...pathFilters);
      }
    }
  }
  
  // 步骤 3：资源层裁决
  const allowedResources = new Set(allowPaths.flatMap(p => p.resources));
  const deniedResources = new Set(denyPaths.flatMap(p => p.resources));
  
  // 拒绝优先
  if (deniedResources.has(resourceType)) {
    return {
      effect: 'Deny',
      paths: [...allowPaths, ...denyPaths]
    };
  }
  
  // 步骤 4：数据层裁决
  if (allowedResources.size === 0) {
    return {
      effect: 'Deny',
      paths: [...allowPaths, ...denyPaths]
    };
  }
  
  // 合并过滤器
  const filterExpression = mergeFilters(allFilters);
  
  return {
    effect: 'Allow',
    filterExpression,
    paths: [...allowPaths, ...denyPaths]
  };
}
```

### 4.2 过滤器合并算法

```typescript
interface FilterInfo {
  expr: string;  // 过滤器表达式
  priority: 'extension' | 'inheritance' | 'narrowing';
}

function mergeFilters(filters: FilterInfo[]): string {
  // 按优先级分组
  const byPriority = {
    extension: filters.filter(f => f.priority === 'extension'),
    inheritance: filters.filter(f => f.priority === 'inheritance'),
    narrowing: filters.filter(f => f.priority === 'narrowing')
  };
  
  // 各组合并
  const exprs: string[] = [];
  
  // 扩展组：OR 合并，加括号
  if (byPriority.extension.length > 0) {
    exprs.push(`(${byPriority.extension.map(f => f.expr).join(' OR ')})`);
  }
  
  // 继承组：OR 合并
  if (byPriority.inheritance.length > 0) {
    exprs.push(`(${byPriority.inheritance.map(f => f.expr).join(' OR ')})`);
  }
  
  // 收窄组：AND 合并
  if (byPriority.narrowing.length > 0) {
    exprs.push(`(${byPriority.narrowing.map(f => f.expr).join(' AND ')})`);
  }
  
  // 各组之间 OR 关系
  return exprs.join(' OR ');
}
```

---

## 五、示例场景

### 5.1 场景 1：简单继承

```
[销售经理] --(INHERITANCE)--> [订单资源] --(FILTER)--> [region='华东']

裁决结果：
- Effect: Allow
- Filter: region='华东'
```

### 5.2 场景 2：多路径继承

```
[销售经理] --(INHERITANCE)--> [订单资源] --(FILTER)--> [region='华东']
[销售经理] --(INHERITANCE)--> [订单资源] --(FILTER)--> [status='active']

裁决结果：
- Effect: Allow
- Filter: (region='华东' OR status='active')
```

### 5.3 场景 3：拒绝优先

```
[普通员工] --(INHERITANCE)--> [订单资源] --(FILTER)--> [region='华南']
[普通员工] --(DENY)---------> [订单资源]

裁决结果：
- Effect: Deny (拒绝优先)
```

### 5.4 场景 4：收窄 + 继承

```
[区域主管] --(INHERITANCE)--> [订单资源] --(FILTER)--> [region='华东']
[区域主管] --(NARROWING)----> [订单资源] --(FILTER)--> [amount > 10000]

裁决结果：
- Effect: Allow
- Filter: (region='华东') OR (amount > 10000 AND ...)
```

### 5.5 场景 5：扩展优先

```
[高管] --(INHERITANCE)--> [订单资源] --(FILTER)--> [status='active']
[高管] --(EXTENSION)---> [订单资源] --(FILTER)--> [deleted=true]

裁决结果：
- Effect: Allow
- Filter: (deleted=true) OR (status='active')
  ↑ 扩展条件优先级更高，但合并时仍为 OR
```

---

## 六、错误码定义

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `PERM_CYCLE_DETECTED` | 检测到环路 | 阻止保存，高亮环路路径 |
| `PERM_AMBIGUOUS_PATH` | 路径歧义（同资源多路径冲突无法解析） | 记录审计，人工介入 |
| `PERM_FILTER_PARSE_ERROR` | 过滤器表达式解析失败 | 拒绝执行，返回详细错误 |
| `PERM_TIMEOUT` | 权限计算超时 | 降级返回缓存，记录告警 |

---

## 七、可观测性

### 7.1 审计日志字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `user_id` | 用户 ID | user-001 |
| `role_ids` | 角色 ID 列表 | [role-001, role-002] |
| `resource_type` | 资源类型 | Order |
| `effect` | 裁决结果 | Allow |
| `filter_expression` | 过滤器表达式 | region='华东' AND status='active' |
| `path_count` | 路径数量 | 3 |
| `deny_path_count` | 拒绝路径数量 | 0 |
| `computation_ms` | 计算耗时 | 45 |

### 7.2 路径追溯格式

```json
{
  "paths": [
    {
      "nodeIds": ["role-001", "filter-001", "resource-001"],
      "edgeTypes": ["INHERITANCE", "NARROWING"],
      "filters": [
        {"expr": "region='华东'", "priority": "inheritance"},
        {"expr": "status='active'", "priority": "narrowing"}
      ]
    }
  ]
}
```

---

## 八、验收标准

| 验收项 | 通过标准 | 验证方法 |
|--------|----------|----------|
| 拒绝优先 | DENY 路径存在时 100% 拒绝 | 单元测试 |
| 扩展优先 | EXTENSION 过滤器优先级正确 | 单元测试 |
| 多路径合并 | OR/AND 逻辑正确 | 集成测试 |
| 环路检测 | 100% 检测并阻止 | 边界测试 |
| 路径追溯 | 完整记录所有路径 | 审计日志验证 |

---

**文档版本**: V1.0  
**创建日期**: 2026/04/09  
**状态**: 已批准（P0-1 修复完成）
