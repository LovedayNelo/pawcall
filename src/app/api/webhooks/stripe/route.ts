import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/payments/stripe";
import { resolveTenantFromHeaders } from "@/lib/tenant/context";

export const POST = async (req: NextRequest) => {
  const tenant = await resolveTenantFromHeaders();
  if (!tenant?.databaseUrl) {
    return NextResponse.json({ error: "Unknown tenant" }, { status: 404 });
  }
  return handleStripeWebhook(req, tenant.databaseUrl);
};

export const GET = async () => {
  return NextResponse.json({ message: "Stripe webhook endpoint. POST events here." });
};

export const dynamic = "force-dynamic";
