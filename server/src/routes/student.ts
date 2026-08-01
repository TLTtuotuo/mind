import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuid } from 'uuid';
import { createNotification } from '../services/notification';

export const studentRouter = Router();

// 所有学生接口需要认证
studentRouter.use(authenticate);

// ==================== 获取可用时段 ====================
studentRouter.get('/slots', async (req: Request, res: Response) => {
  const now = new Date();
  const studentId = req.user!.studentId;

  // 检查本周已预约次数
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const weekCount = await prisma.appointment.count({
    where: {
      studentId: studentId!,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
      createdAt: { gte: weekStart },
    },
  });

  const maxBookingsConfig = await prisma.systemConfig.findUnique({ where: { key: 'max_bookings_per_week' } });
  const maxBookings = parseInt(maxBookingsConfig?.value || '2');

  const advanceDeadlineConfig = await prisma.systemConfig.findUnique({ where: { key: 'cancel_deadline_hours' } });
  const deadlineHours = parseInt(advanceDeadlineConfig?.value || '2');
  const minStartTime = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);

  const slots = await prisma.timeSlot.findMany({
    where: {
      isActive: true,
      startTime: { gte: minStartTime },
    },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          },
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });

  const availableSlots = slots
    .filter(s => s._count.appointments < s.maxBookings)
    .map(s => ({
      id: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }));

  res.json({
    slots: availableSlots,
    weekCount,
    maxBookings,
    canBook: weekCount < maxBookings,
  });
});

