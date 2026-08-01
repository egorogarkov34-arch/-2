interface Env {
  AQUA_APP_URL: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
}

interface TelegramMessage {
  chat: { id: number }
  text?: string
}

interface TelegramUpdate {
  message?: TelegramMessage
}

const welcomeText = `💧 <b>Добро пожаловать в Aquora Water!</b>

Следить за водным балансом стало проще и приятнее.
Отмечай каждый стакан воды, наблюдай, как силуэт постепенно заполняется, отслеживай прогресс и формируй полезную привычку каждый день.
<b>Начни прямо сейчас — сделай первый глоток на пути к лучшему самочувствию.</b>

💧 <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, watch your body fill up as you reach your goal, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>`

const helpText = `💧 <b>Aquora Water commands</b>

/start — welcome message and Mini App
/open — open Aquora Water
/help — show this help`

function miniAppKeyboard(appUrl: string) {
  return {
    inline_keyboard: [[{
      text: '💧 Open tracker',
      web_app: { url: appUrl },
    }]],
  }
}

async function telegramRequest(env: Env, method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    console.error(`Telegram ${method} failed: ${await response.text()}`)
  }
}

async function sendMessage(env: Env, chatId: number, text: string) {
  await telegramRequest(env, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: miniAppKeyboard(env.AQUA_APP_URL),
  })
}

function commandFrom(message: TelegramMessage) {
  const firstWord = message.text?.trim().split(/\s+/)[0] ?? ''
  return firstWord.split('@')[0].toLowerCase()
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET') {
      return new Response('Aquora Telegram bot is online.', { status: 200 })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (!env.TELEGRAM_WEBHOOK_SECRET || receivedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 })
    }

    let update: TelegramUpdate
    try {
      update = (await request.json()) as TelegramUpdate
    } catch {
      return new Response('Invalid update', { status: 400 })
    }

    const message = update.message
    if (!message?.text) {
      return new Response('ok')
    }

    const command = commandFrom(message)
    if (command === '/start' || command === '/open') {
      await sendMessage(env, message.chat.id, welcomeText)
    } else if (command === '/help') {
      await sendMessage(env, message.chat.id, helpText)
    }

    return new Response('ok')
  },
}
