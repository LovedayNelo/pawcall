import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const PROVIDER_CHARGE_CENTS = 30;

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}

const isDev = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_mock";

interface CreatePaymentIntentOpts {
  amountCents: number;
  currency: string;
  consultId: string;
  ownerId: string;
  platformFeeCents?: number;
}

export async function createPaymentIntent(opts: CreatePaymentIntentOpts): Promise<{
  clientSecret: string;
  paymentIntentId: string;
}> {
  if (isDev) {
    const mockId = `pi_mock_${Date.now()}`;
    return {
      clientSecret: `${mockId}_secret_mock`,
      paymentIntentId: mockId,
    };
  }

  const stripe = getStripe();

  const intent = await stripe.paymentIntents.create({
    amount: opts.amountCents,
    currency: opts.currency,
    setup_future_usage: "off_session",
    automatic_payment_methods: { enabled: true },
    metadata: {
      consultId: opts.consultId,
      ownerId: opts.ownerId,
      providerChargeCents: String(PROVIDER_CHARGE_CENTS),
    },
  });

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

export async function confirmPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string,
): Promise<{ success: boolean; status: string }> {
  if (isDev) {
    return { success: true, status: "succeeded" };
  }

  const stripe = getStripe();

  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethodId,
  });

  return {
    success: confirmed.status === "succeeded" || confirmed.status === "processing" || confirmed.status === "requires_capture",
    status: confirmed.status,
  };
}

export async function handleStripeWebhook(req: NextRequest, tenantDatabaseUrl: string): Promise<NextResponse> {
  const { getTenantPrisma } = await import("@/lib/db/prisma");
  const prisma = getTenantPrisma(tenantDatabaseUrl);

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (isDev) {
    return NextResponse.json({ received: true });
  }

  if (!sig || !webhookSecret) {
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const stripe = getStripe();
  const buf = await req.arrayBuffer();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err instanceof Error ? err.message : "Unknown error");
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const consultId = intent.metadata?.consultId;

    if (consultId) {
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: "CAPTURED" },
      });
      await prisma.consult.update({
        where: { id: consultId },
        data: { status: "QUEUED" },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const consultId = intent.metadata?.consultId;

    if (consultId) {
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: "FAILED" },
      });
      await prisma.consult.update({
        where: { id: consultId },
        data: { status: "CANCELLED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}

export { isDev };