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

const DEFAULT_AQUA_APP_URL = 'https://aquora-water.onrender.com'

const welcomeText = `💧 <b>Добро пожаловать в Aquora Water!</b>

Следить за водным балансом стало проще и приятнее.
Отмечай каждый стакан воды, наблюдай за прогрессом и формируй полезную привычку каждый день.
<b>Начни прямо сейчас — сделай первый глоток на пути к лучшему самочувствию.</b>

💧 <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>`

const helpText = `💧 <b>Команды Aquora Water</b>

/start — приветствие и Mini App
/open — открыть трекер
/help — показать команды`

const botDescription = '💧 Aquora Water — ваш трекер воды.\n\nНажмите Start или отправьте /start, чтобы открыть приложение и начать следить за водным балансом.\n\nPress Start or send /start to begin.'

const botCommands = [
  { command: 'start', description: 'Начать и открыть трекер' },
  { command: 'open', description: 'Открыть трекер воды' },
  { command: 'help', description: 'Помощь' },
]

function appUrl(env: Env) {
  return env.AQUA_APP_URL || DEFAULT_AQUA_APP_URL
}

function miniAppKeyboard(url: string) {
  return {
    inline_keyboard: [[{
      text: '💧 Open tracker',
      web_app: { url },
    }]],
  }
}

async function telegramRequest(env: Env, method: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      console.error(`Telegram ${method} failed: ${await response.text()}`)
      return false
    }
    return true
  } catch (error) {
    console.error(`Telegram ${method} failed`, error)
    return false
  }
}

async function sendMessage(env: Env, chatId: number, text: string) {
  return telegramRequest(env, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: miniAppKeyboard(appUrl(env)),
  })
}

function commandFrom(message: TelegramMessage) {
  const firstWord = message.text?.trim().split(/\s+/)[0] ?? ''
  return firstWord.split('@')[0].toLowerCase()
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET') {
      if (url.pathname === '/setup') {
        const [webhook, description, commands] = await Promise.all([
          telegramRequest(env, 'setWebhook', { url: url.origin, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] }),
          telegramRequest(env, 'setMyDescription', { description: botDescription }),
          telegramRequest(env, 'setMyCommands', { commands: botCommands }),
        ])
        return jsonResponse({ ok: webhook && description && commands })
      }
      return new Response('Aquora Telegram bot is online.', { status: 200 })
    }

    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (!env.TELEGRAM_WEBHOOK_SECRET || receivedSecret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Forbidden', { status: 403 })
    }

    let update: TelegramUpdate
    try {
      update = await request.json() as TelegramUpdate
    } catch {
      return new Response('Invalid update', { status: 400 })
    }

    const message = update.message
    if (!message?.text) return new Response('ok')

    const command = commandFrom(message)
    if (command === '/start' || command === '/open') {
      await sendMessage(env, message.chat.id, welcomeText)
    } else if (command === '/help') {
      await sendMessage(env, message.chat.id, helpText)
    }

    return new Response('ok')
  },
}
