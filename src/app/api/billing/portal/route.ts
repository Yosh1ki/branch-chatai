import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  BillingConfigurationError,
  StripeApiError,
  createStripePortalSession,
  normalizeBillingReturnPath,
  resolveAppBaseUrl,
} from "@/lib/stripe-billing";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as { returnPath?: unknown };
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer is linked to this account" },
        { status: 400 }
      );
    }

    const baseUrl = resolveAppBaseUrl(request);
    const returnPath = normalizeBillingReturnPath(payload.returnPath);
    const returnUrl = new URL(returnPath, baseUrl);
    returnUrl.searchParams.set("settings", "open");
    const portalUrl = await createStripePortalSession({
      customerId: user.stripeCustomerId,
      returnUrl: returnUrl.toString(),
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof StripeApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Error creating Stripe billing portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
