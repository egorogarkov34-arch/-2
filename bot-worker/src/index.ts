interface Env {
  AQUA_APP_URL: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  PROFILES: ProfileStorage
}

interface ProfileStorage {
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string): Promise<void>
}

interface TelegramUser {
  id: number
  first_name?: string
  username?: string
}

interface TelegramMessage {
  chat: { id: number }
  from?: TelegramUser
  text?: string
}

interface TelegramUpdate {
  message?: TelegramMessage
}

interface StoredProfile {
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  height: number
  weight: number
  activity: 'low' | 'moderate' | 'high'
  goal: number
  language: 'ru' | 'en'
  updatedAt: string
}

const encoder = new TextEncoder()
const WEB_APP_MAX_AGE_SECONDS = 86_400

const welcomeText = `💧 <b>Добро пожаловать в Aquora Water!</b>

Следить за водным балансом стало проще и приятнее.
Отмечай каждый стакан воды, наблюдай, как силуэт постепенно заполняется, отслеживай прогресс и формируй полезную привычку каждый день.
<b>Начни прямо сейчас — сделай первый глоток на пути к лучшему самочувствию.</b>

💧 <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, watch your body fill up as you reach your goal, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>`

const helpText = `💧 <b>Команды Aquora Water</b>

/start — приветствие и Mini App
/open — открыть трекер
/profile — показать ваш профиль
/help — помощь`

function miniAppKeyboard(appUrl: string) {
  return {
    inline_keyboard: [[{
      text: '💧 Open tracker',
      web_app: { url: appUrl },
    }]],
  }
}

