interface Env {
  AQUA_APP_URL: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_WEBHOOK_SECRET: string
  OWNER_TELEGRAM_ID?: string
  AQUORA_USERS?: KVNamespace
}

interface TelegramUser { id: number; language_code?: string }
interface TelegramMessage { chat: { id: number }; from?: TelegramUser; text?: string }
interface TelegramUpdate { message?: TelegramMessage }
interface RequestBucket { startedAt: number; count: number }

type Language = 'ru' | 'en'
type ReminderInterval = 30 | 60 | 120 | 180
type AdminRole = 'owner' | 'admin'

interface ProfileSnapshot {
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  height: number
  weight: number
  activity: 'low' | 'moderate' | 'high'
}

interface ReminderSettings {
  enabled: boolean
  intervalMinutes: ReminderInterval
  timeZone: string
}

interface ReminderRecord {
  userId: number
  chatId: number
  goal: number
  todayAmount: number
  dateKey: string
  language: Language
  reminders: ReminderSettings
  reminderIndex: number
  lastReminderAt?: number
  lastReminderDateKey?: string
  completedDateKey?: string
  deliveryBlocked?: boolean
  profile?: ProfileSnapshot
  updatedAt: number
}

interface ReminderStatePayload {
  initData: string
  dateKey: string
  goal: number
  todayAmount: number
  language: Language
  reminders: ReminderSettings
  profile?: ProfileSnapshot
}

interface AdminGrant {
  userId: number
  role: 'admin'
  addedAt: number
  addedBy: number
}

interface AdminRequestPayload { initData: string }
interface AdminRoleRequestPayload extends AdminRequestPayload {
  action: 'grant' | 'revoke'
  userId: number
}

const DEFAULT_AQUA_APP_URL = 'https://aquora-water.onrender.com'
const MAX_WEBHOOK_BODY_BYTES = 64 * 1024
const MAX_STATE_BODY_BYTES = 16 * 1024
const INVALID_REQUEST_WINDOW_MS = 60_000
const MAX_INVALID_REQUESTS_PER_WINDOW = 40
const INIT_DATA_MAX_AGE_SECONDS = 86_400
const REMINDER_START_HOUR = 9
const REMINDER_END_HOUR = 22
const REMINDER_BATCH_SIZE = 20
const invalidRequestBuckets = new Map<string, RequestBucket>()
const textEncoder = new TextEncoder()

