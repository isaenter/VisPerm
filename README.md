# VisPerm - 可视化权限拓扑编排系统

🔐 **权限界的 Visio** - 让非技术人员也能通过拖拽节点、连接连线，轻松配置出复杂的企业级权限策略

## 产品愿景

打造一款 "所见即所得" 的权限管理系统，实现从"填表式配置"到"绘图式编排"的代际跨越。

### 核心特性

- 🎨 **可视化编排** - 基于 LogicFlow 的画布拖拽与连线
- 🔗 **拓扑关系表达** - 支持继承/收窄/叠加/排除的复杂权限逻辑
- ⚡ **实时计算引擎** - 图遍历算法动态计算权限范围
- 🧪 **模拟运行沙箱** - 干跑模式验证权限配置
- 🤖 **自动化资源扫描** - 代码变更自动同步资源元数据

## 技术栈

| 模块 | 技术选型 |
|------|----------|
| 前端 | Vue 3 + TypeScript + Element Plus + LogicFlow |
| 后端 | NestJS + TypeScript + Prisma |
| 数据库 | PostgreSQL (主) + Neo4j (可选图存储) |
| 缓存 | Redis |

## 项目结构

```
visperm/
├── backend/          # NestJS 后端服务
│   ├── src/
│   │   ├── modules/  # 核心模块
│   │   ├── common/   # 公共工具
│   │   └── decorators/ # 装饰器定义
│   └── prisma/       # 数据库模型
├── frontend/         # Vue3 前端控制台
│   ├── src/
│   │   ├── components/ # 通用组件
│   │   ├── views/     # 页面视图
│   │   └── canvas/    # 画布引擎
│   └── public/
├── docs/             # 项目文档
└── packages/         # 共享包
    ├── nestjs-starter/
    └── vue-components/
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- Redis >= 6

### 安装依赖

```bash
# 安装 pnpm (如未安装)
npm install -g pnpm

# 安装根依赖
pnpm install

# 安装后端依赖
cd backend && pnpm install

# 安装前端依赖
cd ../frontend && pnpm install
```

### 启动开发环境

```bash
# 启动后端 (端口：3000)
cd backend
pnpm dev

# 启动前端 (端口：5173)
cd frontend
pnpm dev
```

## 核心概念

### 节点类型

| 图标 | 类型 | 说明 |
|------|------|------|
| 📦 | RESOURCE | 资源节点，代表数据实体 |
| 🌪️ | FILTER | 过滤器节点，数据范围规则 |
| 👤 | ROLE | 角色节点，用户角色定义 |
| ➕ | ADDON | 增量包节点，额外权限集合 |

### 连线类型

| 样式 | 类型 | 逻辑 |
|------|------|------|
| ───── (绿实线) | INHERITANCE | UNION 并集 |
| - - - (橙虚线) | NARROWING | INTERSECTION 交集 |
| ─·─·─ (紫点划) | EXTENSION | APPEND 追加 |
| ✕ (红叉) | DENY | EXCLUSION 排除 |

## 开发路线图

- [x] 项目初始化
- [ ] Phase 1: 基础画布与核心模型 (MVP) - 4 周
- [ ] Phase 2: 规则引擎与逻辑计算 - 4 周
- [ ] Phase 3: 高级特性与生态集成 - 4 周
- [ ] Phase 4: 商业化/产品化包装 - 2 周

## 许可证

MIT License

---

🚀 Let's build the future of IAM.
