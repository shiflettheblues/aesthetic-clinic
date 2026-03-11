import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";

export async function notificationRoutes(app: FastifyInstance) {
  // List notifications for current user
  app.get("/notifications", { preHandler: authenticate }, async (request, reply) => {
    const { unread } = request.query as { unread?: string };

    const where: Record<string, unknown> = { userId: request.user.sub };
    if (unread === "true") {
      where.readAt = null;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: request.user.sub, readAt: null },
    });

    return reply.send({ notifications, unreadCount });
  });

  // Mark notification as read
  app.patch("/notifications/:id/read", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== request.user.sub) {
      return reply.status(404).send({ error: "Notification not found", code: "NOT_FOUND" });
    }

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return reply.send({ message: "Marked as read" });
  });

  // Mark all as read
  app.post("/notifications/read-all", { preHandler: authenticate }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { userId: request.user.sub, readAt: null },
      data: { readAt: new Date() },
    });

    return reply.send({ message: "All notifications marked as read" });
  });
}
