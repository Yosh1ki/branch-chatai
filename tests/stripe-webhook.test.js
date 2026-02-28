import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  isProStripeSubscriptionStatus,
  parseStripeWebhookEvent,
  StripeWebhookPayloadError,
  StripeWebhookSignatureError,
  verifyStripeWebhookSignature,
} from "../src/lib/stripe-webhook.ts";

const WEBHOOK_SECRET = "whsec_test_secret";
const FIXED_TIMESTAMP = 1700000000;

const createSignatureHeader = (rawBody, timestamp = FIXED_TIMESTAMP) => {
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
};

test("verifyStripeWebhookSignature accepts a valid Stripe signature", () => {
  const rawBody = JSON.stringify({
    id: "evt_123",
    type: "customer.subscription.updated",
    data: { object: { id: "sub_123" } },
  });

  assert.doesNotThrow(() =>
    verifyStripeWebhookSignature({
      rawBody,
      signatureHeader: createSignatureHeader(rawBody),
      webhookSecret: WEBHOOK_SECRET,
      nowUnixSeconds: FIXED_TIMESTAMP + 10,
      toleranceSeconds: 300,
    })
  );
});

test("verifyStripeWebhookSignature rejects an invalid Stripe signature", () => {
  const rawBody = JSON.stringify({
    id: "evt_456",
    type: "checkout.session.completed",
    data: { object: { id: "cs_123" } },
  });

  assert.throws(
    () =>
      verifyStripeWebhookSignature({
        rawBody,
        signatureHeader: `t=${FIXED_TIMESTAMP},v1=invalid`,
        webhookSecret: WEBHOOK_SECRET,
        nowUnixSeconds: FIXED_TIMESTAMP,
      }),
    StripeWebhookSignatureError
  );
});

test("verifyStripeWebhookSignature rejects expired timestamps", () => {
  const rawBody = JSON.stringify({
    id: "evt_789",
    type: "customer.subscription.created",
    data: { object: { id: "sub_789" } },
  });

  assert.throws(
    () =>
      verifyStripeWebhookSignature({
        rawBody,
        signatureHeader: createSignatureHeader(rawBody),
        webhookSecret: WEBHOOK_SECRET,
        nowUnixSeconds: FIXED_TIMESTAMP + 1000,
        toleranceSeconds: 300,
      }),
    StripeWebhookSignatureError
  );
});

test("parseStripeWebhookEvent parses minimal valid event payload", () => {
  const parsed = parseStripeWebhookEvent(
    JSON.stringify({
      id: "evt_123",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_123", status: "active" } },
    })
  );

  assert.equal(parsed.id, "evt_123");
  assert.equal(parsed.type, "customer.subscription.updated");
  assert.equal(parsed.data.object.id, "sub_123");
});

test("parseStripeWebhookEvent throws when payload lacks event id", () => {
  assert.throws(
    () =>
      parseStripeWebhookEvent(
        JSON.stringify({
          type: "customer.subscription.updated",
          data: { object: { id: "sub_123" } },
        })
      ),
    StripeWebhookPayloadError
  );
});

test("isProStripeSubscriptionStatus only treats active and trialing as pro", () => {
  assert.equal(isProStripeSubscriptionStatus("active"), true);
  assert.equal(isProStripeSubscriptionStatus("trialing"), true);
  assert.equal(isProStripeSubscriptionStatus("past_due"), false);
  assert.equal(isProStripeSubscriptionStatus("canceled"), false);
  assert.equal(isProStripeSubscriptionStatus(null), false);
});
