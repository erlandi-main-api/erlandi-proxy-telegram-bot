# Erlandi Proxy Telegram Bot

Secure Telegram control panel for Erlandi Proxy, built around inline keyboards.

## Features

- Telegram numeric-ID authorization and roles: owner, admin, operator, viewer
- HMAC-signed expiring callback actions and per-user rate limiting
- Inline API key list, filters, search, details, pause/resume, renew, delete confirmation
- Guided key creation with automatic/custom key, provider models, LLM Combos, quota, expiry, and Telegram ownership
- Provider/model overview, gateway health, usage summary, live-request refresh
- User administration, audit log, quota/expiry/gateway alerts
- All User Quota dashboard with global totals, status filters, balance/usage/expiry sorting, pagination, and quick renew
- Secure CSV quota export without plaintext API key secrets
- SQLite persistence and redacted structured logs
- Authenticated localhost connection to Erlandi Proxy using `x-9r-cli-token`

## Setup

```bash
cp .env.example .env
npm install
npm run build
npm test
npm start
```

Required secrets:

```text
TELEGRAM_BOT_TOKEN
OWNER_TELEGRAM_ID
GATEWAY_CLI_TOKEN
CALLBACK_SECRET
```

`OWNER_TELEGRAM_ID` must be a numeric Telegram user ID. Usernames are never trusted for authorization.

## Inline UX

`/start` and `/menu` open the control dashboard. Navigation and actions use edited inline messages. Text input is used only for names, custom keys, quota, expiry, owner IDs, and search.

## Deployment

Install under `/opt/erlandi-proxy-telegram-bot`, create the non-root `erlandi-bot` user, place secrets in `/etc/erlandi-proxy-telegram-bot.env` with mode `0600`, and install `deploy/erlandi-proxy-telegram-bot.service`.

The gateway should remain bound to localhost for bot traffic:

```text
http://127.0.0.1:20128
```

## Security

- Never commit `.env`, Telegram tokens, gateway tokens, or generated API keys.
- Keep the environment file owner-readable only.
- The owner account cannot be disabled from the bot.
- Newly created API keys are shown once and should be deleted from chat immediately after copying.
