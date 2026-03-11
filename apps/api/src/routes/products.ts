import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().optional(),
  costCents: z.number().int().min(0),
  salePriceCents: z.number().int().min(0).optional(),
  stockQuantity: z.number().int().optional(),
  lowStockThreshold: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const stockMoveSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
  reason: z.string().min(1),
  reference: z.string().optional(),
});

export async function productRoutes(app: FastifyInstance) {
  // List products
  app.get("/products", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { category, lowStock, active } = request.query as {
      category?: string;
      lowStock?: string;
      active?: string;
    };

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (active === "true") where.isActive = true;

    let products = await prisma.product.findMany({
      where,
      include: {
        treatmentProducts: {
          include: { treatment: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    if (lowStock === "true") {
      products = products.filter((p) => p.stockQuantity <= p.lowStockThreshold);
    }

    return reply.send({ products });
  });

  // Get product
  app.get("/products/:id", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        treatmentProducts: {
          include: { treatment: { select: { id: true, name: true } } },
        },
        stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!product) {
      return reply.status(404).send({ error: "Product not found", code: "NOT_FOUND" });
    }

    return reply.send({ product });
  });

  // Create product
  app.post("/products", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const product = await prisma.product.create({ data: parsed.data });

    // Create initial stock movement if quantity > 0
    if (product.stockQuantity > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: product.stockQuantity,
          reason: "initial_stock",
          createdBy: request.user.sub,
        },
      });
    }

    return reply.status(201).send({ product });
  });

  // Update product
  app.patch("/products/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Product not found", code: "NOT_FOUND" });
    }

    const product = await prisma.product.update({ where: { id }, data: parsed.data });
    return reply.send({ product });
  });

  // Delete product
  app.delete("/products/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: "Product not found", code: "NOT_FOUND" });
    }

    await prisma.product.delete({ where: { id } });
    return reply.send({ message: "Product deleted" });
  });

  // Stock movement
  app.post("/products/stock-movement", { preHandler: requireRole("ADMIN", "PRACTITIONER") }, async (request, reply) => {
    const parsed = stockMoveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.errors[0]?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
      });
    }

    const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
    if (!product) {
      return reply.status(404).send({ error: "Product not found", code: "NOT_FOUND" });
    }

    const newQuantity = product.stockQuantity + parsed.data.quantity;
    if (newQuantity < 0) {
      return reply.status(400).send({ error: "Insufficient stock", code: "INSUFFICIENT_STOCK" });
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          productId: parsed.data.productId,
          quantity: parsed.data.quantity,
          reason: parsed.data.reason,
          reference: parsed.data.reference,
          createdBy: request.user.sub,
        },
      }),
      prisma.product.update({
        where: { id: parsed.data.productId },
        data: { stockQuantity: newQuantity },
      }),
    ]);

    return reply.status(201).send({ movement, newQuantity });
  });

  // Link product to treatment
  app.post("/products/treatment-link", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const schema = z.object({
      treatmentId: z.string(),
      productId: z.string(),
      quantityUsed: z.number().min(0.01),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    const link = await prisma.treatmentProduct.upsert({
      where: {
        treatmentId_productId: {
          treatmentId: parsed.data.treatmentId,
          productId: parsed.data.productId,
        },
      },
      update: { quantityUsed: parsed.data.quantityUsed },
      create: parsed.data,
    });

    return reply.status(201).send({ link });
  });

  // Remove treatment-product link
  app.delete("/products/treatment-link/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await prisma.treatmentProduct.delete({ where: { id } });
    return reply.send({ message: "Link removed" });
  });
}
