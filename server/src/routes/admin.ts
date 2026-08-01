import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { prisma } from '../db';
import { authenticate, requireRole, generateQRToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN'));

// ==================== 班级管理 ====================

const createClassSchema = z.object({
  name: z.string().min(1).max(50),
  grade: z.number().int().min(1).max(6),
});

adminRouter.post('/classes', async (req: Request, res: Response) => {
  const data = createClassSchema.parse(req.body);
  const cls = await prisma.class.create({ data });
  res.status(201).json(cls);
});

adminRouter.get('/classes', async (_req: Request, res: Response) => {
  const classes = await prisma.class.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  });

  res.json(classes.map(c => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    studentCount: c._count.students,
  })));
});

adminRouter.put('/classes/:id', async (req: Request, res: Response) => {
  const { name, grade } = req.body;
  const cls = await prisma.class.update({
    where: { id: req.params.id },
    data: { name, grade },
  });
  res.json(cls);
});

adminRouter.delete('/classes/:id', async (req: Request, res: Response) => {
  const studentCount = await prisma.student.count({ where: { classId: req.params.id } });
  if (studentCount > 0) throw new AppError('该班级下还有学生，请先移除学生');

  await prisma.class.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ==================== 学生管理 ====================

const createStudentSchema = z.object({
  name: z.string().min(1).max(50),
  studentNo: z.string().min(1),
  classId: z.string().uuid(),
});

adminRouter.post('/students', async (req: Request, res: Response) => {
  const data = createStudentSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: `student_${data.studentNo}`,
        passwordHash: '',
        name: data.name,
        role: 'STUDENT',
      },
    });

    const student = await tx.student.create({
      data: { id: user.id, classId: data.classId, studentNo: data.studentNo },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { studentId: student.id },
    });

    return student;
  });

  res.status(201).json(result);
});

const batchStudentSchema = z.array(z.object({
  name: z.string().min(1),
  studentNo: z.string().min(1),
  classId: z.string().uuid(),
}));

adminRouter.post('/students/batch', async (req: Request, res: Response) => {
  const students = batchStudentSchema.parse(req.body);

  const results = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const data of students) {
      const user = await tx.user.create({
        data: {
          username: `student_${data.studentNo}`,
          passwordHash: '',
          name: data.name,
          role: 'STUDENT',
        },
      });
      const student = await tx.student.create({
        data: { id: user.id, classId: data.classId, studentNo: data.studentNo },
      });
      await tx.user.update({ where: { id: user.id }, data: { studentId: student.id } });
      created.push(student);
    }
    return created;
  });

  res.status(201).json({ count: results.length });
});

adminRouter.get('/students', async (req: Request, res: Response) => {
  const { classId, keyword } = req.query;
  const where: any = {};
  if (typeof classId === 'string') where.classId = classId;
  if (typeof keyword === 'string') {
    where.user = { name: { contains: keyword } };
  }

  const students = await prisma.student.findMany({
    where,
    include: { user: true, class: true },
    orderBy: { studentNo: 'asc' },
    take: 200,
  });

  res.json(students.map(s => ({
    id: s.id,
    name: s.user!.name,
    studentNo: s.studentNo,
    className: s.class.name,
    grade: s.class.grade,
    hasQR: !!s.qrToken,
  })));
});

// ==================== 用户管理（教师/班主任） ====================

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['TEACHER', 'ADVISOR']),
  phone: z.string().optional(),
  advisorClassId: z.string().uuid().nullable().optional(),
});

adminRouter.post('/users', async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone,
      advisorClassId: data.advisorClassId,
    },
  });

  res.status(201).json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
});

adminRouter.get('/users', async (req: Request, res: Response) => {
  const { role } = req.query;
  const where: any = { role: { not: 'STUDENT' } };
  if (typeof role === 'string') where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, username: true, name: true, role: true, phone: true,
      isActive: true, createdAt: true,
      advisorClass: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users);
});

// ==================== 二维码管理 ====================