function profileKey(userId: number) {
  return `profile:${userId}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character] ?? character)
}

function genderLabel(gender: StoredProfile['gender'], language: StoredProfile['language']) {
  const labels = language === 'en'
    ? { male: 'Male', female: 'Female', other: 'Not specified' }
    : { male: 'Мужской', female: 'Женский', other: 'Не указан' }
  return labels[gender]
}

function activityLabel(activity: StoredProfile['activity'], language: StoredProfile['language']) {
  const labels = language === 'en'
    ? { low: 'Low', moderate: 'Moderate', high: 'High' }
    : { low: 'Низкая', moderate: 'Средняя', high: 'Высокая' }
  return labels[activity]
}

function profileMessage(profile: StoredProfile) {
  const isEnglish = profile.language === 'en'
  const title = isEnglish ? 'Your Aquora profile' : 'Ваш профиль Aquora'
  const age = isEnglish ? 'Age' : 'Возраст'
  const gender = isEnglish ? 'Gender' : 'Пол'
  const weight = isEnglish ? 'Weight' : 'Вес'
  const height = isEnglish ? 'Height' : 'Рост'
  const activity = isEnglish ? 'Activity' : 'Активность'
  const goal = isEnglish ? 'Daily goal' : 'Цель на день'
  const hint = isEnglish ? 'Update your data in the Mini App whenever needed.' : 'Изменить данные можно в Mini App в разделе «Профиль».'

  return `👤 <b>${title}</b>
────────────────
<b>${escapeHtml(profile.name)}</b>

🎂 <b>${age}</b> · ${profile.age}
⚥ <b>${gender}</b> · ${genderLabel(profile.gender, profile.language)}
⚖️ <b>${weight}</b> · ${profile.weight} kg
📏 <b>${height}</b> · ${profile.height} cm
⚡ <b>${activity}</b> · ${activityLabel(profile.activity, profile.language)}
💧 <b>${goal}</b> · ${profile.goal} ml

<i>${hint}</i>`
}

function emptyProfileMessage() {
  return `👤 <b>Профиль ещё не заполнен</b>

Откройте Aquora Water, укажите вес, рост, возраст и уровень активности. После этого команда /profile покажет ваши параметры.`
}

function corsHeaders(env: Env) {
  let origin = '*'
  try {
    if (env.AQUA_APP_URL) origin = new URL(env.AQUA_APP_URL).origin
  } catch {
    // The profile endpoint can still answer safely until the app URL is configured.
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function jsonResponse(env: Env, payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  })
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function sameString(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function hmac(keyData: Uint8Array, data: string) {
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

async function telegramUserIdFromInitData(initData: unknown, botToken: string): Promise<number | null> {
  if (typeof initData !== 'string' || !initData) return null

  const parameters = new URLSearchParams(initData)
  const hash = parameters.get('hash')
  const authDate = Number(parameters.get('auth_date'))
  const now = Math.floor(Date.now() / 1000)
  if (!hash || !Number.isInteger(authDate) || authDate > now + 60 || now - authDate > WEB_APP_MAX_AGE_SECONDS) return null

  parameters.delete('hash')
  const dataEntries: Array<[string, string]> = []
  parameters.forEach((value, key) => dataEntries.push([key, value]))
  const dataCheckString = dataEntries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secretKey = await hmac(encoder.encode('WebAppData'), botToken)
  const signature = await hmac(secretKey, dataCheckString)
  if (!sameString(toHex(signature), hash)) return null

  const rawUser = parameters.get('user')
  if (!rawUser) return null
  try {
    const user = JSON.parse(rawUser) as { id?: unknown }
    return typeof user.id === 'number' && Number.isSafeInteger(user.id) ? user.id : null
  } catch {
    return null
  }
}

function numberInRange(value: unknown, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

function parseProfile(payload: unknown): StoredProfile | null {
  if (!payload || typeof payload !== 'object') return null
  const data = payload as { profile?: unknown; goal?: unknown }
  if (!data.profile || typeof data.profile !== 'object') return null
  const profile = data.profile as Record<string, unknown>
  const name = typeof profile.name === 'string' ? profile.name.trim().slice(0, 80) : ''
  const age = numberInRange(profile.age, 12, 120)
  const height = numberInRange(profile.height, 100, 250)
  const weight = numberInRange(profile.weight, 25, 350)
  const goal = numberInRange(data.goal, 500, 10_000)
  const gender = profile.gender
  const activity = profile.activity
  const language = profile.language
  if (!name || age === null || height === null || weight === null || goal === null) return null
  if (gender !== 'male' && gender !== 'female' && gender !== 'other') return null
  if (activity !== 'low' && activity !== 'moderate' && activity !== 'high') return null

  return {
    name,
    age,
    height,
    weight,
    goal: Math.round(goal),
    gender,
    activity,
    language: language === 'en' ? 'en' : 'ru',
    updatedAt: new Date().toISOString(),
  }
}

async function telegramRequest(env: Env, method: string, payload: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) console.error(`Telegram ${method} failed: ${await response.text()}`)
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

async function handleProfileSync(request: Request, env: Env) {
  let payload: { initData?: unknown; profile?: unknown; goal?: unknown }
  try {
    payload = await request.json() as { initData?: unknown; profile?: unknown; goal?: unknown }
  } catch {
    return jsonResponse(env, { ok: false, error: 'Invalid JSON' }, 400)
  }

  const userId = await telegramUserIdFromInitData(payload.initData, env.TELEGRAM_BOT_TOKEN)
  if (!userId) return jsonResponse(env, { ok: false, error: 'Invalid Telegram authorization' }, 401)

  const profile = parseProfile(payload)
  if (!profile) return jsonResponse(env, { ok: false, error: 'Invalid profile' }, 422)
  await env.PROFILES.put(profileKey(userId), JSON.stringify(profile))
  return jsonResponse(env, { ok: true })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS' && url.pathname === '/profile') return new Response(null, { status: 204, headers: corsHeaders(env) })
    if (request.method === 'POST' && url.pathname === '/profile') return handleProfileSync(request, env)

    if (request.method === 'GET') {
      if (url.pathname === '/setup') {
        const webhook = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: url.origin, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] }),
        })
        return new Response(await webhook.text(), { status: webhook.ok ? 200 : 500 })
      }
      return new Response('Aquora Telegram bot is online.', { status: 200 })
    }

    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (!env.TELEGRAM_WEBHOOK_SECRET || receivedSecret !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('Forbidden', { status: 403 })

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
    } else if (command === '/profile') {
      const profile = message.from ? await env.PROFILES.get<StoredProfile>(profileKey(message.from.id), 'json') : null
      await sendMessage(env, message.chat.id, profile ? profileMessage(profile) : emptyProfileMessage())
    }

    return new Response('ok')
  },
}