// ==================== 创建预约 ====================
const bookSchema = z.object({
  slotId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

studentRouter.post('/book', async (req: Request, res: Response) => {
  const data = bookSchema.parse(req.body);
  const userId = req.user!.userId;
  const studentId = req.user!.studentId!;

  const existing = await prisma.appointment.findFirst({
    where: {
      studentId,
      timeSlotId: data.slotId,
      status: { in: ['CONFIRMED'] },
    },
  });
  if (existing) throw new AppError('您已预约该时段，请勿重复预约');

  const slot = await prisma.timeSlot.findUnique({
    where: { id: data.slotId },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          },
        },
      },
    },
  });
  if (!slot || !slot.isActive) throw new AppError('该时段不可用');
  if (slot._count.appointments >= slot.maxBookings) throw new AppError('该时段已被约满');
  if (new Date(slot.startTime) <= new Date()) throw new AppError('该时段已过期');

  const appointment = await prisma.appointment.create({
    data: {
      studentId,
      timeSlotId: data.slotId,
      bookedById: userId,
      bookerRole: 'STUDENT',
      note: data.note,
      status: 'CONFIRMED',
    },
    include: {
      timeSlot: true,
      student: { include: { class: true, user: true } },
    },
  });

  // 通知班主任
  const advisors = await prisma.user.findMany({
    where: {
      role: 'ADVISOR',
      advisorClassId: appointment.student.classId,
      isActive: true,
    },
  });

  for (const advisor of advisors) {
    await createNotification({
      receiverId: advisor.id,
      type: 'APPOINTMENT_CREATED',
      title: '学生预约通知',
      content: `${appointment.student.user!.name} 同学已预约咨询（${slot.startTime.toLocaleString('zh-CN')}）`,
      refId: appointment.id,
      refType: 'appointment',
    });
  }

  res.status(201).json({
    appointment: {
      id: appointment.id,
      time: `${slot.startTime.toLocaleDateString('zh-CN')} ${slot.startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
      status: appointment.status,
    },
  });
});

// ==================== 取消预约 ====================
studentRouter.post('/cancel/:id', async (req: Request, res: Response) => {
  const appointmentId = req.params.id;
  const studentId = req.user!.studentId!;

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, studentId },
    include: { timeSlot: true, student: { include: { class: true, user: true } } },
  });

  if (!appointment) throw new AppError('预约不存在');
  if (appointment.status === 'CANCELLED') throw new AppError('该预约已取消');
  if (appointment.status === 'COMPLETED') throw new AppError('该预约已完成，无法取消');

  const deadlineConfig = await prisma.systemConfig.findUnique({ where: { key: 'cancel_deadline_hours' } });
  const deadlineHours = parseInt(deadlineConfig?.value || '2');
  const deadline = new Date(appointment.timeSlot.startTime.getTime() - deadlineHours * 60 * 60 * 1000);
  if (new Date() > deadline) throw new AppError(`咨询开始前${deadlineHours}小时内无法取消`);

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED', cancelReason: '学生主动取消' },
    include: { student: { include: { class: true, user: true } }, timeSlot: true },
  });

  // 通知班主任
  const advisors = await prisma.user.findMany({
    where: { role: 'ADVISOR', advisorClassId: updated.student.classId, isActive: true },
  });
  for (const advisor of advisors) {
    await createNotification({
      receiverId: advisor.id,
      type: 'APPOINTMENT_CANCELLED',
      title: '预约取消通知',
      content: `${updated.student.user!.name} 同学已取消咨询预约（${updated.timeSlot.startTime.toLocaleString('zh-CN')}）`,
      refId: updated.id,
      refType: 'appointment',
    });
  }

  // 通知心理老师
  const teachers = await prisma.user.findMany({ where: { role: 'TEACHER', isActive: true } });
  for (const teacher of teachers) {
    await createNotification({
      receiverId: teacher.id,
      type: 'APPOINTMENT_CANCELLED',
      title: '预约取消通知',
      content: `${updated.student.user!.name} 同学已取消咨询预约`,
      refId: updated.id,
      refType: 'appointment',
    });
  }

  res.json({ success: true });
});

// ==================== 我的预约列表 ====================
studentRouter.get('/appointments', async (req: Request, res: Response) => {
  const studentId = req.user!.studentId!;
  const appointments = await prisma.appointment.findMany({
    where: { studentId },
    include: { timeSlot: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json(appointments.map(a => ({
    id: a.id,
    startTime: a.timeSlot.startTime.toISOString(),
    endTime: a.timeSlot.endTime.toISOString(),
    status: a.status,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  })));
});

// ==================== 树洞 — 写悄悄话 ====================
const treeholeSchema = z.object({
  content: z.string().min(1).max(2000),
  isAnonymous: z.boolean().default(false),
});

studentRouter.post('/treehole', async (req: Request, res: Response) => {
  const data = treeholeSchema.parse(req.body);
  const studentId = req.user!.studentId!;

  const viewCode = uuid().slice(0, 8).toUpperCase();

  const msg = await prisma.treeholeMessage.create({
    data: {
      studentId,
      content: data.content,
      isAnonymous: data.isAnonymous,
      viewCode,
      status: 'PENDING',
    },
  });

  res.status(201).json({
    id: msg.id,
    viewCode: msg.viewCode,
    message: '悄悄话已发送！请截图保存查看码，后续可用此码查看老师的回复。',
  });
});

// ==================== 树洞 — 查看回复 ====================
studentRouter.post('/treehole/check', async (req: Request, res: Response) => {
  const { viewCode } = req.body;
  if (!viewCode) throw new AppError('请输入查看码');

  const msg = await prisma.treeholeMessage.findUnique({ where: { viewCode } });

  if (!msg) throw new AppError('查看码不正确');
  if (msg.studentId !== req.user!.studentId) throw new AppError('无权查看此消息');

  if (msg.status === 'REPLIED') {
    await prisma.treeholeMessage.update({
      where: { id: msg.id },
      data: { status: 'READ' },
    });
  }

  res.json({
    id: msg.id,
    content: msg.content,
    isAnonymous: msg.isAnonymous,
    status: msg.status,
    reply: msg.reply,
    repliedAt: msg.repliedAt?.toISOString(),
    createdAt: msg.createdAt.toISOString(),
  });
});

// ==================== 我的树洞消息列表 ====================
studentRouter.get('/treehole/messages', async (req: Request, res: Response) => {
  const studentId = req.user!.studentId!;
  const messages = await prisma.treeholeMessage.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      viewCode: true,
      isAnonymous: true,
      createdAt: true,
      reply: true,
    },
    take: 30,
  });

  res.json(messages.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    hasReply: m.status !== 'PENDING',
  })));
});
