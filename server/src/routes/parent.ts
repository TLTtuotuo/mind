import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { createNotification } from '../services/notification';

export const parentRouter = Router();
parentRouter.use(authenticate);
parentRouter.use(requireRole('PARENT'));

// ==================== 绑定孩子 ====================
const bindChildSchema = z.object({
  studentNo: z.string().min(1),
});

parentRouter.post('/bind-child', async (req: Request, res: Response) => {
  const data = bindChildSchema.parse(req.body);
  const parentId = req.user!.userId;

  const student = await prisma.student.findUnique({ where: { studentNo: data.studentNo } });
  if (!student) throw new AppError('未找到该学号对应的学生，请检查学号是否正确');

  const existing = await prisma.studentParent.findUnique({
    where: { parentId_studentId: { parentId, studentId: student.id } },
  });
  if (existing) throw new AppError('您已绑定过该学生');

  await prisma.studentParent.create({
    data: { parentId, studentId: student.id, status: 'ACTIVE' },
  });

  res.status(201).json({ success: true, message: '绑定成功' });
});

// ==================== 已绑定孩子列表 ====================
parentRouter.get('/children', async (req: Request, res: Response) => {
  const parentId = req.user!.userId;

  const bindings = await prisma.studentParent.findMany({
    where: { parentId, status: 'ACTIVE' },
    include: {
      student: { include: { class: true, user: true } },
    },
  });

  res.json(bindings.map(b => ({
    id: b.student.id,
    name: b.student.user!.name,
    studentNo: b.student.studentNo,
    className: b.student.class.name,
    grade: b.student.class.grade,
    relation: b.relation,
  })));
});

// ==================== 家长可为孩子查看可用时段 ====================
parentRouter.get('/slots', async (req: Request, res: Response) => {
  const now = new Date();

  const advanceDeadlineConfig = await prisma.systemConfig.findUnique({ where: { key: 'cancel_deadline_hours' } });
  const deadlineHours = parseInt(advanceDeadlineConfig?.value || '2');
  const minStartTime = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);

  const slots = await prisma.timeSlot.findMany({
    where: { isActive: true, startTime: { gte: minStartTime } },
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

  res.json(slots
    .filter(s => s._count.appointments < s.maxBookings)
    .map(s => ({
      id: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }))
  );
});

// ==================== 家长为孩子预约 ====================
const parentBookSchema = z.object({
  studentId: z.string().uuid(),
  slotId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

parentRouter.post('/book', async (req: Request, res: Response) => {
  const data = parentBookSchema.parse(req.body);
  const parentId = req.user!.userId;

  const binding = await prisma.studentParent.findUnique({
    where: { parentId_studentId: { parentId, studentId: data.studentId } },
  });
  if (!binding || binding.status !== 'ACTIVE') throw new AppError('未绑定该学生或绑定状态异常');

  const existing = await prisma.appointment.findFirst({
    where: {
      studentId: data.studentId,
      timeSlotId: data.slotId,
      status: 'CONFIRMED',
    },
  });
  if (existing) throw new AppError('该时段已被预约');

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
  if (!slot || !slot.isActive || slot._count.appointments >= slot.maxBookings) {
    throw new AppError('该时段不可用');
  }

  const appointment = await prisma.appointment.create({
    data: {
      studentId: data.studentId,
      timeSlotId: data.slotId,
      bookedById: parentId,
      bookerRole: 'PARENT',
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
    where: { role: 'ADVISOR', advisorClassId: appointment.student.classId, isActive: true },
  });
  for (const advisor of advisors) {
    await createNotification({
      receiverId: advisor.id,
      type: 'APPOINTMENT_CREATED',
      title: '学生预约通知（家长代约）',
      content: `${appointment.student.user!.name} 同学的家长已预约咨询（${slot.startTime.toLocaleString('zh-CN')}）`,
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

// ==================== 查询孩子预约 ====================
parentRouter.get('/appointments/:studentId', async (req: Request, res: Response) => {
  const parentId = req.user!.userId;
  const studentId = req.params.studentId;

  const binding = await prisma.studentParent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (!binding || binding.status !== 'ACTIVE') throw new AppError('无权查看');

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

// ==================== 家长取消预约 ====================
parentRouter.post('/cancel/:id', async (req: Request, res: Response) => {
  const appointmentId = req.params.id;
  const parentId = req.user!.userId;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { timeSlot: true, student: { include: { class: true, user: true } } },
  });
  if (!appointment) throw new AppError('预约不存在');

  const binding = await prisma.studentParent.findUnique({
    where: { parentId_studentId: { parentId, studentId: appointment.studentId } },
  });
  if (!binding || binding.status !== 'ACTIVE') throw new AppError('无权操作');

  if (appointment.status !== 'CONFIRMED') throw new AppError('该预约状态不可取消');

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED', cancelReason: '家长主动取消' },
    include: { student: { include: { class: true, user: true } }, timeSlot: true },
  });

  const advisors = await prisma.user.findMany({
    where: { role: 'ADVISOR', advisorClassId: updated.student.classId, isActive: true },
  });
  const teachers = await prisma.user.findMany({ where: { role: 'TEACHER', isActive: true } });
  const allReceivers = [...advisors, ...teachers];

  for (const r of allReceivers) {
    await createNotification({
      receiverId: r.id,
      type: 'APPOINTMENT_CANCELLED',
      title: '预约取消通知',
      content: `${updated.student.user!.name} 同学的家长已取消咨询预约`,
      refId: updated.id,
      refType: 'appointment',
    });
  }

  res.json({ success: true });
});
