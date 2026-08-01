import { prisma } from '../db';

interface CreateNotificationParams {
  receiverId: string;
  type: string;
  title: string;
  content: string;
  refId?: string;
  refType?: string;
  senderId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      receiverId: params.receiverId,
      senderId: params.senderId,
      type: params.type,
      title: params.title,
      content: params.content,
      refId: params.refId,
      refType: params.refType,
    },
  });
}
