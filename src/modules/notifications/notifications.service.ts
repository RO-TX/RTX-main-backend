import { Notification, type NotificationType } from '../../models';
import { ApiError } from '../../lib/ApiError';

export async function notify(input: { type: NotificationType; title: string; message: string; link: string }) {
  return Notification.create({ ...input, readBy: [] });
}

export async function listNotifications(
  userId: string,
  params: { page: number; limit: number; unreadOnly?: boolean },
) {
  const filter: Record<string, unknown> = params.unreadOnly ? { readBy: { $ne: userId } } : {};
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ readBy: { $ne: userId } }),
  ]);
  return {
    items,
    unreadCount,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

export async function markRead(id: string, userId: string) {
  const n = await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: userId } }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  return n;
}

export async function markAllRead(userId: string) {
  await Notification.updateMany({ readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
}
