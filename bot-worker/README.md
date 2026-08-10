# Aquora Telegram bot on Cloudflare Workers

This Worker receives Telegram webhooks and sends optional hydration reminders. The Mini App remains hosted on Render.

## What the reminder system does

- The user enables reminders and chooses an interval in the Mini App.
- The Mini App synchronizes only the current goal, today’s amount, language, and reminder settings.
- The Worker validates Telegram `initData` before accepting a change.
- A Cloudflare cron runs every 15 minutes and sends a reminder only during 09:00–22:00 in the user’s selected time zone.
- Reminders stop after the daily goal is reached and start fresh on the next local day.
- When a user blocks the bot, delivery is automatically paused until they send `/start`, `/open`, or `/help` again.

## Required Cloudflare configuration

Keep these values in Worker **Settings → Variables and Secrets**. Never commit a token or secret to GitHub.

- `TELEGRAM_BOT_TOKEN` — token from BotFather, stored as a secret.
- `TELEGRAM_WEBHOOK_SECRET` — a random secret used to verify Telegram webhook requests, stored as a secret.
- `AQUA_APP_URL` — the public HTTPS URL of the Render Mini App, for example `https://aquora-water.onrender.com`.
- `AQUORA_USERS` — KV namespace binding. Create a KV namespace, then bind it to the Worker with this exact variable name.

The cron `*/15 * * * *` is declared in `wrangler.jsonc` and is deployed with the Worker.

## Required Render configuration

Add this build-time environment variable to the Mini App service on Render, then redeploy it:

```text
VITE_AQUORA_BOT_URL=https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev
```

Use the Worker’s public `workers.dev` URL without a trailing slash. The Mini App can then securely synchronize reminder settings.

## Bot commands

- `/start` — bilingual welcome message and Mini App button.
- `/open` — opens the tracker.
- `/help` — command list.

## Webhook registration

The Worker intentionally has no public setup endpoint. Register or rotate the Telegram webhook only from a trusted terminal, using the same `TELEGRAM_WEBHOOK_SECRET` as Telegram’s `secret_token`.

Never put the bot token, webhook secret, or KV credentials in GitHub, `VITE_` variables, screenshots, or chat messages.
