"""Telegram bot that opens the Aquora Water Tracker Mini App.

Required environment variables:
- TELEGRAM_BOT_TOKEN
- AQUA_APP_URL
"""

import json
import os
import time
from urllib.request import Request, urlopen

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
APP_URL = os.environ.get("AQUA_APP_URL")

if not TOKEN or not APP_URL:
    raise SystemExit("Set TELEGRAM_BOT_TOKEN and AQUA_APP_URL before starting the bot.")

API = f"https://api.telegram.org/bot{TOKEN}/"


def telegram(method: str, data: dict | None = None):
    payload = json.dumps(data or {}).encode("utf-8")
    request = Request(
        API + method,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=40) as response:
        result = json.load(response)
    if not result.get("ok"):
        raise RuntimeError(result)
    return result["result"]


def welcome(chat_id: int, first_name: str = "") -> None:
    name = f", {first_name}" if first_name else ""
    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": f"Hi{name}! 💧\nOpen Aquora and track your water intake.",
            "reply_markup": {
                "inline_keyboard": [[{
                    "text": "💧 Open tracker",
                    "web_app": {"url": APP_URL},
                }]]
            },
        },
    )


def main() -> None:
    print("Aquora bot started. Press Ctrl+C to stop.")
    offset = None
    while True:
        try:
            updates = telegram(
                "getUpdates",
                {"offset": offset, "timeout": 30, "allowed_updates": ["message"]},
            )
            for update in updates:
                offset = update["update_id"] + 1
                message = update.get("message", {})
                if message.get("text", "").startswith("/start"):
                    welcome(
                        message["chat"]["id"],
                        message.get("from", {}).get("first_name", ""),
                    )
        except KeyboardInterrupt:
            raise
        except Exception as error:
            print(f"Bot API error: {error}. Retrying in 4 seconds.")
            time.sleep(4)


if __name__ == "__main__":
    main()
