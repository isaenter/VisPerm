# VisPerm 项目开发规范

## 基本规则

- 所有回复使用中文
- 代码注释使用中文
- Git 提交信息使用中文

## 技术约定

### 后端 (NestJS)

- 使用 TypeScript strict 模式
- 模块化组织：`modules/{module-name}/`
- 服务层添加中文注释说明业务逻辑
- 装饰器定义放在 `decorators/` 目录

### 前端 (Vue3)

- 使用 TypeScript + Composition API
- 组件采用 `<script setup>` 语法
- UI 库使用 Element Plus
- 画布引擎使用 LogicFlow

### 数据库

- 使用 Prisma ORM
- 表名使用 `vis_` 前缀区分核心表，`sys_` 前缀区分系统表
- 所有表必须有 `created_at` 和 `updated_at` 字段

## 开发流程

1. 大任务必须先拆分、定边界、确认方案后再编码
2. 核心功能必须有中文注释和验证
3. 修改前必须先阅读现状，禁止猜测修改
4. 重要修改要有 git 记录
