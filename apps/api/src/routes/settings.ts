import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export async function settingRoutes(app: FastifyInstance) {
  // Get all settings (admin)
  app.get("/settings", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const settings = await prisma.setting.findMany();
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return reply.send({ settings: map });
  });

  // Get single setting (some can be public)
  app.get("/settings/:key", async (request, reply) => {
    const { key } = request.params as { key: string };

    // Public settings
    const publicKeys = ["clinic_name", "clinic_address", "clinic_phone", "booking_deposit_percent", "cancellation_policy"];
    if (!publicKeys.includes(key)) {
      // Require auth for non-public settings
      await authenticate(request, reply);
      if (reply.sent) return;
    }

    const setting = await prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      return reply.status(404).send({ error: "Setting not found", code: "NOT_FOUND" });
    }

    return reply.send({ key: setting.key, value: setting.value });
  });

  // Update setting (admin)
  app.put("/settings/:key", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: unknown };

    if (value === undefined) {
      return reply.status(400).send({ error: "Value is required", code: "VALIDATION_ERROR" });
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });

    return reply.send({ key: setting.key, value: setting.value });
  });

  // Bulk update settings (admin)
  app.put("/settings", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { settings } = request.body as { settings: Record<string, unknown> };

    if (!settings || typeof settings !== "object") {
      return reply.status(400).send({ error: "Settings object required", code: "VALIDATION_ERROR" });
    }

    const results = await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: value as object },
          create: { key, value: value as object },
        })
      )
    );

    return reply.send({ updated: results.length });
  });
}
