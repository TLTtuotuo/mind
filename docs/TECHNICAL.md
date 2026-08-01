# 心桥 Mind Bridge — 技术文档

## 项目概述

面向小学的心理咨询预约平台。核心挑战：**让 6–12 岁的小学生敢点、会用、愿意主动预约心理咨询**。

| 维度 | 指标 |
|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS + Zustand |
| 后端 | Express + Prisma ORM（开发: SQLite / 生产: PostgreSQL） |
| 页面数 | 17 个页面，5 种角色工作台 |
| API 模块 | 7 个路由模块，30+ 接口 |
| 编译 | TypeScript 零错误，Vite 构建 ~90KB (gzip) |

---

## 一、架构设计

### 1.1 整体架构

```
┌──────────────────────────────────────────────────┐
│                    前端 (Vite + React)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 学生入口  │ │ 家长工作台 │ │ 老师/管理 │          │
│  │ 扫码登录  │ │ 绑定孩子  │ │ 时段/树洞 │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │            │                  │
│       └────────────┼────────────┘                  │
│                    │ /api/*                        │
│              Vite Proxy                            │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│               后端 (Express)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ auth.ts  │ │ JWT 中间件 │ │ QR Token │          │
│  │ 登录注册  │ │ 角色校验   │ │ 扫码认证  │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│       │            │            │                  │
│  ┌────▼────────────▼────────────▼────┐           │
│  │        Prisma ORM                 │           │
│  │   SQLite (dev) / PostgreSQL (prod)│           │
│  └──────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

### 1.2 设计原则

```
"学生端 = 游戏机，管理端 = 仪表盘"
```

| 原则 | 学生端 | 管理端 |
|------|--------|--------|
| 信息密度 | 极低，一屏只做一件事 | 正常，效率优先 |
| 按钮尺寸 | >120px 高，触控友好 | 标准尺寸 |
| 色彩 | 暖橙 + 天蓝渐变 | 白底 + 功能色点缀 |
| 文字量 | 每屏 < 50 字 | 正常信息密度 |
| 操作路径 | 3 步内完成核心任务 | 功能导向 |

---

## 二、认证体系（技术难点）

### 2.1 双通道认证

系统同时支持两种完全不同的登录方式：

| 通道 | 用户 | 方式 | Token |
|------|------|------|-------|
| 密码登录 | 家长/老师/管理员 | 账号 + 密码 → JWT（7天） | Authorization Header |
| 扫码登录 | 学生 | QR Token → 验证 → JWT（7天） | Authorization Header |

**为什么学生不用密码？**
- 小学生记不住密码
- 家长手机扫码，零输入成本
- 隐私保护——学生不直接拥有登录凭据

### 2.2 QR Token 安全模型

```
管理员生成 QR
    │
    ▼
┌─────────────────────────────────────┐
│ QR 内容：                            │
│ http://域名/student/entry?qrToken=xx │
│                                     │
│ 数据库存储：                          │
│ student.qrToken = "a4fd6d8a..."     │
│ student.qrTokenExp = 24小时过期      │
└─────────────────────────────────────┘
    │ 学生扫码
    ▼
┌─────────────────────────────────────┐
│ 1. 手机浏览器打开 /student/entry      │
│ 2. 前端从 URL 读取 qrToken           │
│ 3. 调用 POST /api/auth/qr-login      │
│ 4. 后端验证:                          │
│    - Token 是否存在？                 │
│    - 是否在有效期内？                  │
│ 5. 返回 JWT → 存储到 localStorage    │
└─────────────────────────────────────┘
```

**安全措施：**
- QR Token 24 小时自动过期
- 与学生一对一绑定，存储在数据库
- 不暴露在任何公开 URL 中（通过 POST body 传输）
- 重新生成 QR 码会使旧 Token 立即失效

### 2.3 JWT 中间件链

```typescript
// auth.ts — 两套中间件，按场景组合
app.use('/api/student', authenticate);           // JWT 校验
app.use('/api/teacher', authenticate, requireRole('TEACHER')); // JWT + 角色
app.use('/api/auth/qr-login', ...);              // 公开接口，验证 QR Token
```

**角色中间件工厂模式：**
```typescript
export function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}
// 使用: requireRole('TEACHER', 'ADMIN') — 允许多角色
```

---

## 三、数据库设计

### 3.1 ER 关系图

```
┌──────┐     ┌──────────┐     ┌─────────────┐
│ User │────→│ Student  │←────│ StudentParent│←────┐
│      │     │          │     │ (家长-学生)   │     │
│ role │     │ qrToken  │     └─────────────┘     │
└──┬───┘     └────┬─────┘                         │
   │              │                               │
   │ 创建         │ 预约                           │ 家长 User
   ▼              ▼                               │
