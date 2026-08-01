import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { studentRouter } from './routes/student';
import { parentRouter } from './routes/parent';
import { teacherRouter } from './routes/teacher';
import { advisorRouter } from './routes/advisor';
import { adminRouter } from './routes/admin';
import { notificationRouter } from './routes/notification';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// 路由
app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/parent', parentRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/advisor', advisorRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationRouter);

// 错误处理
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🧠 Mind Bridge Server running on http://localhost:${PORT}`);
});

export default app;
