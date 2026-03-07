# Constraints

## Technical Constraints
- Language / Framework: Next.js (App Router) with React client components, Auth.js (Google OAuth), Prisma ORM, and PostgreSQL (Supabase/Railway/Render) as defined in the base project and architecture specs.
- Runtime environment: Next.js API routes (`/api/chat`, `/api/messages`, `/api/chats`, `/api/usage`) orchestrate LangChain/LangGraph calls to ChatGPT, Claude, and Gemini; messages include provider/model metadata plus branching relationships.
- Deployment assumptions: Host on Vercel (primary) or Fly.io/Render (backup) with a managed Postgres instance (Supabase preferred); integrate Google OAuth via `AUTH_GOOGLE_ID/SECRET` and prepare Stripe keys when the Pro plan is enabled.

## Business Constraints
- Plans: Free plan is limited to 5 messages per day and 60,000 tokens per month; Pro plan removes message caps but is limited to 150,000 tokens per week plus 650,000 tokens across a rolling 30-day window, and is billed monthly via Stripe subscription tied to each Google-authenticated user.
- Payment requirements: Stripe integration must capture `stripe_customer_id` and `stripe_subscription_id` for Pro accounts, expose checkout/portal entry points from settings, and synchronize plan state via Stripe webhooks.
- Legal / compliance notes: Not specified in the provided spec.