┌──────────┐ ┌─────────────┐                      │
│ TimeSlot │→│ Appointment │                      │
│ (时段)    │ │ (预约记录)   │                      │
└──────────┘ └─────────────┘                      │
                  │                               │
                  │ 触发                           │
                  ▼                               │
            ┌──────────────┐                      │
            │ Notification │                      │
            │ (站内通知)    │                      │
            └──────────────┘                      │
                                                  │
┌──────────────┐     ┌────────────────┐          │
│TreeholeMessage│←───│ Student        │──────────┘
│ (树洞悄悄话)  │     └────────────────┘
└──────┬───────┘
       │ 回复
       ▼
     User (TEACHER)
```

### 3.2 关键设计决策

**为什么用 UUID 而非自增 ID？**
- 安全性：自增 ID 可被遍历，UUID 不可猜测
- 分布式友好：未来可拆分服务
- 前端可直接生成临时 ID 做乐观更新

**为什么用 String 而非 Enum（SQLite 环境）？**
- SQLite 不支持原生 ENUM
- 使用 String + 注释约定（如 `// CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`）
- 生产切 PostgreSQL 时只需改 provider，无需改代码

**Appointment 的 `bookedById` 和 `bookerRole` 分离设计：**
```
预约操作人 ≠ 咨询学生（家长代约场景）
- studentId：被咨询的学生
- bookedById：实际操作人（可能是学生本人或家长）
- bookerRole：操作人角色（STUDENT / PARENT）
```
这样能准确记录"谁操作的"，方便追溯和通知。

---

## 四、核心业务流程

### 4.1 预约咨询全链路

```
学生扫码                   家长登录
   │                          │
   ▼                          ▼
┌──────────┐            ┌──────────┐
│ 大按钮    │            │ 选择孩子  │
│ "预约咨询"│            │ 选择时段  │
└────┬─────┘            └────┬─────┘
     │                       │
     └───────────┬───────────┘
                 ▼
        ┌────────────────┐
        │ GET /slots      │  ← 返回可用时段
        │ (排除已约满时段)  │     (check maxBookings)
        └───────┬────────┘
                ▼
        ┌────────────────┐
        │ POST /book      │  ← 创建预约
        │ (CAS 校验重复)   │     unique(studentId, slotId)
        └───────┬────────┘
                ▼
        ┌────────────────┐
        │ 通知班主任       │  ← createNotification()
        │ (知会，不审批)    │
        └───────┬────────┘
                ▼
        ┌────────────────┐
        │ 心理老师标记完成  │  ← PATCH /appointments/:id
        └────────────────┘
```

**并发安全（盲约模式下的时段抢占）：**
```typescript
// 数据库层面保证：
// 1. @@unique([studentId, timeSlotId]) — 同一学生不能重复约同时段
// 2. maxBookings 字段 + count 查询 — 先到先得
// 3. 应用层校验:
const existingCount = await prisma.appointment.count({
  where: { timeSlotId, status: { in: ['CONFIRMED', 'COMPLETED'] } }
});
if (existingCount >= slot.maxBookings) throw new AppError('该时段已被约满');
```

### 4.2 树洞悄悄话 — 匿名通信

```
学生写悄悄话
    │
    ▼
┌─────────────────────────┐
│ POST /student/treehole   │
│ { content, isAnonymous } │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│ 生成 viewCode            │  ← uuid().slice(0, 8).toUpperCase()
│ 存入 TreeholeMessage     │     如 "A3F8B2C1"
└────────┬────────────────┘
         ▼
    显示查看码给学生
    "请截图保存！"
         │
         ▼
┌─────────────────────────┐
│ 心理老师端               │
│ - 匿名消息: 显示年级      │  ← isAnonymous = true
│   不显示姓名             │     只显示 "三年级 匿名同学"
│ - 实名消息: 显示完整信息  │
│                          │
│ POST /treehole/:id/reply │
│ { reply: "..." }         │
└────────┬────────────────┘
         ▼
    通知学生（下次扫码可见）
         │
         ▼
    学生输入 viewCode
    查看老师回复
```

