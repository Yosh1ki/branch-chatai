-- Add request_id for idempotency
ALTER TABLE "messages" ADD COLUMN "request_id" TEXT;
CREATE UNIQUE INDEX "messages_request_id_key" ON "messages"("request_id");
