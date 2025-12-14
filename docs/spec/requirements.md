# Functional Requirements

## Core Features
- **Multi-branching chat:** After each assistant reply the UI asks whether to cut a branch, surfaces playful prompts, stores the branch inside the tree structure, and lets users fold any message so only the auto-generated inline title remains.
- **Mind-map visualization:** The base chat scrolls vertically while related branches expand horizontally beside their source message and can be explored with both lateral scrolling and a minimap.
- **Automatic titling:** Every chat receives an auto-generated title in the chat language, and each message also gets an inline title used for collapsed states.
- **Model selection:** Users can select ChatGPT, Claude, or Gemini for a chat (branch-level switching is future scope); the system records provider and model metadata with each message.
- **Mini map:** A minimap in the upper-right highlights the current viewport and lets users click a node to jump to that branch within the chat.
- **Authentication and plans:** Google OAuth is the only login method for the MVP, and authenticated users are tied to Stripe customer IDs for Pro billing. Plans include Free (10 messages/day, all models, branching enabled) and Pro (unlimited messages, Stripe subscription).
- **Data persistence:** Chats, messages (including parent-child relationships, provider info, collapse state, and usage stats), and daily usage counts are stored per the defined PostgreSQL/Prisma schema so quotas and branching can be enforced.

## Non-Goals
- Not specified in the current spec.

## User Flows
- **Send chat & receive response:** User input is posted to `/api/chat`, LangChain/LangGraph calls the chosen LLM, saves the new message plus usage stats, and streams or returns the reply to the UI for rendering.
- **Branch creation:** Selecting “branch” on any message triggers `POST /api/messages/{id}/branch`, which stores a new child message with `parent_message_id`, then returns identifiers so the frontend can draw the new branch.
- **Login and chat retrieval:** After Google OAuth succeeds the frontend calls `GET /api/chats` with the bearer token, the API queries chats for that user, and the UI shows the list before drilling into `/chats/[id]`.
- **Free plan quota check:** `/api/chat` checks `usage_stats` for the user and current date; if the count equals the 10-message Free limit it returns HTTP 429. Pro users skip this branch of the flow.
