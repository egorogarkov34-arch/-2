interface Env {
  AQUA_APP_URL: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  PROFILES: ProfileStorage
}

interface KvListResult {
  keys: Array<{ name: string }>
  list_complete: boolean
  cursor?: string
}

interface ProfileStorage {
  get<T>(key: string, type: 'json'): Promise<T | null>
  put(key: string, value: string): Promise<void>
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<KvListResult>
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

type ReminderInterval = '30m' | '1h' | '2h' | '3h'
type Language = 'ru' | 'en'

interface StoredProfile {
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  height: number
  weight: number
  activity: 'low' | 'moderate' | 'high'
  goal: number
  language: Language
  reminders: boolean
  reminderInterval: ReminderInterval
  todayAmount: number
  todayDate: string
  timezoneOffsetMinutes: number
  lastReminderSlot?: string
  updatedAt: string
}

interface ProfileSyncPayload {
  initData?: unknown
  profile?: unknown
  goal?: unknown
  todayAmount?: unknown
  todayDate?: unknown
  timezoneOffsetMinutes?: unknown
}

const encoder = new TextEncoder()
const WEB_APP_MAX_AGE_SECONDS = 86_400
const DEFAULT_AQUA_APP_URL = 'https://aquora-water.onrender.com'
const REMINDER_START_HOUR = 9
const REMINDER_END_HOUR = 22

const welcomeText = `💧 <b>Добро пожаловать в Aquora Water!</b>

Следить за водным балансом стало проще и приятнее.
Отмечай каждый стакан воды, наблюдай прогресс и формируй полезную привычку каждый день.
<b>Начни прямо сейчас — сделай первый глоток на пути к лучшему самочувствию.</b>

💧 <b>Welcome to Aquora Water!</b>

Staying hydrated has never been this simple.
Track every glass of water, monitor your progress, and build a healthy habit every day.
<b>Start now and take your first step toward better hydration.</b>`

const helpText = `💧 <b>Команды Aquora Water</b>

/start — приветствие и Mini App
/open — открыть трекер
/help — помощь`

const botDescription = '💧 Aquora Water — ваш умный трекер воды.\n\nНажмите кнопку Start или отправьте /start, чтобы открыть приложение и начать следить за водным балансом.\n\nPress Start or send /start to begin.'

const botCommands = [
  { command: 'start', description: 'Начать и открыть трекер' },
  { command: 'open', description: 'Открыть трекер воды' },
  { command: 'help', description: 'Помощь' },
]

function miniAppKeyboard(appUrl: string) {
  return {
    inline_keyboard: [[{
      text: '💧 Open tracker',
      web_app: { url: appUrl },
    }]],
  }
}

function appUrl(env: Env) {
  return env.AQUA_APP_URL || DEFAULT_AQUA_APP_URL
}

function profileKey(userId: number) {
  return `profile:${userId}`
}

function chatKey(userId: number) {
  return `chat:${userId}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character] ?? character)
}

function corsHeaders(env: Env) {
  let origin = '*'
  try {
    origin = new URL(appUrl(env)).origin
  } catch {
    // The Mini App can recover as soon as a valid URL is configured.
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

function parseInterval(value: unknown): ReminderInterval {
  if (value === '30m' || value === '1h' || value === '2h' || value === '3h') return value
  if (typeof value === 'string') {
    if (value.includes('30')) return '30m'
    if (value.includes('3')) return '3h'
    if (value.includes('1') || value.includes('Every hour') || value.includes('Каждый час')) return '1h'
  }
  return '2h'
}

function parseProfile(payload: ProfileSyncPayload): StoredProfile | null {
  if (!payload.profile || typeof payload.profile !== 'object') return null
  const profile = payload.profile as Record<string, unknown>
  const name = typeof profile.name === 'string' ? profile.name.trim().slice(0, 80) : ''
  const age = numberInRange(profile.age, 12, 120)
  const height = numberInRange(profile.height, 100, 250)
  const weight = numberInRange(profile.weight, 25, 350)
  const goal = numberInRange(payload.goal, 500, 10_000)
  const todayAmount = numberInRange(payload.todayAmount, 0, 100_000) ?? 0
  const timezoneOffsetMinutes = numberInRange(payload.timezoneOffsetMinutes, -840, 840) ?? 0
  const todayDate = typeof payload.todayDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.todayDate) ? payload.todayDate : ''
  const gender = profile.gender
  const activity = profile.activity
  const language: Language = profile.language === 'en' ? 'en' : 'ru'
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
    language,
    reminders: profile.reminders !== false,
    reminderInterval: parseInterval(profile.reminderInterval),
    todayAmount: Math.round(todayAmount),
    todayDate,
    timezoneOffsetMinutes: Math.round(timezoneOffsetMinutes),
    updatedAt: new Date().toISOString(),
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

function localTime(offsetMinutes: number) {
  return new Date(Date.now() - offsetMinutes * 60_000)
}

function localDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function intervalMinutes(interval: ReminderInterval) {
  return interval === '30m' ? 30 : interval === '1h' ? 60 : interval === '3h' ? 180 : 120
}

function formatAmount(amount: number, language: Language) {
  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU').format(Math.round(amount))
}

function reminderText(profile: StoredProfile, todayAmount: number, userId: number, now: Date) {
  const remaining = Math.max(profile.goal - todayAmount, 0)
  const percent = Math.min(100, Math.round((todayAmount / profile.goal) * 100))
  const index = (userId + Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / intervalMinutes(profile.reminderInterval))) % 4
  const isEnglish = profile.language === 'en'
  const messages = isEnglish
    ? [
      'A small glass now will make the rest of the day feel easier.',
      'Your body will appreciate a quick water break.',
      'Steady sips are the simplest way to reach your target.',
      'Take a moment for yourself and add a little water.',
    ]
    : [
      'Небольшой стакан сейчас — и до цели станет заметно ближе.',
      'Организм будет благодарен за короткую водную паузу.',
      'Регулярные глотки — самый простой путь к дневной норме.',
      'Сделайте минуту заботы о себе и выпейте немного воды.',
    ]
  const title = isEnglish ? 'Time for water' : 'Время для воды'
  const progress = isEnglish ? 'Today' : 'Сегодня'
  const left = isEnglish ? 'Left to target' : 'До цели осталось'
  const open = isEnglish ? 'Open Aquora to log it' : 'Откройте Aquora, чтобы отметить воду'

  return `💧 <b>${title}</b>\n\n${messages[index]}\n\n<b>${progress}:</b> ${formatAmount(todayAmount, profile.language)} / ${formatAmount(profile.goal, profile.language)} ml (${percent}%)\n<b>${left}:</b> ${formatAmount(remaining, profile.language)} ml\n\n<i>${open}</i>`
}

async function getChatId(env: Env, userId: number) {
  const savedChatId = await env.PROFILES.get<number>(chatKey(userId), 'json')
  return typeof savedChatId === 'number' ? savedChatId : userId
}

async function processReminder(env: Env, userId: number, profile: StoredProfile) {
  // Older profile records do not contain this consent flag, so they must never be opted in silently.
  if (profile.reminders !== true) return

  const now = localTime(profile.timezoneOffsetMinutes)
  const hour = now.getUTCHours()
  if (hour < REMINDER_START_HOUR || hour >= REMINDER_END_HOUR) return

  const todayDate = localDateKey(now)
  const todayAmount = profile.todayDate === todayDate ? profile.todayAmount : 0
  if (todayAmount >= profile.goal) return

  const minutes = hour * 60 + now.getUTCMinutes()
  const slot = `${todayDate}:${Math.floor(minutes / intervalMinutes(profile.reminderInterval))}`
  if (profile.lastReminderSlot === slot) return

  const chatId = await getChatId(env, userId)
  const sent = await sendMessage(env, chatId, reminderText(profile, todayAmount, userId, now))
  if (sent) await env.PROFILES.put(profileKey(userId), JSON.stringify({ ...profile, lastReminderSlot: slot }))
}

async function sendScheduledReminders(env: Env) {
  let cursor: string | undefined
  do {
    const page = await env.PROFILES.list({ prefix: 'profile:', cursor, limit: 100 })
    for (const key of page.keys) {
      const userId = Number(key.name.slice('profile:'.length))
      if (!Number.isSafeInteger(userId)) continue
      const profile = await env.PROFILES.get<StoredProfile>(key.name, 'json')
      if (!profile) continue
      await processReminder(env, userId, profile)
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
}

async function handleProfileSync(request: Request, env: Env) {
  let payload: ProfileSyncPayload
  try {
    payload = await request.json() as ProfileSyncPayload
  } catch {
    return jsonResponse(env, { ok: false, error: 'Invalid JSON' }, 400)
  }

  const userId = await telegramUserIdFromInitData(payload.initData, env.TELEGRAM_BOT_TOKEN)
  if (!userId) return jsonResponse(env, { ok: false, error: 'Invalid Telegram authorization' }, 401)

  const profile = parseProfile(payload)
  if (!profile) return jsonResponse(env, { ok: false, error: 'Invalid profile' }, 422)
  const existing = await env.PROFILES.get<StoredProfile>(profileKey(userId), 'json')
  await env.PROFILES.put(profileKey(userId), JSON.stringify({ ...profile, lastReminderSlot: existing?.lastReminderSlot }))
  return jsonResponse(env, { ok: true })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS' && url.pathname === '/profile') return new Response(null, { status: 204, headers: corsHeaders(env) })
    if (request.method === 'POST' && url.pathname === '/profile') return handleProfileSync(request, env)

    if (request.method === 'GET') {
      if (url.pathname === '/setup') {
        const [webhook, description, commands] = await Promise.all([
          telegramRequest(env, 'setWebhook', { url: url.origin, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message'] }),
          telegramRequest(env, 'setMyDescription', { description: botDescription }),
          telegramRequest(env, 'setMyCommands', { commands: botCommands }),
        ])
        return jsonResponse(env, { ok: webhook && description && commands })
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
    if (message.from) await env.PROFILES.put(chatKey(message.from.id), JSON.stringify(message.chat.id))

    const command = commandFrom(message)
    if (command === '/start' || command === '/open') {
      await sendMessage(env, message.chat.id, welcomeText)
    } else if (command === '/help') {
      await sendMessage(env, message.chat.id, helpText)
    }

    return new Response('ok')
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    await sendScheduledReminders(env)
  },
}
