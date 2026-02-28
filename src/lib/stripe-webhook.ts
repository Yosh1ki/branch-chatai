import { createHmac, timingSafeEqual } from "node:crypto";

type JsonObject = Record<string, unknown>;

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: JsonObject;
  };
};

export class StripeWebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookSignatureError";
  }
}

export class StripeWebhookPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookPayloadError";
  }
}

const asObject = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return value;
};

const parseStripeSignatureHeader = (signatureHeader: string) => {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const signaturesByVersion = new Map<string, string[]>();
  let timestamp: number | null = null;

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex);
    const value = part.slice(separatorIndex + 1);
    if (!key || !value) {
      continue;
    }

    if (key === "t") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new StripeWebhookSignatureError("Stripe signature header has invalid timestamp");
      }
      timestamp = parsed;
      continue;
    }

    const existing = signaturesByVersion.get(key) ?? [];
    existing.push(value);
    signaturesByVersion.set(key, existing);
  }

  if (!timestamp) {
    throw new StripeWebhookSignatureError("Stripe signature header is missing timestamp");
  }

  const v1Signatures = signaturesByVersion.get("v1") ?? [];
  if (v1Signatures.length === 0) {
    throw new StripeWebhookSignatureError("Stripe signature header is missing v1 signature");
  }

  return {
    timestamp,
    v1Signatures,
  };
};

const safeEqualHex = (leftHex: string, rightHex: string) => {
  const left = Buffer.from(leftHex, "utf8");
  const right = Buffer.from(rightHex, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};

export const verifyStripeWebhookSignature = ({
  rawBody,
  signatureHeader,
  webhookSecret,
  toleranceSeconds = 300,
  nowUnixSeconds = Math.floor(Date.now() / 1000),
}: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceSeconds?: number;
  nowUnixSeconds?: number;
}) => {
  if (!webhookSecret) {
    throw new StripeWebhookSignatureError("Missing webhook secret");
  }

  const { timestamp, v1Signatures } = parseStripeSignatureHeader(signatureHeader);
  if (Math.abs(nowUnixSeconds - timestamp) > toleranceSeconds) {
    throw new StripeWebhookSignatureError("Stripe signature timestamp is outside the tolerance window");
  }

  const expectedSignature = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  const matched = v1Signatures.some((candidate) => safeEqualHex(candidate, expectedSignature));
  if (!matched) {
    throw new StripeWebhookSignatureError("Stripe signature verification failed");
  }
};

export const parseStripeWebhookEvent = (rawBody: string): StripeWebhookEvent => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    throw new StripeWebhookPayloadError("Stripe webhook payload is not valid JSON");
  }

  const payload = asObject(parsed);
  if (!payload) {
    throw new StripeWebhookPayloadError("Stripe webhook payload must be a JSON object");
  }

  const id = readString(payload.id);
  if (!id) {
    throw new StripeWebhookPayloadError("Stripe webhook payload is missing event id");
  }

  const type = readString(payload.type);
  if (!type) {
    throw new StripeWebhookPayloadError("Stripe webhook payload is missing event type");
  }

  const data = asObject(payload.data);
  const object = asObject(data?.object);
  if (!object) {
    throw new StripeWebhookPayloadError("Stripe webhook payload is missing data.object");
  }

  return {
    id,
    type,
    data: {
      object,
    },
  };
};

export const isProStripeSubscriptionStatus = (status: string | null | undefined) =>
  status === "active" || status === "trialing";
