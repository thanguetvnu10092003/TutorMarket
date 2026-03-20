import prisma from '@/lib/prisma';

type CreateInAppNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  preferenceType?: string;
};

export async function createInAppNotification(input: CreateInAppNotificationInput) {
  if (input.preferenceType) {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId: input.userId,
          notificationType: input.preferenceType,
        },
      },
      select: {
        inAppEnabled: true,
      },
    });

    if (preference && !preference.inAppEnabled) {
      return;
    }
  }

  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link || null,
    },
  });
}
