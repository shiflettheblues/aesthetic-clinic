import { prisma } from "../lib/prisma.js";
import { sendEmail } from "./email.js";
import { sendSms } from "./sms.js";
import dayjs from "dayjs";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
    },
  });

  return notification;
}

export async function notifyBookingCreated(params: {
  clientId: string;
  practitionerId: string;
  treatmentName: string;
  startsAt: Date;
}) {
  const time = params.startsAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Notify client
  await createNotification({
    userId: params.clientId,
    type: "BOOKING_CONFIRMED",
    title: "Booking Confirmed",
    body: `Your ${params.treatmentName} appointment is confirmed for ${time}.`,
  });

  // Notify practitioner
  await createNotification({
    userId: params.practitionerId,
    type: "NEW_BOOKING",
    title: "New Booking",
    body: `New ${params.treatmentName} appointment booked for ${time}.`,
  });
}

export async function notifyBookingCancelled(params: {
  clientId: string;
  practitionerId: string;
  treatmentName: string;
  startsAt: Date;
}) {
  const time = params.startsAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await createNotification({
    userId: params.clientId,
    type: "BOOKING_CANCELLED",
    title: "Booking Cancelled",
    body: `Your ${params.treatmentName} appointment for ${time} has been cancelled.`,
  });

  await createNotification({
    userId: params.practitionerId,
    type: "BOOKING_CANCELLED",
    title: "Booking Cancelled",
    body: `${params.treatmentName} appointment for ${time} has been cancelled.`,
  });
}

// --- Templated notification sending ---

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function sendTemplatedNotification(params: {
  type: string;
  clientEmail: string | null;
  clientPhone: string | null;
  vars: Record<string, string>;
}) {
  const { type, clientEmail, clientPhone, vars } = params;

  const [emailTpl, smsTpl] = await Promise.all([
    clientEmail
      ? prisma.notificationTemplate.findUnique({ where: { type_channel: { type: type as any, channel: "EMAIL" } } })
      : null,
    clientPhone
      ? prisma.notificationTemplate.findUnique({ where: { type_channel: { type: type as any, channel: "SMS" } } })
      : null,
  ]);

  await Promise.all([
    emailTpl?.isActive && clientEmail
      ? sendEmail({
          to: clientEmail,
          subject: emailTpl.subject ? renderTemplate(emailTpl.subject, vars) : "Message from the clinic",
          html: renderTemplate(emailTpl.body, vars).replace(/\n/g, "<br>"),
        }).catch((e) => console.error(`[NOTIFY] Email send error (${type}):`, e))
      : null,
    smsTpl?.isActive && clientPhone
      ? sendSms({
          to: clientPhone,
          body: renderTemplate(smsTpl.body, vars),
        }).catch((e) => console.error(`[NOTIFY] SMS send error (${type}):`, e))
      : null,
  ]);
}

// Build standard vars from appointment data
export function buildAppointmentVars(params: {
  clientName: string;
  treatmentName: string;
  practitionerName: string;
  startsAt: Date;
  clinicName?: string;
  amount?: number;
}): Record<string, string> {
  return {
    name: params.clientName,
    treatment: params.treatmentName,
    practitioner: params.practitionerName,
    date: dayjs(params.startsAt).format("dddd, D MMMM YYYY"),
    time: dayjs(params.startsAt).format("HH:mm"),
    clinic: params.clinicName ?? "Dr Skin Central",
    amount: params.amount !== undefined ? (params.amount / 100).toFixed(2) : "0.00",
  };
}