const decodeUtf8 = (encoded: string) => new TextDecoder().decode(Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)))
const waterEmoji = String.fromCodePoint(0x1F4A7)
const welcomeText = decodeUtf8('8J+SpyA8Yj7QlNC+0LHRgNC+INC/0L7QttCw0LvQvtCy0LDRgtGMINCyIEFxdW9yYSBXYXRlciE8L2I+CgrQodC70LXQtNC40YLRjCDQt9CwINCy0L7QtNC90YvQvCDQsdCw0LvQsNC90YHQvtC8INGB0YLQsNC70L4g0L/RgNC+0YnQtSDQuCDQv9GA0LjRj9GC0L3QtdC1LgrQntGC0LzQtdGH0LDQuSDQutCw0LbQtNGL0Lkg0YHRgtCw0LrQsNC9INCy0L7QtNGLLCDQvdCw0LHQu9GO0LTQsNC5LCDQutCw0Log0YHQuNC70YPRjdGCINC/0L7RgdGC0LXQv9C10L3QvdC+INC30LDQv9C+0LvQvdGP0LXRgtGB0Y8sINC+0YLRgdC70LXQttC40LLQsNC5INC/0YDQvtCz0YDQtdGB0YEg0Lgg0YTQvtGA0LzQuNGA0YPQuSDQv9C+0LvQtdC30L3Rg9GOINC/0YDQuNCy0YvRh9C60YMg0LrQsNC20LTRi9C5INC00LXQvdGMLgo8Yj7QndCw0YfQvdC4INC/0YDRj9C80L4g0YHQtdC50YfQsNGBIOKAlCDRgdC00LXQu9Cw0Lkg0L/QtdGA0LLRi9C5INCz0LvQvtGC0L7QuiDQvdCwINC/0YPRgtC4INC6INC70YPRh9GI0LXQvNGDINGB0LDQvNC+0YfRg9Cy0YHRgtCy0LjRji48L2I+Cgrwn5KnIDxiPldlbGNvbWUgdG8gQXF1b3JhIFdhdGVyITwvYj4KClN0YXlpbmcgaHlkcmF0ZWQgaGFzIG5ldmVyIGJlZW4gdGhpcyBzaW1wbGUuClRyYWNrIGV2ZXJ5IGdsYXNzIG9mIHdhdGVyLCB3YXRjaCB5b3VyIGJvZHkgZmlsbCB1cCBhcyB5b3UgcmVhY2ggeW91ciBnb2FsLCBtb25pdG9yIHlvdXIgcHJvZ3Jlc3MsIGFuZCBidWlsZCBhIGhlYWx0aHkgaGFiaXQgZXZlcnkgZGF5Lgo8Yj5TdGFydCBub3cgYW5kIHRha2UgeW91ciBmaXJzdCBzdGVwIHRvd2FyZCBiZXR0ZXIgaHlkcmF0aW9uLjwvYj4=')
const openText = decodeUtf8('8J+SpyA8Yj5BcXVvcmEgV2F0ZXI8L2I+CgrQndCw0LbQvNC40YLQtSDQutC90L7Qv9C60YMg0L3QuNC20LUsINGH0YLQvtCx0Ysg0L7RgtC60YDRi9GC0Ywg0YLRgNC10LrQtdGALgoKVGFwIHRoZSBidXR0b24gYmVsb3cgdG8gb3BlbiB0aGUgdHJhY2tlci4=')
const helpText = decodeUtf8('8J+SpyA8Yj7QmtC+0LzQsNC90LTRiyBBcXVvcmEgV2F0ZXI8L2I+Cgovc3RhcnQg4oCUINC/0YDQuNCy0LXRgtGB0YLQstC40LUg0LggTWluaSBBcHAKL29wZW4g4oCUINC+0YLQutGA0YvRgtGMINGC0YDQtdC60LXRgAovaGVscCDigJQg0YHQv9C40YHQvtC6INC60L7QvNCw0L3QtA==')

const reminderCopies: Record<Language, Array<{ title: string; body: string; today: string; remaining: string; open: string }>> = {
  ru: [
    { title: `${waterEmoji} <b>Время для воды</b>`, body: 'Сделайте короткую паузу и выпейте немного воды.', today: '<b>Сегодня:</b>', remaining: '<b>До цели осталось:</b>', open: '<i>Откройте Aquora, чтобы отметить воду.</i>' },
    { title: `${waterEmoji} <b>Небольшая забота о себе</b>`, body: 'Один стакан воды поможет поддержать ваш ритм.', today: '<b>Ваш прогресс:</b>', remaining: '<b>Осталось:</b>', open: '<i>Продолжите путь в Aquora.</i>' },
    { title: `${waterEmoji} <b>Пора сделать глоток</b>`, body: 'Ваш водный баланс ждёт следующую запись.', today: '<b>Выпито сегодня:</b>', remaining: '<b>До дневной цели:</b>', open: '<i>Откройте трекер и добавьте воду.</i>' },
  ],
  en: [
    { title: `${waterEmoji} <b>Time for water</b>`, body: 'Take a short break and have some water.', today: '<b>Today:</b>', remaining: '<b>Left to goal:</b>', open: '<i>Open Aquora to log your water.</i>' },
    { title: `${waterEmoji} <b>A small moment of care</b>`, body: 'One glass of water can help you keep your rhythm.', today: '<b>Your progress:</b>', remaining: '<b>Remaining:</b>', open: '<i>Continue your progress in Aquora.</i>' },
    { title: `${waterEmoji} <b>Time for a sip</b>`, body: 'Your water balance is waiting for the next entry.', today: '<b>Drunk today:</b>', remaining: '<b>To daily goal:</b>', open: '<i>Open the tracker and add water.</i>' },
  ],
}

