type StripeJsonObject = Record<string, unknown>;

export class BillingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingConfigurationError";
  }
}

export class StripeApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "StripeApiError";
    this.statusCode = statusCode;
  }
}

const STRIPE_API_BASE_URL = "https://api.stripe.com/v1";
const DEFAULT_BILLING_RETURN_PATH = "/chats";

const getStripeSecretKey = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new BillingConfigurationError("Missing STRIPE_SECRET_KEY");
  }
  return secretKey;
};

export const getStripeProPriceId = () => {
  const priceId =
    process.env.STRIPE_PRICE_ID_PRO ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO;

  if (!priceId) {
    throw new BillingConfigurationError(
      "Missing STRIPE_PRICE_ID_PRO (or NEXT_PUBLIC_STRIPE_PRICE_ID_PRO)"
    );
  }

  return priceId;
};

const asStripeJsonObject = (value: unknown): StripeJsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as StripeJsonObject;
};

const readStripeErrorMessage = (payload: unknown): string | null => {
  const parsed = asStripeJsonObject(payload);
  const errorPayload = asStripeJsonObject(parsed?.error);
  const message = errorPayload?.message;

  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  return null;
};

const postStripeForm = async (path: string, body: URLSearchParams) => {
  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      readStripeErrorMessage(payload) ?? `Stripe API request failed with ${response.status}`;
    throw new StripeApiError(message, response.status);
  }

  const parsed = asStripeJsonObject(payload);
  if (!parsed) {
    throw new StripeApiError("Stripe API returned an invalid response payload", 502);
  }

  return parsed;
};

const readId = (payload: StripeJsonObject, fieldName: string) => {
  const value = payload[fieldName];
  if (typeof value !== "string" || value.length === 0) {
    throw new StripeApiError(`Stripe API response is missing ${fieldName}`, 502);
  }
  return value;
};

export const ensureStripeCustomer = async ({
  userId,
  email,
  name,
  stripeCustomerId,
}: {
  userId: string;
  email?: string | null;
  name?: string | null;
  stripeCustomerId?: string | null;
}) => {
  if (stripeCustomerId) {
    return stripeCustomerId;
  }

  const body = new URLSearchParams();
  body.append("metadata[userId]", userId);
  if (email) {
    body.append("email", email);
  }
  if (name) {
    body.append("name", name);
  }

  const customer = await postStripeForm("/customers", body);
  return readId(customer, "id");
};

export const createStripeCheckoutSession = async ({
  customerId,
  successUrl,
  cancelUrl,
  userId,
}: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}) => {
  const body = new URLSearchParams();
  body.append("mode", "subscription");
  body.append("customer", customerId);
  body.append("line_items[0][price]", getStripeProPriceId());
  body.append("line_items[0][quantity]", "1");
  body.append("success_url", successUrl);
  body.append("cancel_url", cancelUrl);
  body.append("client_reference_id", userId);
  body.append("subscription_data[metadata][userId]", userId);

  const session = await postStripeForm("/checkout/sessions", body);
  return readId(session, "url");
};

export const createStripePortalSession = async ({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) => {
  const body = new URLSearchParams();
  body.append("customer", customerId);
  body.append("return_url", returnUrl);

  const session = await postStripeForm("/billing_portal/sessions", body);
  return readId(session, "url");
};

export const normalizeBillingReturnPath = (requestedPath: unknown) => {
  if (typeof requestedPath !== "string") {
    return DEFAULT_BILLING_RETURN_PATH;
  }

  const trimmedPath = requestedPath.trim();
  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return DEFAULT_BILLING_RETURN_PATH;
  }

  try {
    const parsedUrl = new URL(trimmedPath, "https://branch.local");
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return DEFAULT_BILLING_RETURN_PATH;
  }
};

export const resolveAppBaseUrl = (request: Request) => {
  const envBaseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envBaseUrl) {
    try {
      return new URL(envBaseUrl).origin;
    } catch {
      throw new BillingConfigurationError("AUTH_URL or NEXTAUTH_URL is not a valid URL");
    }
  }

  return new URL(request.url).origin;
};
