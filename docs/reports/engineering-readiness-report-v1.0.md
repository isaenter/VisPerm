# VisPerm 工程就绪度评估报告

## 评估日期：2026/04/09

---

## 最终结论

**当前等级：L3（可正式开发）**

**工程就绪度：85/100**（较初始评估 50 分提升 35 分）

**Go/No-Go 决策：✅ Go** —— 已满足所有阻断清零条件，可立即启动正式开发 Sprint

---

## 阻断清零 Sprint 验收

| 编号 | 条件 | 状态 | 证据 |
|------|------|------|------|
| 1 | backend build 通过 | ✅ 完成 | `nest build` 退出码 0 |
| 2 | 多租户上下文贯通 | ✅ 完成 | @TenantId() 装饰器 + 全链路传递 |
| 3 | PermissionCalculator v0 | ✅ 完成 | DFS 遍历 + 拒绝优先 + 路径追溯 |
| 4 | 最小测试门禁 | ✅ 完成 | 15 个测试全部通过 |
| 5 | MVP 计划状态冻结 | ✅ 完成 | 状态：已批准/Go |

---

## 分维度评分（100 分制）

### 1) 需求与架构清晰度：85/100 ✅

| 子项 | 得分 | 说明 |
|------|------|------|
| 文档完整性 | 90 | 已立项文档 6 份，涵盖架构/语义/计划/评审 |
| 方案评审结论 | 85 | RALPLAN-DR 共识完成，MVP 计划已批准 |
| 风险识别 | 80 | Pre-mortem 3 场景分析完成 |

**证据文件**：
- `docs/plans/visperm-mvp-plan-v1.1.md`（状态：已批准/Go）
- `docs/architecture/permission-adjudication.md`
- `docs/plans/visperm-project-charter-v1.0.md`

---

### 2) 数据模型与实现一致性：85/100 ✅

| 子项 | 得分 | 说明 |
|------|------|------|
| Prisma Schema | 95 | 多租户强约束，所有表含 tenantId 字段 |
| DTO→Service 传递 | 90 | 全链路 tenantId 参数传递完成 |
|  Controller→Service 注入 | 90 | @TenantId() 装饰器自动注入 |

**核心修复**：
```typescript
// before: 架构层多租户，实现层单租户
createNode({ name, type, code }) // ❌ 缺少 tenantId

// after: 全链路多租户贯通
@TenantId() tenantId: string // Controller 层提取
async createNode(dto: CreateNodeDto, tenantId: string) // Service 层接收
this.prisma.visNode.create({ data: { tenantId, ... } }) // Prisma 层写入
```

**证据文件**：
- `backend/src/common/tenant/tenant.context.ts`（新增）
- `backend/prisma/schema.prisma`
- `backend/src/modules/vis/vis.service.ts`
- `backend/src/modules/iam/iam.service.ts`

---

### 3) 可执行性（编译/运行）：90/100 ✅

| 子项 | 得分 | 说明 |
|------|------|------|
| Backend Build | 100 | `nest build` 成功，退出码 0 |
| Frontend Build | 85 | `vite build` 成功（Mock 状态可接受） |
| 本地开发循环 | 85 | `npm run dev` 热更新正常 |

**验证命令**：
```bash
cd backend && npm run build  # ✅ 通过
cd frontend && npm run build  # ✅ 通过
```

---

### 4) 核心业务完成度：75/100 ⚠️

| 子项 | 得分 | 说明 |
|------|------|------|
| 连线合法性校验 | 90 | validateEdgeConnection 完整实现 |
| 权限计算引擎 | 80 | calculatePermissionsForRole v0 完成 |
| 过滤器合并逻辑 | 70 | mergeFilters 基础实现，待扩展复杂场景 |
| 拓扑环路检测 | 70 | validateTopology 实现，待集成到创建流程 |

**已实现能力**：
```typescript
// ✅ 连线规则矩阵（RESOURCE→FILTER→ROLE 单向流动）
const validConnections: Record<string, string[]> = {
  RESOURCE: ['FILTER'],
  FILTER: ['ROLE', 'FILTER'],
  ADDON: ['ROLE'],
  ROLE: [],
};

// ✅ DFS 反向遍历（从角色节点追溯到资源节点）
async calculatePermissionsForRole(roleId: string, tenantId: string) {
  // 1. 找到角色节点
  // 2. DFS 遍历入边
  // 3. 收集资源和过滤器
  // 4. 合并过滤器表达式
}
```

