import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';

export const teacherRouter = Router();
teacherRouter.use(authenticate);
teacherRouter.use(requireRole('TEACHER'));

// ==================== 时段管理 — 创建时段 ====================
const createSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  maxBookings: z.number().int().min(1).max(5).default(1),
});

teacherRouter.post('/slots', async (req: Request, res: Response) => {
  const data = createSlotSchema.parse(req.body);
  const teacherId = req.user!.userId;

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) throw new AppError('结束时间必须大于开始时间');
  if (start < new Date()) throw new AppError('不能创建过去的时段');

  const slot = await prisma.timeSlot.create({
    data: {
      teacherId,
      startTime: start,
      endTime: end,
      maxBookings: data.maxBookings,
    },
  });

  res.status(201).json(slot);
});

// ==================== 时段管理 — 批量创建 ====================
const batchSlotSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  timeRanges: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  })),
  maxBookings: z.number().int().min(1).max(5).default(1),
});

teacherRouter.post('/slots/batch', async (req: Request, res: Response) => {
  const data = batchSlotSchema.parse(req.body);
  const teacherId = req.user!.userId;

  const slots = [];
  for (const date of data.dates) {
    for (const tr of data.timeRanges) {
      const startTime = new Date(`${date}T${tr.start}:00+08:00`);
      const endTime = new Date(`${date}T${tr.end}:00+08:00`);
      if (endTime <= startTime) continue;
      if (startTime < new Date()) continue;

      const slot = await prisma.timeSlot.create({
        data: { teacherId, startTime, endTime, maxBookings: data.maxBookings },
      });
      slots.push(slot);
    }
  }

  res.status(201).json({ count: slots.length, slots });
});

// ==================== 获取我的时段列表 ====================
teacherRouter.get('/slots', async (req: Request, res: Response) => {
  const teacherId = req.user!.userId;
  const { date } = req.query;

  const where: any = { teacherId };
  if (typeof date === 'string') {
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.startTime = { gte: dayStart, lt: dayEnd };
  } else {
    where.startTime = { gte: new Date() };
  }

  const slots = await prisma.timeSlot.findMany({
    where,
    include: {
      appointments: {
        where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        include: { student: { include: { user: true, class: true } } },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  res.json(slots.map(s => ({
    id: s.id,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    maxBookings: s.maxBookings,
    isActive: s.isActive,
    appointments: s.appointments.map(a => ({
      id: a.id,
      studentName: a.student.user!.name,
      className: a.student.class.name,
      status: a.status,
      note: a.note,
      bookerRole: a.bookerRole,
    })),
  })));
});

// ==================== 删除时段 ====================
teacherRouter.delete('/slots/:id', async (req: Request, res: Response) => {
  const slotId = req.params.id;
  const teacherId = req.user!.userId;

  const slot = await prisma.timeSlot.findFirst({ where: { id: slotId, teacherId } });
  if (!slot) throw new AppError('时段不存在');

  const hasBookings = await prisma.appointment.count({
    where: { timeSlotId: slotId, status: 'CONFIRMED' },
  });
  if (hasBookings > 0) throw new AppError('该时段已有预约，无法删除');

  await prisma.timeSlot.update({ where: { id: slotId }, data: { isActive: false } });
  res.json({ success: true });
});

// ==================== 查看所有预约 ====================
teacherRouter.get('/appointments', async (req: Request, res: Response) => {
  const { status, date } = req.query;
  const where: any = {};

  if (typeof status === 'string') where.status = status;
  if (typeof date === 'string') {
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.timeSlot = { startTime: { gte: dayStart, lt: dayEnd } };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      timeSlot: true,
      student: { include: { user: true, class: true } },
      bookedBy: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(appointments.map(a => ({
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

// ==================== 更新预约状态 ====================
const updateAppointmentSchema = z.object({
  status: z.enum(['COMPLETED', 'NO_SHOW']),
});

teacherRouter.patch('/appointments/:id', async (req: Request, res: Response) => {
  const data = updateAppointmentSchema.parse(req.body);

  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: data.status },
  });

  res.json({ id: appointment.id, status: appointment.status });
});

// ==================== 树洞消息列表 ====================
teacherRouter.get('/treehole', async (req: Request, res: Response) => {
  const { status } = req.query;
  const where: any = {};
  if (typeof status === 'string') where.status = status;

  const messages = await prisma.treeholeMessage.findMany({
    where,
    include: { student: { include: { user: true, class: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(messages.map(m => ({
    id: m.id,
    content: m.content,
    isAnonymous: m.isAnonymous,
    status: m.status,
    studentInfo: m.isAnonymous
      ? { grade: m.student.class.grade, name: '匿名同学' }
      : { name: m.student.user!.name, className: m.student.class.name, studentNo: m.student.studentNo },
    reply: m.reply,
    createdAt: m.createdAt.toISOString(),
    repliedAt: m.repliedAt?.toISOString(),
  })));
});

// ==================== 回复树洞消息 ====================
const replyTreeholeSchema = z.object({
  reply: z.string().min(1).max(2000),
});

teacherRouter.post('/treehole/:id/reply', async (req: Request, res: Response) => {
  const data = replyTreeholeSchema.parse(req.body);
  const teacherId = req.user!.userId;

  const msg = await prisma.treeholeMessage.update({
    where: { id: req.params.id },
    data: {
      reply: data.reply,
      repliedById: teacherId,
      repliedAt: new Date(),
      status: 'REPLIED',
    },
    include: { student: { include: { user: true } } },
  });

  await createNotification({
    receiverId: msg.student.user!.id,
    type: 'TREEHOLE_REPLIED',
    title: '树洞回复',
    content: '心理老师已回复了你的悄悄话，快来查看吧！',
    refId: msg.id,
    refType: 'treehole',
  });

  res.json({ id: msg.id, status: msg.status });
});

// ==================== 今日待办 ====================
teacherRouter.get('/today', async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppointments, pendingTreehole] = await Promise.all([
    prisma.appointment.count({
      where: {
        status: 'CONFIRMED',
        timeSlot: { startTime: { gte: today, lt: tomorrow } },
      },
    }),
    prisma.treeholeMessage.count({ where: { status: 'PENDING' } }),
  ]);

  res.json({ todayAppointments, pendingTreehole });
});