const russianReminderCopies = [
  { title: `${waterEmoji} <b>\u0412\u0440\u0435\u043c\u044f \u0432\u043e\u0434\u044b</b>`, body: '\u0421\u0434\u0435\u043b\u0430\u0439\u0442\u0435 \u0433\u043b\u043e\u0442\u043e\u043a \u0432\u043e\u0434\u044b.', today: '<b>\u0421\u0435\u0433\u043e\u0434\u043d\u044f:</b>', remaining: '<b>\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c:</b>', open: '<i>\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 Aquora, \u0447\u0442\u043e\u0431\u044b \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u043e\u0434\u0443.</i>' },
  { title: `${waterEmoji} <b>\u041d\u0435\u0431\u043e\u043b\u044c\u0448\u0430\u044f \u043f\u0430\u0443\u0437\u0430</b>`, body: '\u041e\u0434\u0438\u043d \u0441\u0442\u0430\u043a\u0430\u043d \u0432\u043e\u0434\u044b \u043f\u043e\u043c\u043e\u0436\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0440\u0438\u0442\u043c.', today: '<b>\u0412\u0430\u0448 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441:</b>', remaining: '<b>\u041e\u0441\u0442\u0430\u043b\u043e\u0441\u044c:</b>', open: '<i>\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u0435 \u0432 Aquora.</i>' },
  { title: `${waterEmoji} <b>\u041f\u043e\u0440\u0430 \u043f\u0438\u0442\u044c \u0432\u043e\u0434\u0443</b>`, body: '\u0412\u0430\u0448 \u0432\u043e\u0434\u043d\u044b\u0439 \u0431\u0430\u043b\u0430\u043d\u0441 \u0436\u0434\u0451\u0442 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0443\u044e \u0437\u0430\u043f\u0438\u0441\u044c.', today: '<b>\u0412\u044b\u043f\u0438\u0442\u043e:</b>', remaining: '<b>\u0414\u043e \u0446\u0435\u043b\u0438:</b>', open: '<i>\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0442\u0440\u0435\u043a\u0435\u0440 \u0438 \u043e\u0442\u043c\u0435\u0442\u044c\u0442\u0435 \u0432\u043e\u0434\u0443.</i>' },
] as const

function appUrl(env: Env) { return env.AQUA_APP_URL || DEFAULT_AQUA_APP_URL }
function userKey(userId: number) { return `user:${userId}` }
function adminKey(userId: number) { return `admin:${userId}` }
function configuredOwnerId(env: Env) {
  const value = Number(env.OWNER_TELEGRAM_ID)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}
