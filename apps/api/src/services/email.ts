// Email service — SendGrid integration
// In dev mode, logs emails to console

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

const SITE_URL = process.env.SITE_URL ?? "https://web-five-weld-39.vercel.app";
const CLINIC_NAME = "Dr Skin Central";
const CLINIC_ADDRESS = "42 Harley Street, Ipswich, Suffolk IP1 3QH";
const CLINIC_PHONE = "+44 20 7946 0958";

function brandedWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background:#f9faf2;font-family:'Manrope',system-ui,-apple-system,sans-serif;color:#1a1c18;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9faf2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <span style="font-family:Georgia,serif;font-style:italic;font-size:24px;color:#516143;">${CLINIC_NAME}</span>
            </td>
          </tr>
          <!-- Main Content Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #c5c8bd33;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0 0;text-align:center;">
              <p style="font-size:12px;color:#75786f;margin:0 0 8px 0;">${CLINIC_ADDRESS}</p>
              <p style="font-size:12px;color:#75786f;margin:0 0 8px 0;">${CLINIC_PHONE}</p>
              <p style="font-size:11px;color:#c5c8bd;margin:16px 0 0 0;">&copy; ${new Date().getFullYear()} ${CLINIC_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#516143;color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.5px;">${text}</a>`;
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
      from: { email: process.env.FROM_EMAIL ?? "noreply@clinic.com", name: CLINIC_NAME },
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
    subject: `Booking Confirmed — ${CLINIC_NAME}`,
    html: brandedWrapper(`
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 8px 0;color:#1a1c18;">
        Booking <em>Confirmed</em>
      </h1>
      <p style="color:#75786f;font-size:14px;margin:0 0 24px 0;">Hi ${params.clientName}, your appointment is booked.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4ec;border-radius:12px;padding:20px;margin:0 0 24px 0;">
        <tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Treatment</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">${params.treatmentName}</td></tr>
        <tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Practitioner</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">${params.practitionerName}</td></tr>
        <tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Date &amp; Time</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">${params.dateTime}</td></tr>
        ${params.depositAmount ? `<tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Deposit Paid</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">&pound;${(params.depositAmount / 100).toFixed(2)}</td></tr>` : ""}
      </table>

      <p style="color:#75786f;font-size:13px;margin:0;">If you need to reschedule or cancel, please contact us or manage your booking online.</p>
    `),
  });
}

export async function sendAccountInviteEmail(params: {
  to: string;
  clientName: string;
  treatmentName: string;
  practitionerName: string;
  dateTime: string;
  inviteToken: string;
}) {
  const inviteUrl = `${SITE_URL}/register?email=${encodeURIComponent(params.to)}&token=${params.inviteToken}`;

  await sendEmail({
    to: params.to,
    subject: `Create Your Account — ${CLINIC_NAME}`,
    html: brandedWrapper(`
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 8px 0;color:#1a1c18;">
        Welcome to <em>${CLINIC_NAME}</em>
      </h1>
      <p style="color:#75786f;font-size:14px;margin:0 0 24px 0;">
        Hi ${params.clientName}, your ${params.treatmentName} with ${params.practitionerName} on ${params.dateTime} is confirmed.
      </p>

      <p style="font-size:14px;margin:0 0 8px 0;font-weight:600;color:#1a1c18;">Create an account to:</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
        <tr><td style="padding:4px 0;font-size:13px;color:#75786f;">&#10003;&nbsp;&nbsp;Manage and reschedule your appointments</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#75786f;">&#10003;&nbsp;&nbsp;Earn loyalty points on every visit</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#75786f;">&#10003;&nbsp;&nbsp;Access exclusive member offers</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#75786f;">&#10003;&nbsp;&nbsp;Complete forms online before your visit</td></tr>
      </table>

      <div style="text-align:center;margin:32px 0;">
        ${ctaButton("Create Your Account", inviteUrl)}
      </div>

      <p style="color:#c5c8bd;font-size:11px;margin:24px 0 0 0;text-align:center;">This link expires in 7 days. If you didn't book this appointment, please ignore this email.</p>
    `),
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
    subject: `Please Complete: ${params.formName} — ${CLINIC_NAME}`,
    html: brandedWrapper(`
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 8px 0;color:#1a1c18;">
        Form <em>Required</em>
      </h1>
      <p style="color:#75786f;font-size:14px;margin:0 0 24px 0;">Hi ${params.clientName}, please complete the following form before your appointment:</p>
      <p style="font-size:16px;font-weight:600;margin:0 0 24px 0;">${params.formName}</p>
      <div style="text-align:center;margin:32px 0;">
        ${ctaButton("Complete Form", params.formUrl)}
      </div>
    `),
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
    subject: `Appointment Reminder — ${CLINIC_NAME}`,
    html: brandedWrapper(`
      <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;margin:0 0 8px 0;color:#1a1c18;">
        Appointment <em>Reminder</em>
      </h1>
      <p style="color:#75786f;font-size:14px;margin:0 0 24px 0;">Hi ${params.clientName}, this is a reminder of your upcoming appointment:</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4ec;border-radius:12px;padding:20px;margin:0 0 24px 0;">
        <tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Treatment</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">${params.treatmentName}</td></tr>
        <tr><td style="padding:8px 20px;font-size:13px;color:#75786f;">Date &amp; Time</td><td style="padding:8px 20px;font-size:14px;font-weight:600;text-align:right;">${params.dateTime}</td></tr>
      </table>

      <p style="color:#75786f;font-size:13px;margin:0;">We look forward to seeing you. If you need to reschedule, please contact us.</p>
    `),
  });
}
