// SMS service — placeholder for Twilio integration
// In dev mode, logs SMS to console

interface SmsParams {
  to: string;
  body: string;
}

export async function sendSms(params: SmsParams): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS] To: ${params.to} | Body: ${params.body}`);
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: params.to,
        From: fromNumber,
        Body: params.body,
      }),
    }
  );

  if (!response.ok) {
    console.error(`[SMS] Twilio error: ${response.status} ${await response.text()}`);
  }
}

export async function sendAppointmentReminderSms(params: {
  to: string;
  clientName: string;
  treatmentName: string;
  dateTime: string;
}) {
  await sendSms({
    to: params.to,
    body: `Hi ${params.clientName}, reminder: ${params.treatmentName} on ${params.dateTime}. Aesthetic Clinic`,
  });
}
