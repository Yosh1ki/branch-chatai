import test from "node:test";
import assert from "node:assert/strict";
import {
  BillingConfigurationError,
  StripeApiError,
  createStripeCheckoutSession,
  createStripePortalSession,
  ensureStripeCustomer,
  resolveAppBaseUrl,
} from "../src/lib/stripe-billing.ts";

const withEnv = async (values, callback) => {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test("ensureStripeCustomer returns existing customer id without API call", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("fetch should not be called");
  };

  try {
    const customerId = await ensureStripeCustomer({
      userId: "user-1",
      stripeCustomerId: "cus_existing",
    });

    assert.equal(customerId, "cus_existing");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createStripeCheckoutSession creates subscription checkout session", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = "";

  globalThis.fetch = async (_url, init = {}) => {
    capturedBody = String(init.body ?? "");
    return new Response(JSON.stringify({ id: "cs_test", url: "https://checkout.stripe.test/session" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    await withEnv(
      {
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_PRICE_ID_PRO: "price_pro_123",
      },
      async () => {
        const url = await createStripeCheckoutSession({
          customerId: "cus_123",
          successUrl: "http://localhost:3000/settings?billing=success",
          cancelUrl: "http://localhost:3000/settings?billing=cancel",
          userId: "user-1",
        });

        assert.equal(url, "https://checkout.stripe.test/session");
        assert.match(capturedBody, /mode=subscription/);
        assert.match(capturedBody, /customer=cus_123/);
        assert.match(capturedBody, /line_items%5B0%5D%5Bprice%5D=price_pro_123/);
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createStripePortalSession throws StripeApiError when Stripe rejects request", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "customer not found" } }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });

  try {
    await withEnv(
      {
        STRIPE_SECRET_KEY: "sk_test_123",
      },
      async () => {
        await assert.rejects(
          () =>
            createStripePortalSession({
              customerId: "cus_missing",
              returnUrl: "http://localhost:3000/settings",
            }),
          (error) => {
            assert.ok(error instanceof StripeApiError);
            assert.equal(error.message, "customer not found");
            assert.equal(error.statusCode, 404);
            return true;
          }
        );
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveAppBaseUrl prefers AUTH_URL and validates it", async () => {
  await withEnv({ AUTH_URL: "https://branch.example.com/some/path", NEXTAUTH_URL: null }, async () => {
    const baseUrl = resolveAppBaseUrl(new Request("http://localhost:3000/api/billing/checkout"));
    assert.equal(baseUrl, "https://branch.example.com");
  });

  await withEnv({ AUTH_URL: "invalid-url" }, async () => {
    assert.throws(
      () => resolveAppBaseUrl(new Request("http://localhost:3000/api/billing/checkout")),
      BillingConfigurationError
    );
  });
});
