# FortiAnswer — AI Security Chatbot (Frontend)

React + TypeScript SPA for an AI-assisted security assistant: chat against an Azure Functions backend, tickets, optional admin tools (feedback, knowledge base), and role-based UX (Customer / Agent / Admin).

## Features

- **AI chat** — Request types (phishing, VPN, MFA, etc.), streaming-style status, citations, optional web search / escalation, thumbs feedback sent to `POST /api/feedback`.
- **Central API client** — All calls go through [`src/services/apiClient.ts`](src/services/apiClient.ts) with `x-api-key` (Sprint 3). Handles **429** rate limits with a user-facing message.
- **Tickets** — Customers: `GET /api/tickets?username=…`. Agents/Admins: paginated `GET /api/tickets/all`, filters, **Assign to me**, status updates via `PATCH /api/tickets/{id}` (**Open** / **InProgress** / **Closed**).
- **Admin panel** — API health strip, **Feedback** (summary, flagged, dismiss), **Knowledge Base** (list from `GET /api/kb/documents`, upload `POST /api/documents/upload`, **delete** `DELETE /api/documents/delete`), RAG config (local), mock audit table. **Theme**: Light / Dark persisted in the browser ([`src/utils/theme.ts`](src/utils/theme.ts)).
- **Landing** — Ticket summary counts (API-backed for all roles where applicable).
- **Public Knowledge page** (`/knowledge`) — Search/filter UI over **mock** items for demos; **live** KB documents are managed under **Admin → Knowledge Base**.

## Tech stack

- React 18, TypeScript, Vite, Tailwind CSS, React Router v6

## Project structure (high level)

```
src/
├── components/     # layout, chat, common
├── contexts/       # auth, user
├── hooks/          # useChat, useSession, etc.
├── pages/          # route pages
├── services/       # apiClient, chatService, ticketService, feedbackService, kbService, …
├── types/
└── utils/          # constants, theme, satisfactionDisplay, …
```

## Prerequisites

- Node.js 18+ and npm

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Azure Function App base URL (no trailing slash). |
| `VITE_API_KEY` | **Required** for Sprint 3 — sent as `x-api-key` on every request. |

Optional: `VITE_SHOW_DEBUG`, `VITE_DEBUG_VIEW_KEY` (debug panel / debug API).

See [`.env.example`](.env.example) for comments.

### Build

```bash
npm run build
npm run preview   # optional local preview of dist/
```

## Routes

| Path | Notes |
|------|--------|
| `/` | Dashboard |
| `/chat` | AI chat |
| `/knowledge` | Demo KB browser (mock list) |
| `/faq`, `/policy` | Redirect to `/knowledge` with query |
| `/tickets` | Tickets (behavior varies by role) |
| `/admin` | Admin tools (tabs: users, RAG, audit, feedback, KB) |
| `/create-ticket`, `/contact-support`, `/escalate` | Support flows |

## API integration

The app talks to **real** Azure Functions endpoints via [`apiClient`](src/services/apiClient.ts):

- **Chat / conversations / debug** — `chatService`, `conversationService`, `debugService`
- **Auth** — `authService`
- **Tickets** — `ticketService` (`listTicketsByUser`, `listTicketsAll`, `patchTicket`, …)
- **Feedback** — `feedbackService`
- **KB** — `kbService` (`listKbDocuments`, `uploadKbDocument`, `deleteKbDocument`)
- **Health** — `healthService`

Legacy mock demos may still exist under `src/services/api.ts` for local experiments; production flows use the services above.

## Security Features

Security controls implemented by this **SPA** and Static Web App configuration.

### Implemented in this repo (audit checklist)

- **Control:** Security response headers  
  **Where:** [`staticwebapp.config.json`](staticwebapp.config.json)  
  **Why:** Adds `Content-Security-Policy` (including `connect-src`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` to harden browser behavior in production.

- **Control:** Credential input limits  
  **Where:** [`src/utils/authInputLimits.ts`](src/utils/authInputLimits.ts), consumed by [`src/pages/Login.tsx`](src/pages/Login.tsx) and [`src/pages/Register.tsx`](src/pages/Register.tsx)  
  **Why:** Keeps username/password lengths bounded and consistent across auth forms.

- **Control:** Login retry cooldown  
  **Where:** [`src/pages/Login.tsx`](src/pages/Login.tsx)  
  **Why:** Introduces client-side friction after repeated failed attempts to reduce rapid brute-force retries.

- **Control:** Generic authentication errors  
  **Where:** [`src/services/authService.ts`](src/services/authService.ts)  
  **Why:** Avoids exposing backend auth details in user-facing error messages.

- **Control:** Rate-limit handling  
  **Where:** [`src/services/apiClient.ts`](src/services/apiClient.ts)  
  **Why:** Handles `429 Too Many Requests` with clear UX feedback and safer request behavior.

- **Control:** XSS-conscious message rendering  
  **Where:** Chat UI components such as [`src/components/chat/MessageBubble.tsx`](src/components/chat/MessageBubble.tsx)  
  **Why:** Uses React text rendering patterns and avoids raw untrusted HTML injection.

### Notes for this codebase

- [`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx) persists `{ username, role }` in **localStorage** for UI and routing only; it is not tamper-proof.
- **`VITE_API_KEY`** is embedded in the client build; treat it as a shared client header value, not a private secret.

## Deploy (Azure Static Web Apps)

If your repo includes a GitHub Actions workflow for Azure Static Web Apps:

1. Configure repository secrets (e.g. deployment token from Azure).
2. Set build-time env (e.g. `VITE_API_BASE_URL`, `VITE_API_KEY`) in GitHub Actions secrets / workflow `env` so the production build embeds the correct API URL and key.
3. Ensure your API allows requests from the Static Web App origin (CORS), if applicable.
4. If the API host differs from `staticwebapp.config.json`, update **`Content-Security-Policy` `connect-src`** (see **Security Features**).

## Browser support

Current evergreen browsers (Chrome, Firefox, Safari, Edge).

## License

MIT
