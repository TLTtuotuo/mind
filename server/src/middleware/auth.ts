import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'mind-bridge-dev-secret';

export interface JwtPayload {
  userId: string;
  role: string;
  studentId?: string;
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// JWT 认证中间件
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

// 角色权限中间件工厂
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '请先登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

// 学生二维码 Token 认证
export async function authenticateQR(req: Request, res: Response, next: NextFunction) {
  const qrToken = req.headers['x-qr-token'] as string || req.query.qrToken as string;
  if (!qrToken) {
    return res.status(401).json({ error: '缺少二维码令牌' });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { qrToken },
      include: { user: true },
    });

    if (!student || !student.qrTokenExp || new Date() > student.qrTokenExp) {
      return res.status(401).json({ error: '二维码已过期，请联系管理员重新生成' });
    }

    req.user = {
      userId: student.user!.id,
      role: 'STUDENT',
      studentId: student.id,
    };
    next();
  } catch (err) {
    return res.status(500).json({ error: '认证失败' });
  }
}

// 生成 JWT
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// 生成二维码 Token
export function generateQRToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(24).toString('hex');
}

export { JWT_SECRET };
