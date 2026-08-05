import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/payments/stripe";

export const POST = async (req: NextRequest) => {
  return handleStripeWebhook(req);
};

export const GET = async () => {
  return NextResponse.json({ message: "Stripe webhook endpoint. POST events here." });
};

export const dynamic = "force-dynamic";
