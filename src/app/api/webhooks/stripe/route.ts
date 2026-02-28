import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { BillingConfigurationError } from "@/lib/stripe-billing";
import {
  isProStripeSubscriptionStatus,
  parseStripeWebhookEvent,
  StripeWebhookPayloadError,
  StripeWebhookSignatureError,
  verifyStripeWebhookSignature,
} from "@/lib/stripe-webhook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

const getStripeWebhookSecret = () => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new BillingConfigurationError("Missing STRIPE_WEBHOOK_SECRET");
  }
  return webhookSecret;
};

const asObject = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length > 0) {
    return typeof value === "string" ? value : null;
  }
  return null;
};

const readBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const readIdLike = (value: unknown): string | null => {
  const direct = readString(value);
  if (direct) {
    return direct;
  }

  const object = asObject(value);
  return object ? readString(object.id) : null;
};

const readMetadataUserId = (source: JsonObject) => {
  const metadata = asObject(source.metadata);
  return metadata ? readString(metadata.userId) : null;
};

const findUserForStripeEvent = async ({
  metadataUserId,
  customerId,
  subscriptionId,
}: {
  metadataUserId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
}) => {
  if (metadataUserId) {
    const byId = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (byId) {
      return byId;
    }
  }

  if (customerId) {
    const byCustomerId = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (byCustomerId) {
      return byCustomerId;
    }
  }

  if (subscriptionId) {
    const bySubscriptionId = await prisma.user.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (bySubscriptionId) {
      return bySubscriptionId;
    }
  }

  return null;
};

const handleSubscriptionEvent = async (eventObject: JsonObject) => {
  const customerId = readIdLike(eventObject.customer);
  const subscriptionId = readString(eventObject.id);
  const status = readString(eventObject.status);
  const currentPeriodEndUnix = readNumber(eventObject.current_period_end);
  const cancelAtPeriodEnd = readBoolean(eventObject.cancel_at_period_end) ?? false;
  const metadataUserId = readMetadataUserId(eventObject);

  if (!status || !subscriptionId) {
    return { processed: false, reason: "subscription payload missing status or id" as const };
  }

  const user = await findUserForStripeEvent({
    metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!user) {
    return { processed: false, reason: "no user matched Stripe subscription payload" as const };
  }

  const periodEnd =
    currentPeriodEndUnix !== null ? new Date(Math.trunc(currentPeriodEndUnix) * 1000) : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      planType: isProStripeSubscriptionStatus(status) ? "pro" : "free",
      stripeCustomerId: customerId ?? user.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
      stripeSubscriptionStatus: status,
      billingCurrentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
    },
  });

  return { processed: true as const };
};

const handleCheckoutCompletedEvent = async (eventObject: JsonObject) => {
  const mode = readString(eventObject.mode);
  if (mode !== "subscription") {
    return { processed: false, reason: "checkout mode is not subscription" as const };
  }

  const customerId = readIdLike(eventObject.customer);
  const subscriptionId = readIdLike(eventObject.subscription);
  const metadataUserId =
    readString(eventObject.client_reference_id) ?? readMetadataUserId(eventObject);

  const user = await findUserForStripeEvent({
    metadataUserId,
    customerId,
    subscriptionId,
  });

  if (!user) {
    return { processed: false, reason: "no user matched checkout session payload" as const };
  }

  if (!customerId && !subscriptionId) {
    return { processed: false, reason: "checkout payload missing customer and subscription ids" as const };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customerId ?? user.stripeCustomerId,
      stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId,
    },
  });

  return { processed: true as const };
};

const processStripeEvent = async ({
  eventType,
  eventObject,
}: {
  eventType: string;
  eventObject: JsonObject;
}) => {
  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionEvent(eventObject);
    case "checkout.session.completed":
      return handleCheckoutCompletedEvent(eventObject);
    default:
      return { processed: false, reason: "event type is ignored" as const };
  }
};

const createOrLoadEventRecord = async ({
  eventId,
  eventType,
  payload,
}: {
  eventId: string;
  eventType: string;
  payload: JsonObject;
}) => {
  try {
    return await prisma.stripeWebhookEvent.create({
      data: {
        eventId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.stripeWebhookEvent.findUnique({
        where: { eventId },
      });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const signatureHeader = request.headers.get("stripe-signature");
    if (!signatureHeader) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const rawBody = await request.text();
    verifyStripeWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret: getStripeWebhookSecret(),
    });

    const event = parseStripeWebhookEvent(rawBody);
    const eventRecord = await createOrLoadEventRecord({
      eventId: event.id,
      eventType: event.type,
      payload: JSON.parse(rawBody) as JsonObject,
    });

    if (eventRecord.processedAt) {
      return NextResponse.json({
        received: true,
        idempotent: true,
        reason: "event already processed",
      });
    }

    const result = await processStripeEvent({
      eventType: event.type,
      eventObject: event.data.object,
    });

    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date() },
    });

    return NextResponse.json({
      received: true,
      processed: result.processed,
      reason: result.processed ? null : result.reason,
    });
  } catch (error) {
    if (error instanceof BillingConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof StripeWebhookSignatureError || error instanceof StripeWebhookPayloadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error handling Stripe webhook:", error);
    return NextResponse.json({ error: "Failed to process Stripe webhook" }, { status: 500 });
  }
}
