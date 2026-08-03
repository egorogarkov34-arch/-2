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

// Telegram must always receive UTF-8 text. Base64 keeps these strings intact
// across editors and GitHub/Cloudflare deployments on Windows.
const decodeUtf8 = (encoded: string) => new TextDecoder().decode(Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)))
const waterEmoji = String.fromCodePoint(0x1F4A7)

const welcomeText = decodeUtf8('8J+SpyA8Yj7QlNC+0LHRgNC+INC/0L7QttCw0LvQvtCy0LDRgtGMINCyIEFxdW9yYSBXYXRlciE8L2I+CgrQodC70LXQtNC40YLRjCDQt9CwINCy0L7QtNC90YvQvCDQsdCw0LvQsNC90YHQvtC8INGB0YLQsNC70L4g0L/RgNC+0YnQtSDQuCDQv9GA0LjRj9GC0L3QtdC1LgrQntGC0LzQtdGH0LDQuSDQutCw0LbQtNGL0Lkg0YHRgtCw0LrQsNC9INCy0L7QtNGLLCDQvdCw0LHQu9GO0LTQsNC5LCDQutCw0Log0YHQuNC70YPRjdGCINC/0L7RgdGC0LXQv9C10L3QvdC+INC30LDQv9C+0LvQvdGP0LXRgtGB0Y8sINC+0YLRgdC70LXQttC40LLQsNC5INC/0YDQvtCz0YDQtdGB0YEg0Lgg0YTQvtGA0LzQuNGA0YPQuSDQv9C+0LvQtdC30L3Rg9GOINC/0YDQuNCy0YvRh9C60YMg0LrQsNC20LTRi9C5INC00LXQvdGMLgo8Yj7QndCw0YfQvdC4INC/0YDRj9C80L4g0YHQtdC50YfQsNGBIOKAlCDRgdC00LXQu9Cw0Lkg0L/QtdGA0LLRi9C5INCz0LvQvtGC0L7QuiDQvdCwINC/0YPRgtC4INC6INC70YPRh9GI0LXQvNGDINGB0LDQvNC+0YfRg9Cy0YHRgtCy0LjRji48L2I+Cgrwn5KnIDxiPldlbGNvbWUgdG8gQXF1b3JhIFdhdGVyITwvYj4KClN0YXlpbmcgaHlkcmF0ZWQgaGFzIG5ldmVyIGJlZW4gdGhpcyBzaW1wbGUuClRyYWNrIGV2ZXJ5IGdsYXNzIG9mIHdhdGVyLCB3YXRjaCB5b3VyIGJvZHkgZmlsbCB1cCBhcyB5b3UgcmVhY2ggeW91ciBnb2FsLCBtb25pdG9yIHlvdXIgcHJvZ3Jlc3MsIGFuZCBidWlsZCBhIGhlYWx0aHkgaGFiaXQgZXZlcnkgZGF5Lgo8Yj5TdGFydCBub3cgYW5kIHRha2UgeW91ciBmaXJzdCBzdGVwIHRvd2FyZCBiZXR0ZXIgaHlkcmF0aW9uLjwvYj4=')
const openText = decodeUtf8('8J+SpyA8Yj5BcXVvcmEgV2F0ZXI8L2I+CgrQndCw0LbQvNC40YLQtSDQutC90L7Qv9C60YMg0L3QuNC20LUsINGH0YLQvtCx0Ysg0L7RgtC60YDRi9GC0Ywg0YLRgNC10LrQtdGALgoKVGFwIHRoZSBidXR0b24gYmVsb3cgdG8gb3BlbiB0aGUgdHJhY2tlci4=')
const helpText = decodeUtf8('8J+SpyA8Yj7QmtC+0LzQsNC90LTRiyBBcXVvcmEgV2F0ZXI8L2I+Cgovc3RhcnQg4oCUINC/0YDQuNCy0LXRgtGB0YLQstC40LUg0LggTWluaSBBcHAKL29wZW4g4oCUINC+0YLQutGA0YvRgtGMINGC0YDQtdC60LXRgAovaGVscCDigJQg0YHQv9C40YHQvtC6INC60L7QvNCw0L3QtA==')

function appUrl(env: Env) {
  return env.AQUA_APP_URL || DEFAULT_AQUA_APP_URL
}

function miniAppKeyboard(url: string) {
  return {
    inline_keyboard: [[{
      text: `${waterEmoji} Open tracker`,
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
    if (command === '/start') {
      await sendMessage(env, message.chat.id, welcomeText)
    } else if (command === '/open') {
      await sendMessage(env, message.chat.id, openText)
    } else if (command === '/help') {
      await sendMessage(env, message.chat.id, helpText)
    }

    return textResponse('ok')
  },
}

