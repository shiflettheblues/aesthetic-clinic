import { prisma } from "../lib/prisma.js";
import crypto from "crypto";

interface SubscribeParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tags?: string[];
}

async function getMailchimpConfig(): Promise<{ apiKey: string; audienceId: string; serverPrefix: string } | null> {
  const config = await prisma.integrationConfig.findUnique({
    where: { provider: "mailchimp" },
  });

  if (!config?.isEnabled || !config.credentials) return null;

  const creds = config.credentials as Record<string, string>;
  const apiKey = creds.apiKey;
  const audienceId = creds.audienceId;

  if (!apiKey || !audienceId) return null;

  // Mailchimp API keys end with -usXX (the data center)
  const serverPrefix = apiKey.split("-").pop() ?? "us1";

  return { apiKey, audienceId, serverPrefix };
}

export async function subscribeContact(params: SubscribeParams): Promise<void> {
  const config = await getMailchimpConfig();
  if (!config) {
    console.log(`[MAILCHIMP] Not configured — skipping subscribe for ${params.email}`);
    return;
  }

  const { apiKey, audienceId, serverPrefix } = config;
  const subscriberHash = crypto.createHash("md5").update(params.email.toLowerCase()).digest("hex");
  const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}`;

  try {
    const response = await fetch(url, {
      method: "PUT", // PUT = add or update
      headers: {
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: params.email,
        status_if_new: "subscribed",
        merge_fields: {
          FNAME: params.firstName,
          LNAME: params.lastName,
          ...(params.phone ? { PHONE: params.phone } : {}),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[MAILCHIMP] Subscribe error ${response.status}: ${text}`);
      return;
    }

    // Add tags if provided
    if (params.tags && params.tags.length > 0) {
      const tagsUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash}/tags`;
      await fetch(tagsUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tags: params.tags.map((name) => ({ name, status: "active" })),
        }),
      });
    }

    console.log(`[MAILCHIMP] Subscribed ${params.email} with tags: ${params.tags?.join(", ") ?? "none"}`);
  } catch (err) {
    console.error(`[MAILCHIMP] Failed to subscribe ${params.email}:`, err);
  }
}

export async function syncAllClients(): Promise<{ synced: number; errors: number }> {
  const config = await getMailchimpConfig();
  if (!config) {
    console.log("[MAILCHIMP] Not configured — skipping sync");
    return { synced: 0, errors: 0 };
  }

  const { apiKey, audienceId, serverPrefix } = config;
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT", isArchived: false },
    select: { email: true, firstName: true, lastName: true, phone: true },
  });

  let synced = 0;
  let errors = 0;

  // Mailchimp batch operations (up to 500 per request)
  const batchSize = 500;
  for (let i = 0; i < clients.length; i += batchSize) {
    const batch = clients.slice(i, i + batchSize);
    const operations = batch.map((c) => ({
      method: "PUT" as const,
      path: `/lists/${audienceId}/members/${crypto.createHash("md5").update(c.email.toLowerCase()).digest("hex")}`,
      body: JSON.stringify({
        email_address: c.email,
        status_if_new: "subscribed",
        merge_fields: {
          FNAME: c.firstName,
          LNAME: c.lastName,
          ...(c.phone ? { PHONE: c.phone } : {}),
        },
      }),
    }));

    try {
      const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/batches`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operations }),
      });

      if (response.ok) {
        synced += batch.length;
      } else {
        errors += batch.length;
        console.error(`[MAILCHIMP] Batch sync error: ${response.status}`);
      }
    } catch (err) {
      errors += batch.length;
      console.error("[MAILCHIMP] Batch sync failed:", err);
    }
  }

  return { synced, errors };
}
