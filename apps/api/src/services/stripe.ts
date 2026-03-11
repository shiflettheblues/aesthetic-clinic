import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Stripe client — will be null if no key configured (dev mode)
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export async function createPaymentIntent(params: {
  amountCents: number;
  currency?: string;
  metadata?: Record<string, string>;
}) {
  if (!stripe) {
    // Dev mode: return mock intent
    return {
      id: `mock_pi_${Date.now()}`,
      client_secret: `mock_secret_${Date.now()}`,
      amount: params.amountCents,
      status: "requires_payment_method" as const,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: params.amountCents,
    currency: params.currency ?? "gbp",
    metadata: params.metadata,
  });

  return {
    id: intent.id,
    client_secret: intent.client_secret,
    amount: intent.amount,
    status: intent.status,
  };
}

export async function refundPayment(paymentIntentId: string, amountCents?: number) {
  if (!stripe) {
    return { id: `mock_refund_${Date.now()}`, status: "succeeded" as const };
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });

  return { id: refund.id, status: refund.status };
}

export function constructWebhookEvent(body: string | Buffer, signature: string) {
  if (!stripe) throw new Error("Stripe not configured");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  return stripe.webhooks.constructEvent(body, signature, endpointSecret);
}