**匿名保护实现：**
```typescript
// teacher.ts — 树洞消息列表
studentInfo: m.isAnonymous
  ? { grade: m.student.class.grade, name: '匿名同学' }
  : { name: m.student.user.name, className: m.student.class.name }
```

---

## 五、前端实现细节

### 5.1 状态管理（Zustand）

选用 Zustand 而非 Redux 的原因：本项目状态结构简单（主要是 auth），不需要 reducer 模式。

```typescript
// stores/auth.ts
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),  // 持久化到 localStorage
  login: async (username, password) => { ... },
  qrLogin: async (qrToken) => { ... },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));
```

### 5.2 路由保护（ProtectedRoute）

```typescript
// components/common/ProtectedRoute.tsx
export default function ProtectedRoute({ children, roles }: Props) {
  const { token, user } = useAuthStore();

  if (!token) return <Navigate to="/" replace />;                    // 未登录 → 首页
  if (user && !roles.includes(user.role)) {
    return <Navigate to={homeMap[user.role]} replace />;              // 角色不匹配 → 各自工作台
  }
  return <>{children}</>;
}
// 使用: <ProtectedRoute roles={['TEACHER']}><TeacherHome /></ProtectedRoute>
```

### 5.3 页面过渡动画

**纯 CSS 方案（无 JS 动画库依赖）：**

```css
/* 页面入场：淡入 + 上移 + 微缩放 */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 列表交错：每个子元素延迟 50ms */
.stagger-list > *:nth-child(1) { animation-delay: 0.00s; }
.stagger-list > *:nth-child(2) { animation-delay: 0.05s; }
.stagger-list > *:nth-child(3) { animation-delay: 0.10s; }
/* ... */
```

贝塞尔曲线 `cubic-bezier(0.22, 0.61, 0.36, 1)` 实现"快出慢停"的自然手感。

### 5.4 骨架屏加载

```tsx
// 数据加载中 → 显示骨架屏，避免空白闪烁
{loading ? (
  <div className="space-y-3">
    <div className="skeleton h-5 w-20" />
    <SkeletonCard />
    <SkeletonCard />
  </div>
) : (
  // 实际数据
)}
```

### 5.5 URL 状态持久化

**问题：** 管理员在二维码页面选了班级 → 刷新 → 班级选择丢失

**解决：** 将选中班级存入 URL 参数，而非仅 React state

```typescript
// 之前: useState (刷新丢失)
const [selectedClass, setSelectedClass] = useState('');

// 之后: URL search params (刷新保留)
const [searchParams, setSearchParams] = useSearchParams();
const selectedClass = searchParams.get('classId') || '';

const selectClass = (classId: string) => {
  setSearchParams({ classId }); // URL 变为 /admin/qrcode?classId=xxx
};
```

---

## 六、通知系统

### 6.1 触发点与接收人

| 事件 | 通知谁 | 类型 |
|------|--------|------|
| 学生/家长预约成功 | 班主任 | `APPOINTMENT_CREATED` |
| 取消预约 | 班主任 + 心理老师 | `APPOINTMENT_CANCELLED` |
| 咨询日当天上午 | 预约人 | `APPOINTMENT_REMINDER` |
| 心理老师回复树洞 | 对应学生 | `TREEHOLE_REPLIED` |

### 6.2 设计决策

- **站内信而非推送通知**：避免依赖第三方推送服务（极光、个推），降低系统复杂度
- **通过通知引用实体**：`refId` + `refType` 字段关联原始业务数据，支持"点击通知跳转到预约详情"的扩展
- **已读/未读分离查询**：`GET /notifications?unread=true` 支持红点计数单独查询

---

## 七、环境适配

### 7.1 SQLite ↔ PostgreSQL 无缝切换

核心设计：Prisma Schema 除了 provider 声明外，不使用任何数据库特有类型注解。

```
开发环境: provider = "sqlite"    → dev.db 文件，零安装
生产环境: provider = "postgresql" → 改一行配置 + DATABASE_URL
```

切换步骤：
1. 修改 `schema.prisma` 第一行 `sqlite` → `postgresql`
2. 修改 `.env` 中 `DATABASE_URL` 为 PostgreSQL 连接串
3. 运行 `prisma migrate deploy`

### 7.2 局域网访问（手机扫码开发调试）

