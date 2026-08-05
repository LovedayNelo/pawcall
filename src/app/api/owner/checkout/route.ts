import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createPaymentIntent, confirmPaymentIntent } from "@/lib/payments/stripe";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { paymentId, paymentMethodId } = body;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, ownerId: session.userId },
    include: { consult: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "PENDING") return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
  if (!payment.consultId) return NextResponse.json({ error: "Missing consult" }, { status: 400 });

  // If Stripe is in dev mode, we created a mock PaymentIntent in GET
  // If Stripe is configured, create + confirm the real PaymentIntent
  const { isDev } = await import("@/lib/payments/stripe");

  if (!isDev && paymentMethodId) {
    // Create real PaymentIntent if we don't have one yet
    let stripePIId = payment.stripePaymentIntentId;
    if (!stripePIId) {
      const intent = await createPaymentIntent({
        amountCents: payment.amountCents,
        currency: payment.currency,
        consultId: payment.consultId!,
        ownerId: session.userId,
        platformFeeCents: payment.platformFeeCents,
      });
      stripePIId = intent.paymentIntentId;
      await prisma.payment.update({
        where: { id: paymentId },
        data: { stripePaymentIntentId: stripePIId },
      });
    }

    // Confirm with the card payment method
    const result = await confirmPaymentIntent(stripePIId, paymentMethodId);
    if (!result.success) {
      await prisma.consult.update({
        where: { id: payment.consultId },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }
  }

  // Update payment + consult status
  const stripePaymentIntentId = payment.stripePaymentIntentId ?? (isDev ? `pi_mock_${Date.now()}` : null);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "CAPTURED",
        stripePaymentIntentId,
      },
    }),
    prisma.consult.update({
      where: { id: payment.consultId },
      data: { status: "QUEUED" },
    }),
  ]);

  return NextResponse.json({ success: true, consultId: payment.consultId });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, ownerId: session.userId },
    include: { consult: { include: { pet: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create PaymentIntent upfront so the checkout page has a client_secret
  const stripePIId = payment.stripePaymentIntentId;
  let clientSecret: string | null = null;

  if (stripePIId && stripePIId.startsWith("pi_mock_")) {
    // Dev mode mock
    clientSecret = `${stripePIId}_secret_mock`;
  } else if (stripePIId && !stripePIId.startsWith("pi_mock_")) {
    // Real PI already exists — re-derive client secret
    const { isDev } = await import("@/lib/payments/stripe");
    if (!isDev) {
      const { Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-07-29.dahlia" });
      const intent = await stripe.paymentIntents.retrieve(stripePIId);
      clientSecret = intent.client_secret;
    }
  } else {
    // Create a new PaymentIntent
    const { isDev } = await import("@/lib/payments/stripe");
    if (!isDev) {
      const intent = await createPaymentIntent({
        amountCents: payment.amountCents,
        currency: payment.currency,
        consultId: payment.consultId!,
        ownerId: session.userId,
        platformFeeCents: payment.platformFeeCents,
      });
      clientSecret = intent.clientSecret;
      await prisma.payment.update({
        where: { id: paymentId },
        data: { stripePaymentIntentId: intent.paymentIntentId },
      });
    } else {
      const mockId = `pi_mock_${Date.now()}`;
      clientSecret = `${mockId}_secret_mock`;
      await prisma.payment.update({
        where: { id: paymentId },
        data: { stripePaymentIntentId: mockId },
      });
    }
  }

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_mock";
  return NextResponse.json({
    paymentId: payment.id,
    amountCents: payment.amountCents,
    currency: payment.currency,
    consult: payment.consult,
    stripePublishableKey: publishableKey,
    clientSecret,
  });
}

export const dynamic = "force-dynamic";
