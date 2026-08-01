# 心桥 Mind Bridge —— 小学生心理咨询预约平台

## 项目结构

```
mind/
├── client/                    # React 18 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/common/ # 通用组件（ProtectedRoute等）
│   │   ├── pages/
│   │   │   ├── auth/          # 登录/注册
│   │   │   ├── student/       # 学生端（极简大按钮设计）
│   │   │   ├── parent/        # 家长端
│   │   │   ├── teacher/       # 心理老师端
│   │   │   ├── advisor/       # 班主任端
│   │   │   └── admin/         # 管理员端
│   │   ├── stores/            # Zustand 状态管理
│   │   ├── types/             # TypeScript 类型定义
│   │   └── utils/             # API 工具
│   └── ...
├── server/                    # Express + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma      # 数据模型定义
│   │   └── seed.ts            # 种子数据
│   ├── src/
│   │   ├── routes/            # API 路由（7个模块）
│   │   ├── middleware/        # 认证、错误处理
│   │   └── services/          # 业务逻辑（通知等）
│   └── ...
└── docker-compose.yml         # Docker 部署配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. 启动 PostgreSQL

```bash
docker compose up -d postgres
```

或使用本地 PostgreSQL，修改 `server/.env` 中的 `DATABASE_URL`。

### 3. 数据库迁移 + 种子数据

```bash
npm run db:migrate   # 创建表结构
npm run db:seed      # 填充演示数据
```

### 4. 启动开发服务器

```bash
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001

## 演示账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |
| 心理老师 | teacher | teacher123 |
| 班主任 | advisor1 | advisor123 |
| 家长 | parent1 | parent123 |
| 学生 | 通过管理员生成的二维码扫码登录 | - |

## 核心功能

- **学生端**：扫码登录 → 大按钮预约咨询 / 写树洞悄悄话
- **家长端**：绑定孩子 → 代为预约咨询
- **心理老师端**：管理时段、处理预约、回复树洞
- **班主任端**：查看本班学生预约动态（知会模式）
- **管理员端**：班级/用户/二维码管理、数据看板