```bash
# server/.env
CLIENT_URL="http://10.116.63.219:5173"  # 本机局域网 IP

# 启动 Vite 时绑定所有网卡
vite --host 0.0.0.0 --port 5173
```

QR 码内容从 `http://localhost:5173/...` 变为 `http://10.116.63.219:5173/...`，手机在同一 Wi-Fi 下即可扫码访问。

---

## 八、目录结构

```
mind/
├── client/                         # React 前端
│   ├── src/
│   │   ├── components/common/      # PageTransition, Spinner, ProtectedRoute
│   │   ├── pages/
│   │   │   ├── auth/               # LoginPage, RegisterPage
│   │   │   ├── student/            # StudentEntry, StudentBook, Treehole 等
│   │   │   ├── parent/             # ParentHome, ParentBook, ParentChildren
│   │   │   ├── teacher/            # TeacherHome, TeacherSchedule, TeacherTreehole
│   │   │   ├── advisor/            # AdvisorHome (纯知会)
│   │   │   └── admin/              # Dashboard, Classes, Users, QRCode, Records, Settings
│   │   ├── stores/auth.ts          # Zustand 认证状态
│   │   ├── types/index.ts          # 共享 TS 类型
│   │   └── utils/api.ts            # Axios 实例 + 拦截器
│   └── ...
├── server/                         # Express 后端
│   ├── prisma/
│   │   ├── schema.prisma           # 7 张表，完整数据模型
│   │   └── seed.ts                 # 演示数据
│   ├── src/
│   │   ├── db.ts                   # Prisma 客户端单例
│   │   ├── index.ts                # Express 入口
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT + QR Token 认证
│   │   │   └── errorHandler.ts     # 统一错误处理
│   │   ├── routes/
│   │   │   ├── auth.ts             # 登录/注册/扫码
│   │   │   ├── student.ts          # 预约/树洞/查看
│   │   │   ├── parent.ts           # 绑定/代约
│   │   │   ├── teacher.ts          # 时段/预约管理/树洞回复
│   │   │   ├── advisor.ts          # 班主任知会
│   │   │   ├── admin.ts            # 班级/用户/二维码/记录/设置
│   │   │   └── notification.ts     # 通知查/标已读
│   │   └── services/
│   │       └── notification.ts     # 通知创建服务
│   └── ...
└── docker-compose.yml              # PostgreSQL + 前后端容器化
```

---

## 九、关键技术栈

| 层级 | 技术 | 选择原因 |
|------|------|------|
| 前端框架 | React 18 | 生态成熟，组件化开发 |
| 类型系统 | TypeScript (strict) | 编译期错误拦截，减少运行时 bug |
| 样式 | Tailwind CSS | 原子化 CSS，开发速度快，包体积小 |
| 状态管理 | Zustand | 轻量（~1KB），无需 Provider 包裹 |
| HTTP 请求 | Axios + 拦截器 | 自动注入 Token，统一处理 401 |
| 后端框架 | Express | 轻量灵活，中间件生态丰富 |
| ORM | Prisma | 类型安全，Schema 即文档，多数据库支持 |
| 认证 | JWT (jsonwebtoken) | 无状态，前后端分离友好 |
| 二维码 | qrcode | 服务端生成 data URL，不依赖前端 Canvas |
| 密码加密 | bcryptjs | 纯 JS 实现，跨平台零编译问题 |
| 输入校验 | Zod | TypeScript 原生类型推断，运行时校验 |
| 数据库 | SQLite / PostgreSQL | 开发零配置 / 生产高性能 |

---

## 十、性能与安全

### 性能
- **前端包体积**：JS 307KB → Gzip 91KB，CSS 32KB → Gzip 5.6KB
- **API 响应**：无复杂联表查询，单次请求通常 1-3 次数据库查询
- **懒加载**：按路由拆分页面（React Router 天然支持），首屏仅加载当前页面代码

### 安全
- **密码**：bcrypt 加盐哈希存储，不可逆
- **学生隐私**：密码哈希为空字符串，无法通过密码登录
- **QR Token**：24 小时自动过期，一次性使用后可通过重新生成作废旧 Token
- **API 权限**：中间件校验 JWT + 角色，每个接口显式声明权限
- **SQL 注入防护**：Prisma 参数化查询，不存在拼接 SQL
- **CORS**：仅允许配置的 `CLIENT_URL` 跨域访问
