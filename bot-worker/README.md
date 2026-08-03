# Aquora Telegram bot on Cloudflare Workers

This Worker runs the bot without a permanent Render server. It receives Telegram updates through a webhook.

## Required Cloudflare secrets

Add these variables in the Worker settings. Do not put their values in GitHub.

- `TELEGRAM_BOT_TOKEN` вЂ” token from BotFather.
- `AQUA_APP_URL` вЂ” public HTTPS URL of the Aquora Mini App on Render.
- `TELEGRAM_WEBHOOK_SECRET` вЂ” a new random value made from letters, numbers, `_`, or `-`.

## Commands

- `/start` вЂ” bilingual welcome text and Mini App button.
- `/open` вЂ” Mini App button.
- `/help` вЂ” command list.

The bot does not store user profiles and does not send reminder notifications.

The Worker is deployed automatically from the `main` branch.

## Register the webhook

The Worker intentionally has no public `/setup` route. This prevents third parties from changing bot settings by opening a URL.

Register or rotate the webhook only from a trusted terminal with the token stored locally as an environment variable. Pass the same `TELEGRAM_WEBHOOK_SECRET` as Telegram's `secret_token`.

Never place either secret in GitHub, Render variables beginning with `VITE_`, screenshots, or chat messages.

