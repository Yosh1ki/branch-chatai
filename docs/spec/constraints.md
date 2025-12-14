# Constraints

## Technical Constraints
- Language / Framework: Next.js (App Router) with React client components, Auth.js (Google OAuth), Prisma ORM, and PostgreSQL (Supabase/Railway/Render) as defined in the base project and architecture specs.
- Runtime environment: Next.js API routes (`/api/chat`, `/api/messages`, `/api/chats`, `/api/usage`) orchestrate LangChain/LangGraph calls to ChatGPT, Claude, and Gemini; messages include provider/model metadata plus branching relationships.
- Deployment assumptions: Host on Vercel (primary) or Fly.io/Render (backup) with a managed Postgres instance (Supabase preferred); integrate Google OAuth via `AUTH_GOOGLE_ID/SECRET` and prepare Stripe keys when the Pro plan is enabled.

## Business Constraints
- Plans: Free plan limited to 10 messages per day with access to all supported models and branching; Pro plan removes limits and is billed monthly via Stripe subscription tied to each Google-authenticated user.
- Payment requirements: Stripe integration must capture `stripe_customer_id` and `stripe_subscription_id` for Pro accounts; MVP decision on enabling Stripe is deferred but planned.
- Legal / compliance notes: Not specified in the provided spec.
