import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { authRoutes } from "./routes/auth.js";
import { treatmentRoutes } from "./routes/treatments.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { patientRoutes } from "./routes/patients.js";
import { practitionerRoutes } from "./routes/practitioners.js";
import { blockedSlotRoutes } from "./routes/blocked-slots.js";
import { notificationRoutes } from "./routes/notifications.js";
import { paymentRoutes } from "./routes/payments.js";
import { formRoutes } from "./routes/forms.js";
import { productRoutes } from "./routes/products.js";
import { settingRoutes } from "./routes/settings.js";
import { reportRoutes } from "./routes/reports.js";
import { loyaltyRoutes } from "./routes/loyalty.js";
import { membershipRoutes } from "./routes/memberships.js";
import { promoCodeRoutes } from "./routes/promo-codes.js";
import { referralRoutes } from "./routes/referrals.js";
import { smsCampaignRoutes } from "./routes/sms-campaigns.js";
import { integrationRoutes } from "./routes/integrations.js";
import { giftCardRoutes } from "./routes/gift-cards.js";
import { notificationTemplateRoutes } from "./routes/notification-templates.js";
import { packageRoutes } from "./routes/packages.js";
import { staffRoutes } from "./routes/staff.js";
import { waitlistRoutes } from "./routes/waitlist.js";
import { closedDateRoutes } from "./routes/closed-dates.js";
import { faceMapRoutes } from "./routes/face-maps.js";

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev-jwt-secret-change-in-production",
});

await app.register(websocket);

// Health check
app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
await app.register(authRoutes);
await app.register(treatmentRoutes);
await app.register(appointmentRoutes);
await app.register(patientRoutes);
await app.register(practitionerRoutes);
await app.register(blockedSlotRoutes);
await app.register(notificationRoutes);
await app.register(paymentRoutes);
await app.register(formRoutes);
await app.register(productRoutes);
await app.register(settingRoutes);
await app.register(reportRoutes);
await app.register(loyaltyRoutes);
await app.register(membershipRoutes);
await app.register(promoCodeRoutes);
await app.register(referralRoutes);
await app.register(smsCampaignRoutes);
await app.register(integrationRoutes);
await app.register(giftCardRoutes);
await app.register(notificationTemplateRoutes);
await app.register(packageRoutes);
await app.register(staffRoutes);
await app.register(waitlistRoutes);
await app.register(closedDateRoutes);
await app.register(faceMapRoutes);

// Start
const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  console.log(`Server running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
