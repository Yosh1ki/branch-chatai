-- Create enum for user plan type
CREATE TYPE "PlanType" AS ENUM ('free', 'pro');

-- Add billing state fields and migrate plan_type to enum
ALTER TABLE "users"
  ADD COLUMN "stripe_subscription_status" TEXT,
  ADD COLUMN "billing_current_period_end" TIMESTAMP(3),
  ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "plan_type" DROP DEFAULT,
  ALTER COLUMN "plan_type" TYPE "PlanType" USING ("plan_type"::"PlanType"),
  ALTER COLUMN "plan_type" SET DEFAULT 'free';

-- Store processed Stripe webhook events for idempotency
CREATE TABLE "stripe_webhook_events" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_event_id_key" ON "stripe_webhook_events"("event_id");
