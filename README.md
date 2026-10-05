# AwayAI

An Android-first AI away assistant for WhatsApp Business. AwayAI tells every sender that you are unavailable, then answers from information you approved and the sender's own conversation history.

> **Important:** automatic WhatsApp replies run on the hosted server, not on the phone. That is why replies continue while the Android device is offline.

## What is included

- **Expo / React Native Android app** with dashboard, away switch, inbox, knowledge editor, test chat, previous-chat import, and server setup
- **Node + TypeScript API** for Meta webhooks, WhatsApp Cloud API replies, AI generation and persistent conversation storage
- Mandatory “I’m unavailable” disclosure on every AI response
- Contact-isolated history: one person’s chat is never included in another person’s prompt
- Human-attention flags for approvals, complaints, refunds, emergencies, credentials and other sensitive requests
- Webhook signature verification, duplicate-event protection, secure mobile token storage and server-side secrets
- Local safe fallback when no LLM key is configured
- Docker deployment, Render blueprint and Android EAS build profile
- Demo data so the app can be explored before credentials are added

## Architecture

```text
WhatsApp sender
      │
      ▼
Meta WhatsApp Cloud API ── webhook ──► Hosted AwayAI server
                                           │
                         per-contact history + approved knowledge
                                           │
                                           ▼
                                  AI reply + guardrails
                                           │
Meta /PHONE_NUMBER_ID/messages ◄───────────┘
      │
      ▼
WhatsApp sender

Android app ── admin token / HTTPS ──► Hosted AwayAI server
```

The phone can be switched off after Away Mode is enabled. The hosted server still has to remain online.

## WhatsApp Business app compatibility

This project uses the **official WhatsApp Cloud API**. It does not use WhatsApp Web scraping, notification access, accessibility automation, or unofficial libraries.

For an existing number in the WhatsApp Business mobile app, use Meta’s supported Business App onboarding/coexistence path if your account and region are eligible. That path can require Embedded Signup through an approved Tech Provider or Solution Partner. Otherwise, use a dedicated Cloud API business number. Do not register or migrate an important production number until you have confirmed the current Meta onboarding flow for that account.

The standard direct Cloud API setup begins remembering messages when its webhooks are enabled. Older one-to-one chats can be seeded with **Teach → Previous chat context** by pasting a WhatsApp text export. Imports are kept inside that contact’s thread; they do not become global knowledge.

## Quick start in demo mode

### Requirements

- Node.js 20.19.4 or newer (Expo SDK 57 toolchain)
- npm
- Android Studio/emulator, or an Android device with Expo Go

```bash
cp .env.example .env
npm install
npm run dev:server
```

In another terminal:

```bash
npm run dev:mobile
```

Then press `a` for Android, or scan the Expo QR code. The app opens with preview data when no server URL has been saved.

### Local Android-to-server URL

- Android emulator: `http://10.0.2.2:8787`
- Physical phone: use your computer’s LAN IP, for example `http://192.168.1.20:8787`
- Production: always use a public `https://` URL

Set the URL and `APP_ADMIN_TOKEN` in the app under **Settings → App server**. For a release build you can instead set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_APP_TOKEN` before building.

## Configure the server

Copy `.env.example` to `.env` and set:

```dotenv
APP_ADMIN_TOKEN=a-long-random-secret-used-by-the-android-app
META_VERIFY_TOKEN=a-different-random-webhook-token
META_APP_SECRET=your-meta-app-secret
WHATSAPP_ACCESS_TOKEN=your-permanent-system-user-token
WHATSAPP_PHONE_NUMBER_ID=your-business-phone-number-id
WHATSAPP_API_VERSION=v26.0

LLM_API_KEY=your-provider-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4.1-mini

DEMO_MODE=false
```

`LLM_BASE_URL` can point to an OpenAI-compatible `/chat/completions` provider. Keep all provider and Meta keys on the server; never put them in `EXPO_PUBLIC_*` variables.

### Test locally

```bash
npm run typecheck
npm test
npm run dev:server
```

Health check:

```bash
curl http://localhost:8787/health
```

Admin API:

```bash
curl http://localhost:8787/api/dashboard \
  -H "Authorization: Bearer $APP_ADMIN_TOKEN"
```

Simulate a contact question without sending a WhatsApp message:

```bash
curl -X POST http://localhost:8787/api/simulate \
  -H "Authorization: Bearer $APP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What are your working hours?"}'
