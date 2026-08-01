import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

// ==================== 注册（家长） ====================
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(50),
  phone: z.string().optional(),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new AppError('用户名已存在', 409);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      name: data.name,
      phone: data.phone,
      role: 'PARENT',
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

// ==================== 登录（家长/老师/管理员） ====================
const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { username: data.username } });
  if (!user || !user.isActive) throw new AppError('用户名不存在或账号已禁用', 401);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError('密码不正确', 401);

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
  });
});

// ==================== 学生扫码登录 ====================
authRouter.post('/qr-login', async (req: Request, res: Response) => {
  const { qrToken } = req.body;
  if (!qrToken) throw new AppError('缺少二维码令牌');

  const student = await prisma.student.findUnique({
    where: { qrToken },
    include: { user: true, class: true },
  });

  if (!student || !student.qrTokenExp || new Date() > student.qrTokenExp) {
    throw new AppError('二维码已过期，请联系班主任或管理员重新获取', 401);
  }

  const token = signToken({
    userId: student.user!.id,
    role: 'STUDENT',
    studentId: student.id,
  });

  res.json({
    token,
    student: {
      id: student.id,
      name: student.user!.name,
      studentNo: student.studentNo,
      className: student.class.name,
      grade: student.class.grade,
    },
  });
});

// ==================== 获取当前用户信息 ====================
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { student: { include: { class: true } } },
  });

  if (!user) throw new AppError('用户不存在', 404);

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    student: user.student ? {
      id: user.student.id,
      studentNo: user.student.studentNo,
      className: user.student.class.name,
      grade: user.student.class.grade,
    } : null,
  });
});
