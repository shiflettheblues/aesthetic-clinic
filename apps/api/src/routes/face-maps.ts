import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

export async function faceMapRoutes(app: FastifyInstance) {
  // Get face map for a client
  app.get("/face-maps/:clientId", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const faceMap = await prisma.faceMap.findUnique({ where: { clientId } });
    return reply.send({ faceMap: faceMap ?? null });
  });

  // Save face map for a client (upsert)
  app.put("/face-maps/:clientId", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { clientId } = request.params as { clientId: string };
    const schema = z.object({
      annotations: z.array(z.object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
        label: z.string(),
        color: z.string(),
        view: z.enum(["front", "side"]),
      })),
      imageData: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });

    const faceMap = await prisma.faceMap.upsert({
      where: { clientId },
      update: {
        annotations: parsed.data.annotations,
        imageData: parsed.data.imageData,
      },
      create: {
        clientId,
        annotations: parsed.data.annotations,
        imageData: parsed.data.imageData,
      },
    });

    return reply.send({ faceMap });
  });
}
