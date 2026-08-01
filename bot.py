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

WELCOME_TEXT = """💧 <b>Добро пожаловать в Aquora Water!</b>

Следить за водным балансом стало проще и приятнее.
Отмечай каждый стакан воды, наблюдай, как силуэт постепенно заполняется, отслеживай прогресс и формируй полезную привычку каждый день.
<b>Начни прямо сейчас — сделай первый глоток на пути к лучшему самочувствию.</b>

💧 <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, watch your body fill up as you reach your goal, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>"""


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


def welcome(chat_id: int) -> None:
    telegram(
        "sendMessage",
        {
            "chat_id": chat_id,
            "text": WELCOME_TEXT,
            "parse_mode": "HTML",
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
                    welcome(message["chat"]["id"])
        except KeyboardInterrupt:
            raise
        except Exception as error:
            print(f"Bot API error: {error}. Retrying in 4 seconds.")
            time.sleep(4)


if __name__ == "__main__":
    main()
