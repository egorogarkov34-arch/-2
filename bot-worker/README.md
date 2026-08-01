# Aquora Telegram bot on Cloudflare Workers

This Worker runs the bot without a permanent Render server. It receives Telegram updates through a webhook.

## Required Cloudflare secrets

Add these variables in the Worker settings. Do not put their values in GitHub.

- `TELEGRAM_BOT_TOKEN` — token from BotFather.
- `AQUA_APP_URL` — public HTTPS URL of the Aquora Mini App on Render.
- `TELEGRAM_WEBHOOK_SECRET` — a new random value made from letters, numbers, `_`, or `-`.

## Commands

- `/start` — bilingual welcome text and Mini App button.
- `/open` — Mini App button.
- `/help` — command list.

The `/profile` command shows the user's saved hydration profile.

## Register the webhook

After Cloudflare deploys the Worker, set the Telegram webhook URL to:

`https://YOUR-WORKER.workers.dev`

Pass the same `TELEGRAM_WEBHOOK_SECRET` to Telegram as `secret_token` when registering the webhook.
