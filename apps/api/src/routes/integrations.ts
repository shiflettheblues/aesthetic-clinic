import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";
import { syncAllClients } from "../services/mailchimp.js";

const SUPPORTED_PROVIDERS = ["mailchimp", "klarna", "clearpay", "xero", "google_reviews"] as const;

export async function integrationRoutes(app: FastifyInstance) {
  // List all integrations
  app.get("/integrations", { preHandler: requireRole("ADMIN") }, async (_request, reply) => {
    const configs = await prisma.integrationConfig.findMany({
      orderBy: { provider: "asc" },
    });

    // Include unconfigured providers
    const configMap = new Map(configs.map((c) => [c.provider, c]));
    const all = SUPPORTED_PROVIDERS.map((provider) => {
      const existing = configMap.get(provider);
      return existing ?? {
        id: null,
        provider,
        isEnabled: false,
        credentials: null,
        settings: null,
        lastSyncAt: null,
        syncStatus: null,
      };
    });

    return reply.send({ integrations: all });
  });

  // Get integration detail
  app.get("/integrations/:provider", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { provider } = request.params as { provider: string };

    const config = await prisma.integrationConfig.findUnique({ where: { provider } });
    if (!config) {
      return reply.send({
        integration: { provider, isEnabled: false, credentials: null, settings: null, lastSyncAt: null, syncStatus: null },
      });
    }

    // Mask sensitive credential values
    const masked = config.credentials
      ? Object.fromEntries(
          Object.entries(config.credentials as Record<string, string>).map(([k, v]) => [
            k,
            typeof v === "string" && v.length > 4 ? `${v.slice(0, 4)}${"*".repeat(v.length - 4)}` : v,
          ])
        )
      : null;

    return reply.send({ integration: { ...config, credentials: masked } });
  });

  // Connect / update integration
  app.put("/integrations/:provider", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { provider } = request.params as { provider: string };

    if (!SUPPORTED_PROVIDERS.includes(provider as typeof SUPPORTED_PROVIDERS[number])) {
      return reply.status(400).send({ error: "Unsupported provider", code: "UNSUPPORTED_PROVIDER" });
    }

    const schema = z.object({
      isEnabled: z.boolean().optional(),
      credentials: z.record(z.string()).optional(),
      settings: z.record(z.unknown()).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.isEnabled !== undefined) data.isEnabled = parsed.data.isEnabled;
    if (parsed.data.credentials) data.credentials = parsed.data.credentials as object;
    if (parsed.data.settings) data.settings = parsed.data.settings as object;

    const config = await prisma.integrationConfig.upsert({
      where: { provider },
      update: data,
      create: { provider, ...data } as { provider: string; isEnabled?: boolean; credentials?: object; settings?: object },
    });

    return reply.send({ integration: config });
  });

  // Disconnect integration
  app.delete("/integrations/:provider", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { provider } = request.params as { provider: string };

    await prisma.integrationConfig.updateMany({
      where: { provider },
      data: { isEnabled: false, credentials: Prisma.DbNull },
    });

    return reply.send({ message: `${provider} disconnected` });
  });

  // Trigger sync
  app.post("/integrations/:provider/sync", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { provider } = request.params as { provider: string };

    const config = await prisma.integrationConfig.findUnique({ where: { provider } });
    if (!config || !config.isEnabled) {
      return reply.status(400).send({ error: "Integration not enabled", code: "NOT_ENABLED" });
    }

    await prisma.integrationConfig.update({
      where: { provider },
      data: { syncStatus: "syncing" },
    });

    if (provider === "mailchimp") {
      // Real Mailchimp sync
      try {
        const result = await syncAllClients();
        await prisma.integrationConfig.update({
          where: { provider },
          data: { syncStatus: "idle", lastSyncAt: new Date() },
        });
        return reply.send({ message: "Sync completed", ...result });
      } catch (e) {
        await prisma.integrationConfig.update({
          where: { provider },
          data: { syncStatus: "idle" },
        });
        console.error("[INTEGRATION] Mailchimp sync failed:", e);
        return reply.status(500).send({ error: "Sync failed", code: "SYNC_ERROR" });
      }
    }

    // Other providers — simulate sync
    setTimeout(async () => {
      await prisma.integrationConfig.update({
        where: { provider },
        data: { syncStatus: "idle", lastSyncAt: new Date() },
      });
    }, 2000);

    return reply.send({ message: "Sync started" });
  });
}
