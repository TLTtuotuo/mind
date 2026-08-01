import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const advisorRouter = Router();
advisorRouter.use(authenticate);
advisorRouter.use(requireRole('ADVISOR'));

// ==================== 本班学生预约动态 ====================
advisorRouter.get('/appointments', async (req: Request, res: Response) => {
  const advisorId = req.user!.userId;

  const advisor = await prisma.user.findUnique({ where: { id: advisorId } });
  if (!advisor?.advisorClassId) throw new AppError('未绑定班级');

  const students = await prisma.student.findMany({
    where: { classId: advisor.advisorClassId },
    select: { id: true },
  });
  const studentIds = students.map(s => s.id);

  const appointments = await prisma.appointment.findMany({
    where: {
      studentId: { in: studentIds },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    include: {
      timeSlot: true,
      student: { include: { user: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(appointments.map(a => ({
    id: a.id,
    studentName: a.student.user!.name,
    studentNo: a.student.studentNo,
    startTime: a.timeSlot.startTime.toISOString(),
    endTime: a.timeSlot.endTime.toISOString(),
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  })));
});

// ==================== 今日本班预约 ====================
advisorRouter.get('/today', async (req: Request, res: Response) => {
  const advisorId = req.user!.userId;
  const advisor = await prisma.user.findUnique({ where: { id: advisorId } });
  if (!advisor?.advisorClassId) throw new AppError('未绑定班级');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const students = await prisma.student.findMany({
    where: { classId: advisor.advisorClassId },
    select: { id: true },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      studentId: { in: students.map(s => s.id) },
      status: 'CONFIRMED',
      timeSlot: { startTime: { gte: today, lt: tomorrow } },
    },
    include: {
      student: { include: { user: true } },
      timeSlot: true,
    },
    orderBy: { timeSlot: { startTime: 'asc' } },
  });

  res.json({
    count: appointments.length,
    appointments: appointments.map(a => ({
      id: a.id,
      studentName: a.student.user!.name,
      startTime: a.timeSlot.startTime.toISOString(),
      endTime: a.timeSlot.endTime.toISOString(),
    })),
  });
});
