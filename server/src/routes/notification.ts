import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';

export const notificationRouter = Router();
notificationRouter.use(authenticate);

// 获取通知列表
notificationRouter.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { unread } = req.query;

  const where: any = { receiverId: userId };
  if (unread === 'true') where.isRead = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(notifications.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    isRead: n.isRead,
    refId: n.refId,
    refType: n.refType,
    createdAt: n.createdAt.toISOString(),
  })));
});

// 未读数量
notificationRouter.get('/unread-count', async (req: Request, res: Response) => {
  const count = await prisma.notification.count({
    where: { receiverId: req.user!.userId, isRead: false },
  });
  res.json({ count });
});

// 标记已读
notificationRouter.patch('/:id/read', async (req: Request, res: Response) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  res.json({ success: true });
});

// 全部标记已读
notificationRouter.patch('/read-all', async (req: Request, res: Response) => {
  await prisma.notification.updateMany({
    where: { receiverId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});