function miniAppKeyboard(url: string) { return { inline_keyboard: [[{ text: `${waterEmoji} Open tracker`, web_app: { url } }]] } }
function adminKeyboard(url: string) { return { inline_keyboard: [[{ text: '\u{1F6E1}\uFE0F \u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0430\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u044c', web_app: { url: `${url}?admin=1` } }]] } }
function securityHeaders(contentType = 'text/plain; charset=utf-8') { return { 'content-type': contentType, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" } }
function textResponse(text: string, status = 200) { return new Response(text, { status, headers: securityHeaders() }) }
function jsonResponse(payload: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) { return new Response(JSON.stringify(payload), { status, headers: { ...securityHeaders('application/json; charset=utf-8'), ...extraHeaders } }) }

function stringsMatch(left: string, right: string) { if (left.length !== right.length) return false; let difference = 0; for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index); return difference === 0 }
function tooManyInvalidRequests(request: Request) { const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'; const now = Date.now(); const existing = invalidRequestBuckets.get(ip); const bucket = !existing || now - existing.startedAt >= INVALID_REQUEST_WINDOW_MS ? { startedAt: now, count: 1 } : { ...existing, count: existing.count + 1 }; invalidRequestBuckets.set(ip, bucket); if (invalidRequestBuckets.size > 512) for (const [key, value] of invalidRequestBuckets) if (now - value.startedAt >= INVALID_REQUEST_WINDOW_MS) invalidRequestBuckets.delete(key); return bucket.count > MAX_INVALID_REQUESTS_PER_WINDOW }

async function telegramRequest(env: Env, method: string, payload: Record<string, unknown>) {
  try { const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) console.error(`Telegram ${method} failed: ${response.status}`); return { ok: response.ok, status: response.status } } catch (error) { console.error(`Telegram ${method} failed`, error); return { ok: false, status: 0 } }
}
async function sendMessage(env: Env, chatId: number, text: string) { return telegramRequest(env, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: miniAppKeyboard(appUrl(env)) }) }
async function sendAdminMessage(env: Env, chatId: number) {
  return telegramRequest(env, 'sendMessage', {
    chat_id: chatId,
    text: '\u{1F6E1}\uFE0F <b>\u0410\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u044c Aquora</b>\n\n\u0417\u0434\u0435\u0441\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0441\u0432\u043e\u0434\u043d\u0430\u044f \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u0434\u043e\u0441\u0442\u0443\u043f\u043e\u043c.\n\n\u0414\u043e\u0441\u0442\u0443\u043f \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435.',
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: adminKeyboard(appUrl(env)),
  })
}
function commandFrom(message: TelegramMessage) { return (message.text?.trim().split(/\s+/)[0] ?? '').split('@')[0].toLowerCase() }
function isLanguage(value: unknown): value is Language { return value === 'ru' || value === 'en' }
function isReminderInterval(value: unknown): value is ReminderInterval { return value === 30 || value === 60 || value === 120 || value === 180 }
function isDateKey(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) }
function isFiniteNumber(value: unknown, min: number, max: number) { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max }
function cleanName(value: unknown) { return typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, 64) : '' }
function parseProfileSnapshot(value: unknown): ProfileSnapshot | null {
  if (!value || typeof value !== 'object') return null
  const profile = value as Partial<ProfileSnapshot>
  if (!cleanName(profile.name) || !isFiniteNumber(profile.age, 10, 100) || !isFiniteNumber(profile.height, 100, 250) || !isFiniteNumber(profile.weight, 25, 350)) return null
  if ((profile.gender !== 'male' && profile.gender !== 'female' && profile.gender !== 'other') || (profile.activity !== 'low' && profile.activity !== 'moderate' && profile.activity !== 'high')) return null
  return { name: cleanName(profile.name), age: Math.round(profile.age), gender: profile.gender, height: Math.round(profile.height), weight: Math.round(profile.weight), activity: profile.activity }
}
function normalizeTimeZone(value: unknown) { if (typeof value !== 'string' || value.length > 80) return 'Europe/Moscow'; try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return value } catch { return 'Europe/Moscow' } }

function localDate(timeZone: string, now = new Date()) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: normalizeTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now); const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return { dateKey: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour) } }
function parseReminderState(value: unknown): ReminderStatePayload | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Partial<ReminderStatePayload>
  if (typeof payload.initData !== 'string' || payload.initData.length < 10 || payload.initData.length > 12_000 || !isDateKey(payload.dateKey) || !isFiniteNumber(payload.goal, 500, 10_000) || !isFiniteNumber(payload.todayAmount, 0, 100_000) || !isLanguage(payload.language) || !payload.reminders || typeof payload.reminders !== 'object') return null
  const reminders = payload.reminders as Partial<ReminderSettings>
  if (typeof reminders.enabled !== 'boolean' || !isReminderInterval(reminders.intervalMinutes)) return null
  const profile = payload.profile === undefined ? undefined : parseProfileSnapshot(payload.profile)
  if (payload.profile !== undefined && !profile) return null
  return { initData: payload.initData, dateKey: payload.dateKey, goal: Math.round(payload.goal), todayAmount: Math.round(payload.todayAmount), language: payload.language, reminders: { enabled: reminders.enabled, intervalMinutes: reminders.intervalMinutes, timeZone: normalizeTimeZone(reminders.timeZone) }, profile }
}

