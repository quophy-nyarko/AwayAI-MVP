# AwayAI security and production checklist

## Secrets

- Generate unrelated random values for `APP_ADMIN_TOKEN` and `META_VERIFY_TOKEN`.
- Store `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN` and `LLM_API_KEY` in the hosting provider’s secret manager.
- Never put Meta or LLM secrets in the Expo app, source control, logs, screenshots or `EXPO_PUBLIC_*` variables.
- Rotate the WhatsApp token and admin token after any suspected exposure.

## Network

- Use HTTPS only in production.
- Set `ALLOWED_ORIGINS` to the exact web origins that need admin API access. Native Android requests do not depend on browser CORS.
- Keep the server and dependencies patched.
- Place rate limiting and a request-size limit at the edge; Express already limits JSON bodies to 1 MB.
- Restrict hosting dashboards and Meta Business Manager with MFA.

## WhatsApp webhook

- Production startup must include `META_APP_SECRET`; unsigned webhook requests are rejected.
- Do not log full webhook bodies because they contain phone numbers and messages.
- Keep webhook processing idempotent. This MVP stores the last 5,000 incoming IDs.
- For high volume, acknowledge into a durable queue before returning HTTP 200. The MVP’s in-process per-contact queue is intended for a single instance.

## AI and privacy

- Obtain an appropriate legal basis/consent before sending customer messages to an AI provider.
- Choose a provider and data-retention policy suitable for the business’s jurisdiction.
- Do not place secrets, private chats, health records or payment-card data in approved knowledge.
- Review prompt-injection and data-exfiltration tests before each prompt/model change.
- Keep conversations isolated by contact ID. Never build a global transcript search into generation without explicit access controls.
- Configure a short retention period and delete expired conversations.
- Add an owner-visible audit trail showing the exact incoming message, prompt policy version, model, output and delivery result.

## Data storage

The included JSON store is intentionally simple and is not an encrypted multi-user database. Before public launch:

- Move to managed Postgres with encryption at rest and encrypted backups.
- Use row-level tenant ownership if more than one business uses the service.
- Add database migrations, backup restoration tests and retention jobs.
- Add per-user authentication instead of one shared admin token.
- Add device/session revocation and account deletion/export tools.

## Reply controls

- Preserve the mandatory away disclosure in application code rather than relying on the model.
- Require human approval for money, contracts, refunds, identity/account access, emergencies, legal/medical advice and commitments.
- Add blocklists/allowlists and business-specific escalation contacts.
- Monitor WhatsApp quality signals and immediately pause automation if users report unexpected replies.

## Release

- Complete Meta business verification and App Review where required.
- Publish terms, a privacy policy, an AI disclosure and a data deletion process.
- Confirm WhatsApp Business Messaging Policy compliance and user opt-in requirements.
- Run abuse, load, webhook retry, provider outage and token rotation tests.
- Arrange alerting for failed replies, webhook signature errors and unusually high message volume.

To report a vulnerability, contact the project owner privately rather than opening a public issue containing customer data or credentials.