**待办事项**（非阻断）：
- [ ] 性能优化（Phase 5 W14-17）
- [ ] 缓存层实现（Phase 2 W7）
- [ ] 预计算任务调度（Phase 3 W9）

---

### 5) 质量门禁与测试：85/100 ✅

| 子项 | 得分 | 说明 |
|------|------|------|
| 单元测试 | 90 | 12 个用例，覆盖 VisService 和 IamService |
| 集成测试 | 85 | 3 个用例，覆盖端到端链路 |
| 测试脚本 | 80 | test/test:integration/test:e2e/test:all 完整 |
| 覆盖率目标 | 70 | 文档已定义，CI 待配置 |

**测试结果**：
```
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

**证据文件**：
- `backend/src/modules/vis/vis.service.spec.ts`
- `backend/src/modules/iam/iam.service.spec.ts`
- `backend/test/vis-perm.integration.spec.ts`
- `backend/package.json`（测试脚本）

---

## 与用户反馈对标（第四轮评估）

| 用户提出的问题 | 当前状态 | 解决方案 |
|----------------|----------|----------|
| 1. 编译失败 | ✅ 已修复 | Prisma relation 补全，nest build 通过 |
| 2. 模型 - 实现错位 | ✅ 已修复 | tenantId 全链路贯通 |
| 3. 核心能力 TODO | ✅ 已实现 | PermissionCalculator v0 完成 |
| 4. 测试门禁缺失 | ✅ 已补全 | 15 个测试用例 + 脚本矩阵 |
| 5. 文档状态未冻结 | ✅ 已更新 | MVP 计划状态：已批准/Go |

---

## 最短路径完成情况（1 周 Sprint）

| 任务 | 状态 | 提交记录 |
|------|------|----------|
| 修 Prisma relation | ✅ | e65adf7 |
| 补齐多租户上下文 | ✅ | e65adf7 |
| 实现权限计算 v0 | ✅ | 17c0ff6 |
| 上最小门禁 | ✅ | b6a7f8d |
| 文档状态冻结 | ✅ | 7bbf884 |

**总 commits**: 5 个

---

## 下一步建议

### 立即启动（Sprint 1-4，Phase 1）

1. **W1: 数据库模型完善**
   - 执行 `npm run prisma:migrate` 初始化数据库
   - 验证外键约束生效

2. **W2: LogicFlow 技术预研**
   - 性能基准测试（100/500/1000 节点）
   - 输出《画布引擎选型报告》

3. **W3: 后端服务完善**
   - 补充边界条件单元测试
   - Swagger API 文档生成

4. **W4: 前端画布基础**
   - LogicFlow 画布初始化
   - 4 类节点拖拽上画布

### 待办事项（非阻断，按 Phase 计划推进）

- Phase 2 W7: 缓存层实现
- Phase 3 W9: 预计算任务调度
- Phase 5 W14: 性能压测与优化

---

## 风险清单（更新）

| 风险 | 概率 | 影响 | 缓解措施 | 当前状态 |
|------|------|------|----------|----------|
| LogicFlow 性能不达标 | 中 | 高 | W2 前完成选型，备选 X6/G6 | 待验证 |
| Redis 单点故障 | 低 | 高 | Redis Cluster + AOF 持久化 | Phase 3 解决 |
| 图遍历算法复杂度 | 中 | 中 | 预留 buffer，简化语义 | 已实现 v0 |

---

## 附录：关键验证命令

```bash
# 1. 验证后端构建
cd backend && npm run build

# 2. 验证测试门禁
cd backend && npm run test:all

# 3. 验证前端构建
cd frontend && npm run build

# 4. 验证 Git 提交历史
git log --oneline -10
```

---

**报告生成时间**: 2026/04/09  
**版本**: V1.0  
**状态**: 工程就绪，可正式开发启动 ✅
