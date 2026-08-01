# 🚀 自动化部署 & Git 规范提交 实战指南

> 本文档记录了 Mind Bridge 项目从"手动部署"到"推送即部署"的完整过程，以及 Git 提交规范化的配置。

---

## 目录

1. [背景：我们解决了什么问题？](#背景我们解决了什么问题)
2. [生产环境 Docker 化](#生产环境-docker-化)
3. [GitHub Actions 自动部署](#github-actions-自动部署)
4. [Git 提交规范化](#git-提交规范化)
5. [完整工作流演示](#完整工作流演示)

---

## 背景：我们解决了什么问题？

项目最初有几个问题：

| 问题 | 原来 | 现在 |
|---|---|---|
| 部署方式 | 手动 SSH → pull → 敲命令 | `git push` → 自动完成 |
| 前端服务 | Vite dev server（开发模式） | Nginx 提供优化后的静态文件 |
| 后端构建 | Dockerfile 会构建失败 | 多阶段构建，编译+运行分离 |
| 数据库 | SQLite（文件数据库） | PostgreSQL（生产级数据库） |
| 密码/密钥 | 硬编码在代码里 | 环境变量 + GitHub Secrets |
| 端口暴露 | 数据库、后端全暴露 | 仅暴露 Nginx :80 |
| Git 提交 | 随意写，风格不统一 | 规范化 + 自动检查 |

---

## 生产环境 Docker 化

### 核心概念：多阶段构建（Multi-stage Build）

传统 Dockerfile 的问题：构建工具（TypeScript、npm）也被打包进最终镜像，导致镜像很大，而且有安全风险。

**多阶段构建**的思路：用一个临时容器做编译，只把编译产物复制到最终镜像里。

```
┌─────────────────────────────────┐
│  Stage 1: Builder (临时)        │
│  ┌───────────────────────────┐  │
│  │ npm ci (全量依赖)          │  │
│  │ tsc 编译 TS → JS          │  │
│  │ vite build (前端打包)      │  │
│  └───────────────────────────┘  │
│         │ 只复制产物              │
│         ▼                       │
└─────────────────────────────────┘
         dist/  node_modules/.prisma  prisma/

┌─────────────────────────────────┐
│  Stage 2: Production (最终)     │
│  ┌───────────────────────────┐  │
│  │ 只有生产依赖 + 编译产物     │  │
│  │ 非 root 用户运行           │  │
│  │ 镜像更小、更安全            │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Server Dockerfile 解读

```dockerfile
# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

# 第1步：安装全部依赖（含 TypeScript 等编译工具）
COPY package*.json ./
RUN npm ci                          # ci 比 install 更快更严格

# 第2步：生成 Prisma Client（数据库操作代码）
COPY prisma ./prisma
RUN npx prisma generate             # 根据 schema 生成类型安全的查询代码

# 第3步：编译 TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build                   # tsc 把 TS 编译成 JS

# ===== Stage 2: Production Runtime =====
FROM node:20-alpine AS production
WORKDIR /app

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 只安装生产依赖（不含 TypeScript、tsx 等）
COPY package*.json ./
RUN npm ci --omit=dev               # --omit=dev 跳过 devDependencies

# 从 Stage 1 复制编译产物
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 启动脚本：自动执行数据库迁移
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs                         # 切换到非 root 用户
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]  # 容器启动时先运行此脚本
CMD ["node", "dist/index.js"]       # 然后启动 Node 服务
```

**🤔 为什么需要 `docker-entrypoint.sh`？**

每次部署可能改了数据库表结构，这个脚本在 Node 启动前执行 `prisma migrate deploy`：

```bash
#!/bin/sh
set -e
echo "📦 Running database migrations..."
npx prisma migrate deploy    # 只应用待执行的迁移，不重置数据
echo "🚀 Starting server..."
exec "$@"                     # 执行 CMD 传过来的命令
```

### Client Dockerfile 解读

```dockerfile
# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build              # tsc + vite build → dist/

# ===== Stage 2: Nginx =====
FROM nginx:alpine

# 删除 Nginx 默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 用我们的配置替换
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 把 Stage 1 的构建产物放到 Nginx 的静态文件目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx 配置解读

```nginx
server {
    listen 80;

    # 1️⃣ 静态资源 Gzip 压缩（减少传输体积）
    gzip on;
    gzip_types text/css application/javascript ...;

    # 2️⃣ API 请求转发给后端
    location /api/ {
        proxy_pass http://server:3001;   # "server" 是 Docker 内部的服务名
        # 传递原始请求信息给后端
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 3️⃣ 前端页面（SPA 路由处理）
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        # ↑ 核心：找不到文件就返回 index.html（让 React Router 处理路由）
    }

    # 4️⃣ 静态资源强缓存（文件名带 hash，永远不变）
    location ~* \.(js|css|png|jpg|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 生产环境架构总览

```
用户浏览器
    │
    │  http://服务器IP:80
    ▼
┌─────────────────────────────────────┐
│  Nginx (client 容器)                 │
│  ┌─────────────────────────────┐    │
│  │ /           → index.html    │    │  ← 静态文件
│  │ /assets/*   → 强缓存 1 年    │    │
│  │ /api/*      → 转发到 server  │────┼──→ ┌─────────────────┐
│  └─────────────────────────────┘    │    │  Express Server  │
└─────────────────────────────────────┘    │  (server 容器)    │
       只暴露 80 端口                       │  :3001 (内部)     │
                                           └────────┬────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │  PostgreSQL      │
                                           │  (postgres 容器)  │
                                           │  :5432 (内部)     │
                                           └─────────────────┘
                                           不暴露任何端口
```

**关键安全设计：**
- 数据库和 Server 都不暴露端口到互联网
- 所有流量只过 Nginx（:80）
- 数据库只在内网 `mindbridge` 网络中可访问

---

## GitHub Actions 自动部署

### 流程概览

```
你本地 git push → GitHub
                        │
                        ▼
              GitHub Actions 触发
                        │
                        ▼
              SSH 连接到你的服务器
                        │
                        ▼
              cd /opt/mind-bridge
              git pull origin main
                        │
                        ▼
              写入 .env 配置文件
              (密码从 GitHub Secrets 读取)
                        │
                        ▼
              docker compose up -d --build
              (重新构建 + 启动)
                        │
                        ▼
              等待健康检查通过 ✅
```

### Workflow 文件详解

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main          # 只有 push 到 main 分支才触发

jobs:
  deploy:
    runs-on: ubuntu-latest    # GitHub 提供的虚拟机
    timeout-minutes: 15       # 超时保护

    steps:
      # 步骤 1：签出代码（其实这里用不到，但保留以备扩展）
      - name: Checkout code
        uses: actions/checkout@v4

      # 步骤 2：SSH 到服务器执行部署脚本
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}         # 从 GitHub Secrets 读取
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/mind-bridge
            git pull origin main

            # 动态生成 .env（密码不存磁盘，从 Secrets 注入）
            cat > .env << EOF
            POSTGRES_USER=${{ secrets.POSTGRES_USER }}
            POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            CLIENT_URL=http://${{ secrets.SSH_HOST }}
            EOF

            # 重建并启动
            docker compose -f docker-compose.prod.yml down
            docker compose -f docker-compose.prod.yml up -d --build

            # 清理旧镜像释放磁盘
            docker image prune -f

            # 等待健康检查
            for i in $(seq 1 30); do
              STATUS=$(docker inspect --format='{{.State.Health.Status}}' mindbridge-server)
              [ "$STATUS" = "healthy" ] && break
              sleep 5
            done
```

### GitHub Secrets 配置

在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

```
┌──────────────────────────────────────────┐
│  Secret 名称           │  示例值           │
├──────────────────────────────────────────┤
│  SSH_HOST              │  123.45.67.89    │
│  SSH_USER              │  root            │
│  SSH_PRIVATE_KEY       │  -----BEGIN...   │
│  POSTGRES_USER         │  mindbridge      │
│  POSTGRES_PASSWORD     │  x7K9mP2vQ...    │
│  POSTGRES_DB           │  mindbridge      │
│  JWT_SECRET            │  a8f3c9d2e1...   │
└──────────────────────────────────────────┘
```

> 🔐 这些 Secrets 在 GitHub 端加密存储，Actions 运行时注入，不会出现在代码或日志中。

### 服务器端一次性准备

```bash
# 1. 克隆项目到指定目录
git clone https://github.com/你的用户名/mind-bridge.git /opt/mind-bridge

# 2. 确认 Docker 环境正常
docker --version
docker compose version

# 3. 生成 SSH 密钥对（如果还没有）
ssh-keygen -t ed25519 -C "github-actions-deploy"
# 公钥 (~/.ssh/id_ed25519.pub) → 追加到 ~/.ssh/authorized_keys
# 私钥 (~/.ssh/id_ed25519)     → 填入 GitHub Secrets 的 SSH_PRIVATE_KEY
```

---

## Git 提交规范化

### 为什么要规范提交信息？

混乱的提交历史：
```
* 修了个bug
* 更新
* 改了一下
* feat: add login page
* fix bug
* wip
```

规范的提交历史：
```
* fix: 修复 JWT token 过期不刷新的问题
* feat: 添加学生预约记录导出 Excel 功能
* refactor: 抽取通用表格组件减少重复代码
* chore: 升级 Prisma 到 5.18
```

规范的提交信息可以：
- **自动生成 CHANGELOG**（更新日志）
- **快速定位**某次改动的原因
- **自动决定版本号**（feat → 小版本，fix → 补丁版本）

### 约定式提交规范（Conventional Commits）

格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**最简形式（日常 90% 的情况）：**
```
feat: 添加学生信息导出功能
fix: 修复登录页面样式错乱
```

**带 scope（可选）：**
```
feat(auth): 添加短信验证码登录
fix(docker): 修复 server 容器启动失败
```

### 支持的 Type

```
feat     → 新功能           🆕
fix      → 修复 bug         🐛
docs     → 文档变更         📝
style    → 代码格式         💄
refactor → 重构             ♻️
perf     → 性能优化         ⚡
test     → 测试相关         ✅
chore    → 杂项维护         🔧
ci       → CI/CD 变更       🔄
build    → 构建/依赖变更     📦
```

### 工具链：commitizen + commitlint + husky

三个工具各司其职：

```
┌────────────────────────────────────────────────┐
│  你的工作流                                      │
│                                                  │
│  npm run commit  ──→  commitizen (交互式填写)     │
│        │                                         │
│        ▼                                         │
│  git commit -m "..."  ──→  husky 触发 hook       │
│                              │                   │
│                              ▼                   │
│                         commitlint (自动检查)      │
│                              │                   │
│                         ┌────┴────┐              │
│                         │ 通过 ✅  │  拒绝 ❌       │
│                         │ 提交成功 │  提示修改      │
│                         └─────────┘              │
└────────────────────────────────────────────────┘
```

### 各配置文件说明

**package.json** 中的相关配置：
```json
{
  "scripts": {
    "commit": "cz",        // 启动交互式提交
    "prepare": "husky"     // npm install 时自动激活 hooks
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"  // 使用哪种规范适配器
    }
  }
}
```

> 💡 `prepare` 是 npm 的生命周期钩子，`npm install` 完成后自动执行。这就是为什么别人 clone 仓库后 `npm install` 就能自动启用 husky，不需要额外配置。

**commitlint.config.js**：
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci', 'build',
    ]],
    'subject-case': [0],  // 不强制英文大小写
  },
};
```

**`.husky/commit-msg`**（Git Hook）：
```bash
npx --no -- commitlint --edit "$1"
```
这行脚本在每次 `git commit` 时自动执行，`$1` 是 Git 传入的 commit message 临时文件路径。

---

## 完整工作流演示

### 日常开发 + 部署流程

```bash
# 1. 写代码...

# 2. 提交代码（用 commitizen 交互式填写）
$ npm run commit

? Select the type of change: feat
? What is the scope? student
? Write a short description: 添加学生信息导出 Excel 功能
? Provide a longer description: 支持按班级筛选导出
? Are there any breaking changes? No
? Does this affect any open issues? #23

# 3. 推送到 GitHub（自动触发部署）
$ git push origin main

# GitHub Actions 会自动：
# → SSH 到服务器
# → git pull
# → docker compose up -d --build
# → 健康检查
# → 部署完成 🎉
```

### 如果写错了格式，会被拦截

```bash
$ git commit -m "修了一个bug"
# husky 触发 commitlint...
✖   type may not be empty     # ← 缺少 type
✖   found 1 problems

# 修改后：
$ git commit -m "fix: 修复学生列表分页错误"
# ✅ 通过！
```

---

## 快速参考

### 常用命令速查

```bash
# 部署相关
docker compose -f docker-compose.prod.yml up -d --build   # 启动/重建
docker compose -f docker-compose.prod.yml down            # 停止
docker compose -f docker-compose.prod.yml logs -f         # 查看日志
docker compose -f docker-compose.prod.yml ps              # 查看状态

# 提交相关
npm run commit          # 交互式提交
git log --oneline       # 查看规范化的提交历史

# 数据库
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy  # 手动迁移
docker compose -f docker-compose.prod.yml exec server npx prisma db seed          # 初始数据
```

### 文件索引

| 文件 | 作用 |
|---|---|
| [server/Dockerfile](../server/Dockerfile) | 后端多阶段构建 |
| [client/Dockerfile](../client/Dockerfile) | 前端多阶段构建 |
| [client/nginx.conf](../client/nginx.conf) | Nginx 配置 |
| [docker-compose.prod.yml](../docker-compose.prod.yml) | 生产环境编排 |
| [server/docker-entrypoint.sh](../server/docker-entrypoint.sh) | 数据库自动迁移 |
| [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | 自动部署流程 |
| [commitlint.config.js](../commitlint.config.js) | 提交信息规范 |
| [.husky/commit-msg](../.husky/commit-msg) | Git 提交检查 |
