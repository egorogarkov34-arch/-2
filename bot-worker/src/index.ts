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

interface RequestBucket {
  startedAt: number
  count: number
}

const DEFAULT_AQUA_APP_URL = 'https://aquora-water.onrender.com'
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024
const INVALID_REQUEST_WINDOW_MS = 60_000
const MAX_INVALID_REQUESTS_PER_WINDOW = 40
const invalidRequestBuckets = new Map<string, RequestBucket>()

const welcomeText = `рџ’§ <b>Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ РІ Aquora Water!</b>

РЎР»РµРґРёС‚СЊ Р·Р° РІРѕРґРЅС‹Рј Р±Р°Р»Р°РЅСЃРѕРј СЃС‚Р°Р»Рѕ РїСЂРѕС‰Рµ Рё РїСЂРёСЏС‚РЅРµРµ.
РћС‚РјРµС‡Р°Р№ РєР°Р¶РґС‹Р№ СЃС‚Р°РєР°РЅ РІРѕРґС‹, РЅР°Р±Р»СЋРґР°Р№ Р·Р° РїСЂРѕРіСЂРµСЃСЃРѕРј Рё С„РѕСЂРјРёСЂСѓР№ РїРѕР»РµР·РЅСѓСЋ РїСЂРёРІС‹С‡РєСѓ РєР°Р¶РґС‹Р№ РґРµРЅСЊ.
<b>РќР°С‡РЅРё РїСЂСЏРјРѕ СЃРµР№С‡Р°СЃ вЂ” СЃРґРµР»Р°Р№ РїРµСЂРІС‹Р№ РіР»РѕС‚РѕРє РЅР° РїСѓС‚Рё Рє Р»СѓС‡С€РµРјСѓ СЃР°РјРѕС‡СѓРІСЃС‚РІРёСЋ.</b>

рџ’§ <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>`

const helpText = `рџ’§ <b>РљРѕРјР°РЅРґС‹ Aquora Water</b>

/start вЂ” РїСЂРёРІРµС‚СЃС‚РІРёРµ Рё Mini App
/open вЂ” РѕС‚РєСЂС‹С‚СЊ С‚СЂРµРєРµСЂ
/help вЂ” РїРѕРєР°Р·Р°С‚СЊ РєРѕРјР°РЅРґС‹`

const botDescription = 'рџ’§ Aquora Water вЂ” РІР°С€ С‚СЂРµРєРµСЂ РІРѕРґС‹.\n\nРќР°Р¶РјРёС‚Рµ Start РёР»Рё РѕС‚РїСЂР°РІСЊС‚Рµ /start, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РїСЂРёР»РѕР¶РµРЅРёРµ Рё РЅР°С‡Р°С‚СЊ СЃР»РµРґРёС‚СЊ Р·Р° РІРѕРґРЅС‹Рј Р±Р°Р»Р°РЅСЃРѕРј.\n\nPress Start or send /start to begin.'

const botCommands = [
  { command: 'start', description: 'РќР°С‡Р°С‚СЊ Рё РѕС‚РєСЂС‹С‚СЊ С‚СЂРµРєРµСЂ' },
  { command: 'open', description: 'РћС‚РєСЂС‹С‚СЊ С‚СЂРµРєРµСЂ РІРѕРґС‹' },
  { command: 'help', description: 'РџРѕРјРѕС‰СЊ' },
]

function appUrl(env: Env) {
  return env.AQUA_APP_URL || DEFAULT_AQUA_APP_URL
}

function miniAppKeyboard(url: string) {
  return {
    inline_keyboard: [[{
      text: 'рџ’§ Open tracker',
      web_app: { url },
    }]],
  }
}

function securityHeaders(contentType = 'text/plain; charset=utf-8') {
  return {
    'content-type': contentType,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  }
}

function textResponse(text: string, status = 200) {
  return new Response(text, { status, headers: securityHeaders() })
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: securityHeaders('application/json; charset=utf-8') })
}

function stringsMatch(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function tooManyInvalidRequests(request: Request) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const now = Date.now()
  const existing = invalidRequestBuckets.get(ip)
  const bucket = !existing || now - existing.startedAt >= INVALID_REQUEST_WINDOW_MS
    ? { startedAt: now, count: 1 }
    : { ...existing, count: existing.count + 1 }
  invalidRequestBuckets.set(ip, bucket)

  if (invalidRequestBuckets.size > 512) {
    for (const [key, value] of invalidRequestBuckets) {
      if (now - value.startedAt >= INVALID_REQUEST_WINDOW_MS) invalidRequestBuckets.delete(key)
    }
  }

  return bucket.count > MAX_INVALID_REQUESTS_PER_WINDOW
}

async function telegramRequest(env: Env, method: string, payload: Record<string, unknown>) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      console.error(`Telegram ${method} failed: ${response.status}`)
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/') return textResponse('Aquora Telegram bot is online.')
    if (request.method !== 'POST') return textResponse('Not found', 404)

    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) return textResponse('Payload too large', 413)

    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET || !stringsMatch(receivedSecret, env.TELEGRAM_WEBHOOK_SECRET)) {
      return tooManyInvalidRequests(request) ? textResponse('Too many requests', 429) : textResponse('Forbidden', 403)
    }

    let update: TelegramUpdate
    try {
      update = await request.json() as TelegramUpdate
    } catch {
      return textResponse('Invalid update', 400)
    }

    const message = update.message
    if (!message?.text) return textResponse('ok')

    const command = commandFrom(message)
    if (command === '/start' || command === '/open') {
      await sendMessage(env, message.chat.id, welcomeText)
    } else if (command === '/help') {
      await sendMessage(env, message.chat.id, helpText)
    }

    return textResponse('ok')
  },
}