```

## Connect Meta WhatsApp Cloud API

1. Create or select a Meta developer app and add the WhatsApp product.
2. In WhatsApp API Setup, note the **phone number ID** and generate a test token first.
3. For production, create a System User token with `whatsapp_business_messaging` and the required business-management access. Store it as `WHATSAPP_ACCESS_TOKEN`.
4. Deploy the server to a public HTTPS URL.
5. In the Meta app’s WhatsApp webhook configuration, use:
   - Callback URL: `https://YOUR-SERVER/webhooks/whatsapp`
   - Verify token: the exact value of `META_VERIFY_TOKEN`
6. Subscribe the app to the `messages` webhook field. Coexistence/provider setups can additionally expose `history`, `smb_message_echoes` and related fields, but this MVP only requires `messages` for live replies.
7. Send a message from a test user to the business number. The incoming message opens the customer-service window, so AwayAI can send its free-form service reply through `/PHONE_NUMBER_ID/messages`.
8. Confirm the conversation appears in the app and run **Teach → Try a message** before leaving Away Mode on.

Meta retries failed webhook deliveries and can send duplicates. AwayAI acknowledges webhooks immediately, queues each contact’s messages in order and stores recent webhook IDs to prevent duplicate replies.

## Deploy the server

### Render

The included `render.yaml` creates a Docker web service and a persistent 1 GB data disk.

1. Push this folder to a private Git repository.
2. Create a Render Blueprint from `render.yaml`.
3. Add the secret environment values in Render.
4. Open `/health`, then configure the Render HTTPS URL in Meta and the Android app.

### Any Docker host

```bash
docker compose up -d --build
```

Mount persistent storage at `/app/apps/server/data` and terminate TLS at your hosting provider or reverse proxy.

> The included JSON store is appropriate for a single-owner MVP. For multiple replicas or many users, replace it with Postgres and a durable job queue before scaling.

## Build the Android APK or Play Store bundle

Install and authenticate EAS CLI:

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
```

Internal APK:

```bash
eas build --platform android --profile preview
```

Play Store AAB:

```bash
eas build --platform android --profile production
```

Before distributing the app, change the Android package ID in `apps/mobile/app.json`, add production icons/splash assets, publish a privacy policy, and complete Meta App Review/business verification if your use case requires them.

## Safety and privacy behavior

- Every AI answer is prefixed on the server with the away disclosure; the model cannot remove it.
- AI context contains only approved knowledge and the current contact’s thread.
- Unknown questions use a configurable fallback and are marked for human review.
- The mobile admin token uses Android secure storage. Meta and LLM secrets never leave the server.
- Webhooks are HMAC-verified with `META_APP_SECRET` in production.
- The import endpoint accepts only a named, one-to-one export associated with a WhatsApp number.
- Conversation deletion is available through `DELETE /api/conversations/:id`; add a visible in-app delete/export workflow before public release.
- Add retention limits, database encryption, backups, audit logs and a privacy/consent review before handling real customer data at scale.

See [SECURITY.md](SECURITY.md) for the production checklist.

## API summary

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Public health check |
| `GET` / `POST` | `/webhooks/whatsapp` | Meta verification and incoming events |
| `GET` | `/api/dashboard` | Status and metrics |
| `GET` / `PUT` | `/api/settings` | Read/update away and AI settings |
| `GET` | `/api/conversations` | Conversation summaries |
| `GET` / `PATCH` / `DELETE` | `/api/conversations/:id` | Read, flag or remove a thread |
| `POST` | `/api/simulate` | Preview an AI reply |
| `POST` | `/api/import-chat` | Import one WhatsApp text export |

All `/api/*` routes require `Authorization: Bearer APP_ADMIN_TOKEN` when that variable is configured.

## Current MVP limits

- “Offline” is a manual Away Mode; WhatsApp does not report that the owner’s phone lost internet.
- Text, buttons and interactive selections are understood. Media receives a safe generic description; media transcription/vision is not implemented.
- Imported history parsing targets common Android and iOS WhatsApp text-export formats and should be reviewed after import.
- The server has a single owner and a local JSON data store.
- It does not include calendar booking, CRM actions, payment actions or automatic commitments.
- Meta eligibility, coexistence, pricing and policy can change; verify current requirements before production rollout.