// 获取已有二维码（不重新生成）
adminRouter.get('/qrcode/:studentId', async (req: Request, res: Response) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.studentId },
    include: { user: true, class: true },
  });

  if (!student || !student.qrToken || !student.qrTokenExp || new Date() > student.qrTokenExp) {
    throw new AppError('该学生没有有效的二维码，请重新生成');
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const qrContent = `${clientUrl}/student/entry?qrToken=${student.qrToken}`;

  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 300, margin: 2,
    color: { dark: '#4F46E5', light: '#FFFFFF' },
  });

  res.json({
    studentId: student.id,
    studentName: student.user!.name,
    className: student.class.name,
    qrDataUrl,
    expiresAt: student.qrTokenExp.toISOString(),
  });
});

// 生成/重新生成二维码
adminRouter.post('/qrcode/:studentId', async (req: Request, res: Response) => {
  const token = generateQRToken();
  const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const student = await prisma.student.update({
    where: { id: req.params.studentId },
    data: { qrToken: token, qrTokenExp: exp },
    include: { user: true, class: true },
  });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const qrContent = `${clientUrl}/student/entry?qrToken=${token}`;

  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 300,
    margin: 2,
    color: { dark: '#4F46E5', light: '#FFFFFF' },
  });

  res.json({
    studentId: student.id,
    studentName: student.user!.name,
    className: student.class.name,
    qrToken: token,
    qrDataUrl,
    expiresAt: exp.toISOString(),
  });
});

adminRouter.post('/qrcode/batch/:classId', async (req: Request, res: Response) => {
  const students = await prisma.student.findMany({
    where: { classId: req.params.classId },
    include: { user: true, class: true },
  });

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const results = [];
  for (const student of students) {
    const token = generateQRToken();
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.student.update({
      where: { id: student.id },
      data: { qrToken: token, qrTokenExp: exp },
    });

    const qrContent = `${clientUrl}/student/entry?qrToken=${token}`;
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      width: 300, margin: 2,
      color: { dark: '#4F46E5', light: '#FFFFFF' },
    });

    results.push({
      studentId: student.id,
      studentName: student.user!.name,
      qrDataUrl,
    });
  }

  res.json({ count: results.length, results });
});

// ==================== 全局预约记录 ====================

adminRouter.get('/records', async (req: Request, res: Response) => {
  const { status, classId, dateFrom, dateTo } = req.query;
  const where: any = {};

  if (typeof status === 'string') where.status = status;
  if (typeof classId === 'string') where.student = { classId };
  if (typeof dateFrom === 'string' || typeof dateTo === 'string') {
    where.timeSlot = {};
    if (typeof dateFrom === 'string') where.timeSlot.startTime = { gte: new Date(dateFrom) };
    if (typeof dateTo === 'string') {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      where.timeSlot.startTime = { ...where.timeSlot.startTime, lt: to };
    }
  }

  const records = await prisma.appointment.findMany({
    where,
    include: {
      timeSlot: true,
      student: { include: { user: true, class: true } },
      bookedBy: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  res.json(records.map(a => ({
    id: a.id,
    studentName: a.student.user!.name,
    studentNo: a.student.studentNo,
    className: a.student.class.name,
    startTime: a.timeSlot.startTime.toISOString(),
    endTime: a.timeSlot.endTime.toISOString(),
    status: a.status,
    note: a.note,
    bookerRole: a.bookerRole,
    bookerName: a.bookedBy.name,
    createdAt: a.createdAt.toISOString(),
  })));
});

// ==================== 数据看板 ====================

adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const [
    totalStudents,
    totalAppointments,
    completedAppointments,
    pendingTreehole,
    totalTreehole,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.treeholeMessage.count({ where: { status: 'PENDING' } }),
    prisma.treeholeMessage.count(),
  ]);

  res.json({
    totalStudents,
    totalAppointments,
    completedAppointments,
    completionRate: totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0,
    pendingTreehole,
    totalTreehole,
  });
});

// ==================== 系统配置 ====================

adminRouter.get('/settings', async (_req: Request, res: Response) => {
  const configs = await prisma.systemConfig.findMany();
  res.json(configs);
});

adminRouter.put('/settings', async (req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) throw new AppError('缺少key或value');

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value, updatedBy: req.user!.userId },
    create: { key, value, updatedBy: req.user!.userId },
  });

  res.json(config);
});
