import { prisma } from "../lib/prisma.js";

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
