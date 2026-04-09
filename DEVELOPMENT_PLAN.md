# VisPerm 开发计划 (MVP v1.0)

## 团队角色
- **架构师/项目经理** (Hermes): 总体规划、代码评审、集成测试、里程碑通知
- **后端开发工程师** (SubAgent): API 实现、Prisma 集成、DTO 验证、单元测试
- **前端开发工程师** (SubAgent): 页面开发、LogicFlow 画布集成、API 对接
- **算法工程师** (SubAgent): 权限计算引擎、图遍历算法、性能优化
- **QA 工程师** (SubAgent): 自动化测试、Bug 修复、代码质量检查

## 开发节点

### 节点 1: 环境与基础设施 [✅ 已完成]
- [x] 修复端口冲突 (5432 -> 5433, 3000 -> 3001)
- [x] 配置 Docker Compose (PostgreSQL, Redis)
- [x] 初始化数据库 (Prisma Migrate)
- [x] 验证全栈开发环境 (`pnpm dev`)
- [x] Git 提交: `chore: 修复开发环境配置，解决端口冲突，完成数据库初始化`

### 节点 2: 后端核心 API [进行中]
- [ ] 完善 `VisModule`: 拓扑管理 CRUD、节点/边批量操作
- [ ] 完善 `IamModule`: 角色管理、用户角色分配、资源元数据同步
- [ ] 添加 Swagger 装饰器与 DTO 验证
- [ ] 单元测试覆盖核心 Service
- [ ] Git 提交规范: `feat(backend): 完成核心 API 开发与单元测试`

### 节点 3: 前端核心功能 [待启动]
- [ ] 集成 LogicFlow 画布引擎
- [ ] 实现节点/边的可视化操作 (拖拽、连线、属性面板)
- [ ] 角色列表页、资源列表页 UI 开发
- [ ] API 对接与状态管理 (Pinia)
- [ ] Git 提交规范: `feat(frontend): 完成画布引擎集成与核心页面开发`

### 节点 4: 权限计算引擎 [待启动]
- [ ] 实现图遍历算法计算权限
- [ ] 支持 INHERITANCE/NARROWING/EXTENSION/DENY 逻辑
- [ ] 模拟运行沙箱 API
- [ ] Git 提交规范: `feat(engine): 实现基于图遍历的权限计算核心`

### 节点 5: 集成与测试 [待启动]
- [ ] 前后端全链路联调
- [ ] E2E 测试与性能优化
- [ ] Git 提交规范: `test: 完成全链路集成测试与性能优化`
