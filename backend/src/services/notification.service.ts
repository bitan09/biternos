import { prisma } from "../config/prisma";
import { NotificationLevel } from "@prisma/client";
import { pushNotificationToUser } from "../websocket";

/** Creates a notification row and pushes it over WebSocket if the user is connected. */
export async function notify(userId: string, level: NotificationLevel, title: string, message: string) {
  const notification = await prisma.notification.create({
    data: { userId, level, title, message },
  });
  pushNotificationToUser(userId, notification);
  return notification;
}