function toHex(value: ArrayBuffer) { return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('') }
async function validateInitData(initData: string, env: Env): Promise<TelegramUser | null> {
  if (!env.TELEGRAM_BOT_TOKEN) return null
  const params = new URLSearchParams(initData); const hash = params.get('hash'); const authDate = Number(params.get('auth_date')); const rawUser = params.get('user')
  if (!hash || !rawUser || !Number.isFinite(authDate) || authDate <= 0 || Math.abs(Date.now() / 1000 - authDate) > INIT_DATA_MAX_AGE_SECONDS) return null
  params.delete('hash')
  const dataCheckString = [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join('\n')
  const webAppKey = await crypto.subtle.importKey('raw', textEncoder.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secret = await crypto.subtle.sign('HMAC', webAppKey, textEncoder.encode(env.TELEGRAM_BOT_TOKEN))
  const dataCheckKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  if (!stringsMatch(toHex(await crypto.subtle.sign('HMAC', dataCheckKey, textEncoder.encode(dataCheckString))), hash)) return null
  try { const user = JSON.parse(rawUser) as TelegramUser; return Number.isSafeInteger(user.id) && user.id > 0 ? user : null } catch { return null }
}

function corsHeaders(request: Request, env: Env) { const origin = request.headers.get('Origin'); try { return origin && origin === new URL(appUrl(env)).origin ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' } : null } catch { return null } }
async function readRecord(env: Env, userId: number) { if (!env.AQUORA_USERS) return null; try { const value = await env.AQUORA_USERS.get<ReminderRecord>(userKey(userId), 'json'); return value && Number.isSafeInteger(value.userId) ? value : null } catch (error) { console.error('KV read failed', error); return null } }
async function writeRecord(env: Env, record: ReminderRecord) { if (!env.AQUORA_USERS) return false; try { await env.AQUORA_USERS.put(userKey(record.userId), JSON.stringify(record)); return true } catch (error) { console.error('KV write failed', error); return false } }

async function readAdminGrant(env: Env, userId: number) {
  if (!env.AQUORA_USERS) return null
  try {
    const value = await env.AQUORA_USERS.get<AdminGrant>(adminKey(userId), 'json')
    return value?.role === 'admin' && value.userId === userId ? value : null
  } catch (error) { console.error('Admin role read failed', error); return null }
}

async function adminRole(env: Env, userId: number): Promise<AdminRole | null> {
  if (configuredOwnerId(env) === userId) return 'owner'
  return await readAdminGrant(env, userId) ? 'admin' : null
}

function isAdminRequest(value: unknown): value is AdminRequestPayload {
  return Boolean(value && typeof value === 'object' && typeof (value as Partial<AdminRequestPayload>).initData === 'string')
}

function isAdminRoleRequest(value: unknown): value is AdminRoleRequestPayload {
  if (!isAdminRequest(value)) return false
  const request = value as Partial<AdminRoleRequestPayload>
  return (request.action === 'grant' || request.action === 'revoke') && Number.isSafeInteger(request.userId) && Number(request.userId) > 0
}

async function authenticatedAdmin(request: Request, env: Env, cors: Record<string, string>) {
  let body: unknown
  try { body = await request.json() } catch { return { response: jsonResponse({ ok: false, error: 'invalid_request' }, 400, cors) } }
  if (!isAdminRequest(body)) return { response: jsonResponse({ ok: false, error: 'invalid_request' }, 400, cors) }
  const user = await validateInitData(body.initData, env)
  if (!user) return { response: jsonResponse({ ok: false, error: 'unauthorized' }, 401, cors) }
  const role = await adminRole(env, user.id)
  if (!role) return { response: jsonResponse({ ok: false, error: 'forbidden' }, 403, cors) }
  return { body, user, role }
}

function visibleAmount(record: ReminderRecord) {
  return record.dateKey === localDate(record.reminders?.timeZone ?? 'Europe/Moscow').dateKey ? Math.max(0, record.todayAmount) : 0
}

function userDashboardItem(record: ReminderRecord) {
  const amount = visibleAmount(record)
  return {
    id: record.userId,
    name: record.profile?.name || `User #${record.userId}`,
    language: record.language,
    activity: record.profile?.activity ?? 'moderate',
    goal: record.goal,
    todayAmount: amount,
    progress: record.goal > 0 ? Math.round((amount / record.goal) * 100) : 0,
    remindersEnabled: Boolean(record.reminders?.enabled && !record.deliveryBlocked),
    updatedAt: record.updatedAt,
    lastReminderAt: record.lastReminderAt ?? null,
  }
}

async function readAllUserRecords(env: Env) {
  if (!env.AQUORA_USERS) return [] as ReminderRecord[]
  const records: ReminderRecord[] = []
  let cursor: string | undefined
  do {
    const page = await env.AQUORA_USERS.list({ prefix: 'user:', cursor, limit: 1_000 })
    const batch = await Promise.all(page.keys.map((key) => env.AQUORA_USERS?.get<ReminderRecord>(key.name, 'json')))
    for (const record of batch) if (record && Number.isSafeInteger(record.userId) && isFiniteNumber(record.goal, 500, 10_000)) records.push(record)
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return records
}

async function readAdminGrants(env: Env) {
  if (!env.AQUORA_USERS) return [] as AdminGrant[]
  const grants: AdminGrant[] = []
  let cursor: string | undefined
  do {
    const page = await env.AQUORA_USERS.list({ prefix: 'admin:', cursor, limit: 1_000 })
    const batch = await Promise.all(page.keys.map((key) => env.AQUORA_USERS?.get<AdminGrant>(key.name, 'json')))
    for (const grant of batch) if (grant?.role === 'admin' && Number.isSafeInteger(grant.userId)) grants.push(grant)
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  return grants
}

async function dashboardPayload(env: Env, role: AdminRole) {
  const [records, grants] = await Promise.all([readAllUserRecords(env), readAdminGrants(env)])
  const users = records.map(userDashboardItem).sort((left, right) => right.updatedAt - left.updatedAt).slice(0, 100)
  const activeToday = records.filter((record) => visibleAmount(record) > 0)
  const totalTodayAmount = activeToday.reduce((sum, record) => sum + visibleAmount(record), 0)
  const ownerId = configuredOwnerId(env)
  const recordsById = new Map(records.map((record) => [record.userId, record]))
  const admins = [
    ...(ownerId ? [{ id: ownerId, role: 'owner' as const, name: recordsById.get(ownerId)?.profile?.name || `Owner #${ownerId}` }] : []),
    ...grants.filter((grant) => grant.userId !== ownerId).map((grant) => ({ id: grant.userId, role: 'admin' as const, name: recordsById.get(grant.userId)?.profile?.name || `Admin #${grant.userId}` })),
  ]
  return {
    ok: true,
    role,
    generatedAt: Date.now(),
    metrics: {
      totalUsers: records.length,
      activeToday: activeToday.length,
      remindersEnabled: records.filter((record) => record.reminders?.enabled && !record.deliveryBlocked).length,
      goalsReachedToday: records.filter((record) => visibleAmount(record) >= record.goal).length,
      totalTodayAmount,
      averageTodayAmount: activeToday.length ? Math.round(totalTodayAmount / activeToday.length) : 0,
      averageGoal: records.length ? Math.round(records.reduce((sum, record) => sum + record.goal, 0) / records.length) : 0,
    },
    users,
    admins,
  }
}

async function handleAdminDashboard(request: Request, env: Env) {
  const cors = corsHeaders(request, env)
  if (request.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : textResponse('Forbidden', 403)
  if (!cors || request.method !== 'POST') return textResponse('Forbidden', 403)
  const auth = await authenticatedAdmin(request, env, cors)
  if ('response' in auth) return auth.response
  if (!env.AQUORA_USERS) return jsonResponse({ ok: false, error: 'storage_not_configured' }, 503, cors)
  return jsonResponse(await dashboardPayload(env, auth.role), 200, cors)
}

async function handleAdminRoles(request: Request, env: Env) {
  const cors = corsHeaders(request, env)
  if (request.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : textResponse('Forbidden', 403)
  if (!cors || request.method !== 'POST') return textResponse('Forbidden', 403)
  const auth = await authenticatedAdmin(request, env, cors)
  if ('response' in auth) return auth.response
  if (auth.role !== 'owner') return jsonResponse({ ok: false, error: 'owner_required' }, 403, cors)
  if (!isAdminRoleRequest(auth.body)) return jsonResponse({ ok: false, error: 'invalid_request' }, 400, cors)
  const ownerId = configuredOwnerId(env)
  if (!env.AQUORA_USERS || !ownerId) return jsonResponse({ ok: false, error: 'storage_not_configured' }, 503, cors)
  if (auth.body.userId === ownerId) return jsonResponse({ ok: false, error: 'owner_role_is_fixed' }, 400, cors)
  try {
    if (auth.body.action === 'grant') await env.AQUORA_USERS.put(adminKey(auth.body.userId), JSON.stringify({ userId: auth.body.userId, role: 'admin', addedAt: Date.now(), addedBy: auth.user.id } satisfies AdminGrant))
    else await env.AQUORA_USERS.delete(adminKey(auth.body.userId))
  } catch (error) { console.error('Admin role write failed', error); return jsonResponse({ ok: false, error: 'storage_unavailable' }, 503, cors) }
  return jsonResponse(await dashboardPayload(env, auth.role), 200, cors)
}

async function rememberChat(env: Env, message: TelegramMessage) {
  const userId = message.from?.id
  if (!userId || message.chat.id !== userId || !env.AQUORA_USERS) return
  const existing = await readRecord(env, userId)
  const record: ReminderRecord = existing ?? { userId, chatId: message.chat.id, goal: 2000, todayAmount: 0, dateKey: localDate('Europe/Moscow').dateKey, language: message.from?.language_code === 'ru' ? 'ru' : 'en', reminders: { enabled: false, intervalMinutes: 120, timeZone: 'Europe/Moscow' }, reminderIndex: 0, updatedAt: Date.now() }
  await writeRecord(env, { ...record, chatId: message.chat.id, deliveryBlocked: false, updatedAt: Date.now() })
}

async function handleReminderState(request: Request, env: Env) {
  const cors = corsHeaders(request, env)
  if (request.method === 'OPTIONS') return cors ? new Response(null, { status: 204, headers: cors }) : textResponse('Forbidden', 403)
  if (!cors || request.method !== 'POST') return textResponse('Forbidden', 403)
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(contentLength) && contentLength > MAX_STATE_BODY_BYTES) return jsonResponse({ ok: false }, 413, cors)
  let payload: ReminderStatePayload | null = null
  try { payload = parseReminderState(await request.json()) } catch { /* validated below */ }
  const user = payload && await validateInitData(payload.initData, env)
  if (!payload || !user) return tooManyInvalidRequests(request) ? jsonResponse({ ok: false }, 429, cors) : jsonResponse({ ok: false }, 401, cors)
  if (!env.AQUORA_USERS) return jsonResponse({ ok: false, error: 'storage_not_configured' }, 503, cors)
  const existing = await readRecord(env, user.id)
  const record: ReminderRecord = { userId: user.id, chatId: existing?.chatId ?? user.id, goal: payload.goal, todayAmount: payload.todayAmount, dateKey: payload.dateKey, language: payload.language, reminders: payload.reminders, profile: payload.profile ?? existing?.profile, reminderIndex: existing?.reminderIndex ?? 0, lastReminderAt: existing?.lastReminderAt, lastReminderDateKey: existing?.lastReminderDateKey, completedDateKey: existing?.completedDateKey, deliveryBlocked: false, updatedAt: Date.now() }
  if (!await writeRecord(env, record)) return jsonResponse({ ok: false, error: 'storage_unavailable' }, 503, cors)
  return jsonResponse({ ok: true }, 200, cors)
}

function reminderText(record: ReminderRecord, amount: number) {
  const safeCopy = record.language === 'ru'
    ? russianReminderCopies[record.reminderIndex % russianReminderCopies.length]
    : reminderCopies.en[record.reminderIndex % reminderCopies.en.length]
  const safeLeft = Math.max(0, record.goal - amount)
  const safePercent = Math.round((amount / record.goal) * 100)
  const safeLocale = record.language === 'ru' ? 'ru-RU' : 'en-US'
  const safeUnit = record.language === 'ru' ? '\u043c\u043b' : 'ml'
  const safeNumber = (value: number) => new Intl.NumberFormat(safeLocale).format(value)
  return `${safeCopy.title}\n\n${safeCopy.body}\n\n${safeCopy.today} ${safeNumber(amount)} / ${safeNumber(record.goal)} ${safeUnit} (${safePercent}%)\n${safeCopy.remaining} ${safeNumber(safeLeft)} ${safeUnit}\n\n${safeCopy.open}`

  const copy = reminderCopies[record.language][record.reminderIndex % reminderCopies[record.language].length]
  const left = Math.max(0, record.goal - amount); const percent = Math.round((amount / record.goal) * 100); const locale = record.language === 'ru' ? 'ru-RU' : 'en-US'; const unit = record.language === 'ru' ? 'мл' : 'ml'; const number = (value: number) => new Intl.NumberFormat(locale).format(value)
  return `${copy.title}\n\n${copy.body}\n\n${copy.today} ${number(amount)} / ${number(record.goal)} ${unit} (${percent}%)\n${copy.remaining} ${number(left)} ${unit}\n\n${copy.open}`
}

async function processReminder(env: Env, key: string) {
  if (!env.AQUORA_USERS) return
  const value = await env.AQUORA_USERS.get<ReminderRecord>(key, 'json')
  if (!value?.reminders?.enabled || value.deliveryBlocked || !isReminderInterval(value.reminders.intervalMinutes) || !isFiniteNumber(value.goal, 500, 10_000)) return
  const local = localDate(value.reminders.timeZone)
  if (local.hour < REMINDER_START_HOUR || local.hour >= REMINDER_END_HOUR) return
  const isNewDay = value.dateKey !== local.dateKey
  const amount = isNewDay ? 0 : Math.max(0, value.todayAmount)
  if (isNewDay) await writeRecord(env, { ...value, dateKey: local.dateKey, todayAmount: 0, completedDateKey: undefined, updatedAt: Date.now() })
  if (amount >= value.goal) { if (value.completedDateKey !== local.dateKey) await writeRecord(env, { ...value, completedDateKey: local.dateKey, updatedAt: Date.now() }); return }
  const intervalMs = value.reminders.intervalMinutes * 60_000
  if (value.lastReminderDateKey === local.dateKey && value.lastReminderAt && Date.now() - value.lastReminderAt < intervalMs) return
  const result = await sendMessage(env, value.chatId, reminderText(value, amount))
  if (!result.ok && result.status !== 403) return
  const next: ReminderRecord = { ...value, dateKey: local.dateKey, todayAmount: amount, lastReminderAt: Date.now(), lastReminderDateKey: local.dateKey, reminderIndex: value.reminderIndex + 1, updatedAt: Date.now() }
  if (result.status === 403) next.deliveryBlocked = true
  await writeRecord(env, next)
}
async function runReminders(env: Env) { if (!env.AQUORA_USERS || !env.TELEGRAM_BOT_TOKEN) return; let cursor: string | undefined; do { const page = await env.AQUORA_USERS.list({ prefix: 'user:', cursor, limit: 1_000 }); for (let index = 0; index < page.keys.length; index += REMINDER_BATCH_SIZE) await Promise.all(page.keys.slice(index, index + REMINDER_BATCH_SIZE).map((key) => processReminder(env, key.name).catch((error) => console.error('Reminder processing failed', error)))); cursor = page.list_complete ? undefined : page.cursor } while (cursor) }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/reminder-state') return handleReminderState(request, env)
    if (url.pathname === '/api/admin/dashboard') return handleAdminDashboard(request, env)
    if (url.pathname === '/api/admin/roles') return handleAdminRoles(request, env)
    if (request.method === 'GET' && url.pathname === '/') return textResponse('Aquora Telegram bot is online.')
    if (request.method !== 'POST') return textResponse('Not found', 404)
    const contentLength = Number(request.headers.get('content-length') ?? '0')
    if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) return textResponse('Payload too large', 413)
    const receivedSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET || !stringsMatch(receivedSecret, env.TELEGRAM_WEBHOOK_SECRET)) return tooManyInvalidRequests(request) ? textResponse('Too many requests', 429) : textResponse('Forbidden', 403)
    let update: TelegramUpdate
    try { update = await request.json() as TelegramUpdate } catch { return textResponse('Invalid update', 400) }
    const message = update.message
    if (!message?.text) return textResponse('ok')
    await rememberChat(env, message)
    const command = commandFrom(message)
    if (command === '/start') await sendMessage(env, message.chat.id, welcomeText)
    else if (command === '/open') await sendMessage(env, message.chat.id, openText)
    else if (command === '/help') await sendMessage(env, message.chat.id, helpText)
    else if (command === '/admin') {
      const role = message.from ? await adminRole(env, message.from.id) : null
      if (role) await sendAdminMessage(env, message.chat.id)
      else await sendMessage(env, message.chat.id, '\u{1F512} \u0414\u043e\u0441\u0442\u0443\u043f \u043a \u0430\u0434\u043c\u0438\u043d-\u043f\u0430\u043d\u0435\u043b\u0438 \u043e\u0442\u043a\u0440\u044b\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430 \u0438 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u043d\u044b\u0445 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u0432.')
    }
    return textResponse('ok')
  },
  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) { context.waitUntil(runReminders(env)) },
}
