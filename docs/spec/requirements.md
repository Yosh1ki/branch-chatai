# Functional Requirements

## Core Features
- **Multi-branching chat:** After each assistant reply the UI asks whether to cut a branch, surfaces playful prompts, stores the branch inside the tree structure, and lets users fold any message so only the auto-generated inline title remains.
- **Mind-map visualization:** The base chat scrolls vertically while related branches expand horizontally beside their source message and can be explored with both lateral scrolling and a minimap.
- **Automatic titling:** Every chat receives an auto-generated title in the chat language, and each message also gets an inline title used for collapsed states.
- **Model selection:** Users can select ChatGPT, Claude, or Gemini for a chat (branch-level switching is future scope); the system records provider and model metadata with each message.
- **Mini map:** A minimap in the upper-right highlights the current viewport and lets users click a node to jump to that branch within the chat.
- **Authentication and plans:** Google OAuth is the only login method for the MVP, and authenticated users are tied to Stripe customer IDs for Pro billing. Plans include Free (5 messages/day, 60,000 tokens/month, branching enabled) and Pro (unlimited messages, 150,000 tokens/week, 650,000 tokens per rolling 30-day window, Stripe subscription).
- **Data persistence:** Chats, messages (including parent-child relationships, provider info, collapse state, and usage stats), plus per-request usage events with measured input/output tokens, are stored per the defined PostgreSQL/Prisma schema so quotas and branching can be enforced.
- **Stripe billing (MVP scope):** Billing uses a single monthly Pro subscription (no annual plan, no trial). Free users can start checkout from the settings modal, and Pro users can open a billing portal there to manage cancellation and payment methods.
- **Plan entitlement rules:** Users are treated as Pro only while Stripe subscription status is `active` or `trialing`; all other states are treated as Free for quota enforcement.
- **Cancellation behavior:** Cancellation is period-end only (`cancel_at_period_end=true`), and Pro entitlement remains until the billing period actually ends.
- **Webhook-driven state sync:** Plan state is updated from Stripe webhook events, and webhook handling must be idempotent to avoid duplicate updates.

## Non-Goals
- Not specified in the current spec.

## User Flows
- **Send chat & receive response:** User input is posted to `/api/chat`, LangChain/LangGraph calls the chosen LLM, saves the new message plus usage stats, and streams or returns the reply to the UI for rendering.
- **Branch creation:** Selecting “branch” on any message triggers `POST /api/messages/{id}/branch`, which stores a new child message with `parent_message_id`, then returns identifiers so the frontend can draw the new branch.
- **Login and chat retrieval:** After Google OAuth succeeds the frontend calls `GET /api/chats` with the bearer token, the API queries chats for that user, and the UI shows the list before drilling into `/chats/[id]`.
- **Quota enforcement:** `/api/chat` checks the authenticated user's current-plan limits before processing any new-chat, normal-chat, or branch-chat send. Free users are blocked when either the 5-message daily cap or the 60,000-token monthly cap is exhausted. Pro users are blocked when either the 150,000-token weekly cap or the 650,000-token rolling 30-day cap is exhausted.
- **Measured token accounting:** Token limits use provider-reported usage totals for input plus output tokens, captured from the underlying model API response for each completed request.
- **Quota messaging:** The chats landing page and in-chat composer both disable sending when the current plan is blocked, show Free remaining-message and remaining-token counters, display warning copy near 80% and 95% token usage, and show Pro reset timing for weekly-limit blocks.
- **Upgrade to Pro:** From the settings modal in chats, a Free user triggers `POST /api/billing/checkout`; the API creates a Stripe Checkout session and redirects the user to Stripe-hosted checkout.
- **Manage existing subscription:** From the settings modal in chats, a Pro user triggers `POST /api/billing/portal`; the API creates a Stripe Billing Portal session and redirects to Stripe-hosted management UI.
- **Stripe webhook synchronization:** Stripe sends billing events to `POST /api/webhooks/stripe`; the API verifies the signature, stores processed event IDs for idempotency, and updates `plan_type` / `stripe_customer_id` / `stripe_subscription_id` based on subscription lifecycle.
