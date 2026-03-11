// Email service — placeholder for SendGrid integration
// In dev mode, logs emails to console

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.log(`[EMAIL] To: ${params.to} | Subject: ${params.subject}`);
    console.log(`[EMAIL] Body: ${params.html.slice(0, 200)}...`);
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: process.env.FROM_EMAIL ?? "noreply@clinic.com", name: "Aesthetic Clinic" },
      subject: params.subject,
      content: [{ type: "text/html", value: params.html }],
    }),
  });

  if (!response.ok) {
    console.error(`[EMAIL] SendGrid error: ${response.status} ${await response.text()}`);
  }
}

export async function sendBookingConfirmation(params: {
  to: string;
  clientName: string;
  treatmentName: string;
  practitionerName: string;
  dateTime: string;
  depositAmount?: number;
}) {
  await sendEmail({
    to: params.to,
    subject: "Booking Confirmation - Aesthetic Clinic",
    html: `
      <h2>Booking Confirmed</h2>
      <p>Hi ${params.clientName},</p>
      <p>Your appointment has been confirmed:</p>
      <ul>
        <li><strong>Treatment:</strong> ${params.treatmentName}</li>
        <li><strong>Practitioner:</strong> ${params.practitionerName}</li>
        <li><strong>Date & Time:</strong> ${params.dateTime}</li>
        ${params.depositAmount ? `<li><strong>Deposit Paid:</strong> &pound;${(params.depositAmount / 100).toFixed(2)}</li>` : ""}
      </ul>
      <p>If you need to reschedule or cancel, please contact us.</p>
      <p>Aesthetic Clinic</p>
    `,
  });
}

export async function sendFormRequest(params: {
  to: string;
  clientName: string;
  formName: string;
  formUrl: string;
}) {
  await sendEmail({
    to: params.to,
    subject: `Please Complete: ${params.formName} - Aesthetic Clinic`,
    html: `
      <h2>Form Required</h2>
      <p>Hi ${params.clientName},</p>
      <p>Please complete the following form before your appointment:</p>
      <p><strong>${params.formName}</strong></p>
      <p><a href="${params.formUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Complete Form</a></p>
      <p>Aesthetic Clinic</p>
    `,
  });
}

export async function sendAppointmentReminder(params: {
  to: string;
  clientName: string;
  treatmentName: string;
  dateTime: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Appointment Reminder - Aesthetic Clinic",
    html: `
      <h2>Appointment Reminder</h2>
      <p>Hi ${params.clientName},</p>
      <p>This is a reminder of your upcoming appointment:</p>
      <ul>
        <li><strong>Treatment:</strong> ${params.treatmentName}</li>
        <li><strong>Date & Time:</strong> ${params.dateTime}</li>
      </ul>
      <p>Aesthetic Clinic</p>
    `,
  });
}
