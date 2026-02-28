import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  BillingConfigurationError,
  StripeApiError,
  createStripeCheckoutSession,
  ensureStripeCustomer,
  resolveAppBaseUrl,
} from "@/lib/stripe-billing";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        planType: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.planType === "pro") {
      return NextResponse.json(
        { error: "User already has an active Pro plan" },
        { status: 409 }
      );
    }

    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: user.email,
      name: user.name,
      stripeCustomerId: user.stripeCustomerId,
    });

    if (customerId !== user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = resolveAppBaseUrl(request);
    const successUrl = new URL("/settings?billing=success", baseUrl).toString();
    const cancelUrl = new URL("/settings?billing=cancel", baseUrl).toString();

    const checkoutUrl = await createStripeCheckoutSession({
      customerId,
      successUrl,
      cancelUrl,
      userId: user.id,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof StripeApiError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
