import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Ban, BellRing, Crown, ImagePlus, LockKeyhole, Megaphone, Paperclip, RefreshCw, Send, ShieldCheck, Trash2, Unlock, UserPlus, UsersRound, X } from 'lucide-react'
import { getTelegramInitData, haptic } from '@/shared/lib/telegram'

type AdminRole = 'owner' | 'admin'

interface DashboardUser {
  id: number
  name: string
  language: 'ru' | 'en'
  activity: 'low' | 'moderate' | 'high'
  goal: number
  todayAmount: number
  progress: number
  remindersEnabled: boolean
  blocked: boolean
  updatedAt: number
  lastReminderAt: number | null
}

interface DashboardAdmin { id: number; role: AdminRole; name: string }
interface BroadcastResult { ok: true; sent: number; failed: number; recipients: number }
type BroadcastMediaKind = 'photo' | 'animation' | 'sticker'
interface BroadcastMedia { kind: BroadcastMediaKind; dataUrl: string; name: string }
interface PremiumEmoji { id: string; addedAt: number }

interface DashboardData {
  ok: true
  role: AdminRole
  generatedAt: number
  metrics: {
    totalUsers: number
    activeToday: number
    remindersEnabled: number
    goalsReachedToday: number
    totalTodayAmount: number
    averageTodayAmount: number
    averageGoal: number
  }
  users: DashboardUser[]
  admins: DashboardAdmin[]
  premiumEmojis: PremiumEmoji[]
}

class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

const activityLabel: Record<DashboardUser['activity'], string> = { low: 'Низкая', moderate: 'Средняя', high: 'Высокая' }
const number = new Intl.NumberFormat('ru-RU')

function workerUrl() {
  return 'https://aquora-water-bot.egorogarkov34.workers.dev'
}

async function requestAdmin<T>(path: string, body: Record<string, unknown>) {
  const baseUrl = workerUrl()
  const initData = getTelegramInitData()
  const session = new URLSearchParams(window.location.search).get('session') ?? ''
  if (!baseUrl) throw new ApiError(503, 'Сервер панели не настроен.')
  if (!initData && !session) throw new ApiError(401, 'Откройте панель из Telegram.')
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData, session, ...body }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' ? payload.error : 'request_failed'
    throw new ApiError(response.status, error)
  }
  return payload as T
}

function formatMl(value: number) { return `${number.format(value)} мл` }
function updatedAt(value: number) { return value ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(value) : '—' }

function AccessDenied({ reason }: { reason: string }) {
  const text = reason === 'Откройте панель из Telegram.' ? reason : 'Эта панель доступна только владельцу бота и назначенным администраторам.'
  return <main className="page admin-page admin-empty"><div className="admin-empty-card"><span><LockKeyhole size={25}/></span><p className="eyebrow">Private area</p><h1>Доступ закрыт</h1><p>{text}</p></div></main>
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adminId, setAdminId] = useState('')
  const [updatingRole, setUpdatingRole] = useState<number | null>(null)
  const [updatingAccess, setUpdatingAccess] = useState<number | null>(null)
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastMediaKind, setBroadcastMediaKind] = useState<BroadcastMediaKind>('photo')
  const [broadcastMedia, setBroadcastMedia] = useState<BroadcastMedia | null>(null)
  const [premiumEmojiId, setPremiumEmojiId] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      setData(await requestAdmin<DashboardData>('/api/admin/dashboard', {}))
    } catch (caught) {
      setData(null)
      setError(caught instanceof Error ? caught.message : 'request_failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const updateRole = async (action: 'grant' | 'revoke', id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) { haptic.error(); return }
    setUpdatingRole(id)
    try {
      const next = await requestAdmin<DashboardData>('/api/admin/roles', { action, userId: id })
      setData(next)
      setAdminId('')
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setUpdatingRole(null) }
  }

  const updateUserAccess = async (action: 'block' | 'unblock', id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) { haptic.error(); return }
    const actionText = action === 'block' ? 'заблокировать' : 'разблокировать'
    if (!window.confirm(`Точно ${actionText} этого пользователя?`)) return
    setUpdatingAccess(id)
    try {
      const next = await requestAdmin<DashboardData>('/api/admin/users/access', { action, userId: id })
      setData(next)
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setUpdatingAccess(null) }
  }

  const selectBroadcastMedia = (file: File | null) => {
    if (!file) { setBroadcastMedia(null); return }
    if (file.size > 8 * 1024 * 1024) { setError('media_too_large'); haptic.error(); return }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') { setError('invalid_media'); haptic.error(); return }
      setBroadcastMedia({ kind: broadcastMediaKind, dataUrl: reader.result, name: file.name.slice(0, 120) })
      setError(null)
      haptic.success()
    }
    reader.onerror = () => { setError('invalid_media'); haptic.error() }
    reader.readAsDataURL(file)
  }

  const sendBroadcast = async () => {
    const message = broadcastText.trim()
    if (!message && !broadcastMedia) { haptic.error(); return }
    if (!window.confirm('Отправить это сообщение всем активным пользователям?')) return
    setSendingBroadcast(true)
    setBroadcastResult(null)
    try {
      const result = await requestAdmin<BroadcastResult>('/api/admin/broadcast', { message, media: broadcastMedia ?? undefined, premiumEmojiId: premiumEmojiId || undefined })
      setBroadcastText('')
      setBroadcastMedia(null)
      setBroadcastResult(`Отправлено: ${result.sent}. Не доставлено: ${result.failed}.`)
      haptic.success()
      void load(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setSendingBroadcast(false) }
  }

  if (loading && !data) return <main className="page admin-page"><div className="admin-loading"><div className="skeleton title"/><div className="admin-skeleton-grid"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div><div className="skeleton admin-skeleton-list"/></div></main>
  if (error && !data) return <AccessDenied reason={error}/>
  if (!data) return null

  const { metrics } = data
  const isOwner = data.role === 'owner'
  return <main className="page admin-page">
    <header className="admin-header">
      <div><p className="eyebrow">Secure administration</p><h1>Администрирование</h1><p className="admin-subtitle">Данные обновлены {updatedAt(data.generatedAt)}</p></div>
      <div className="admin-header-actions"><span className={`admin-role ${isOwner ? 'owner' : ''}`}>{isOwner ? <Crown size={13}/> : <ShieldCheck size={13}/>} {isOwner ? 'Владелец' : 'Админ'}</span><button className="icon-button" type="button" aria-label="Обновить данные" onClick={() => void load(true)} disabled={loading}>{<RefreshCw size={19} className={loading ? 'is-spinning' : ''}/>}</button></div>
    </header>

    {error && <div className="admin-inline-error">Не удалось обновить часть данных. Повторите ещё раз.</div>}

    <section className="admin-metric-grid" aria-label="Основные показатели">
      <article className="admin-metric-card"><span className="admin-metric-icon"><UsersRound size={17}/></span><small>Пользователи</small><strong>{number.format(metrics.totalUsers)}</strong><p>{number.format(metrics.activeToday)} активны сегодня</p></article>
      <article className="admin-metric-card"><span className="admin-metric-icon"><Activity size={17}/></span><small>Выпито сегодня</small><strong>{formatMl(metrics.totalTodayAmount)}</strong><p>в среднем {formatMl(metrics.averageTodayAmount)}</p></article>
      <article className="admin-metric-card"><span className="admin-metric-icon"><BellRing size={17}/></span><small>Напоминания</small><strong>{number.format(metrics.remindersEnabled)}</strong><p>{number.format(metrics.goalsReachedToday)} целей выполнено</p></article>
    </section>

    {isOwner && <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Owner tools</p><h2>Рассылка</h2></div><Megaphone size={18}/></div>
      <form className="admin-broadcast-card" onSubmit={(event) => { event.preventDefault(); void sendBroadcast() }}>
        <textarea value={broadcastText} onChange={(event) => setBroadcastText(event.target.value.slice(0, 1000))} maxLength={1000} placeholder="Текст сообщения для пользователей" aria-label="Текст рассылки" />
        <div className="admin-broadcast-options">
          <label className="admin-media-picker"><ImagePlus size={15}/><span>Вложение</span><select value={broadcastMediaKind} onChange={(event) => { setBroadcastMediaKind(event.target.value as BroadcastMediaKind); setBroadcastMedia(null) }} aria-label="Тип вложения"><option value="photo">Фото</option><option value="animation">GIF / видео</option><option value="sticker">Стикер</option></select><input key={`${broadcastMediaKind}:${broadcastMedia?.name ?? 'empty'}`} type="file" accept={broadcastMediaKind === 'photo' ? 'image/jpeg,image/png' : broadcastMediaKind === 'animation' ? 'image/gif,video/mp4' : 'image/webp,video/webm,application/x-tgsticker'} onChange={(event) => selectBroadcastMedia(event.currentTarget.files?.[0] ?? null)} aria-label="Файл для рассылки" /></label>
          <label className="admin-emoji-picker"><span>Premium emoji</span><select value={premiumEmojiId} onChange={(event) => setPremiumEmojiId(event.target.value)} aria-label="Premium emoji"><option value="">Не добавлять</option>{data.premiumEmojis.map((emoji, index) => <option value={emoji.id} key={emoji.id}>Эмодзи {index + 1}</option>)}</select></label>
        </div>
        {broadcastMedia && <div className="admin-media-selected"><Paperclip size={14}/><span>{broadcastMedia.name}</span><button type="button" onClick={() => setBroadcastMedia(null)} aria-label="Убрать вложение"><X size={14}/></button></div>}
        <p className="admin-broadcast-hint">Обычные эмодзи вставляются в текст. Чтобы добавить Premium-эмодзи в список, отправь его этому боту от аккаунта владельца.</p>
        <div className="admin-broadcast-footer"><span>{broadcastText.length} / 1000</span><button type="submit" disabled={(!broadcastText.trim() && !broadcastMedia) || sendingBroadcast}>{<Send size={16}/>} {sendingBroadcast ? 'Отправляем…' : 'Отправить всем'}</button></div>
        {broadcastResult && <p className="admin-broadcast-result">{broadcastResult}</p>}
      </form>
    </section>}

    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Live overview</p><h2>Пользователи</h2></div><span>{number.format(metrics.totalUsers)}</span></div>
      <div className="admin-users-card">
        {data.users.length === 0 ? <div className="admin-list-empty">Пока нет синхронизированных пользователей.</div> : data.users.map((user) => <article className="admin-user" key={user.id}>
          <div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="admin-user-copy"><strong>{user.name}</strong><small>{activityLabel[user.activity]} активность · {user.language.toUpperCase()} · {updatedAt(user.updatedAt)}</small><div className="admin-progress"><i style={{ width: `${Math.min(100, user.progress)}%` }}/></div></div>
          <div className="admin-user-value"><strong>{formatMl(user.todayAmount)}</strong><small>из {formatMl(user.goal)}</small><span className={user.remindersEnabled ? 'is-on' : ''}>{user.remindersEnabled ? 'Напоминания' : 'Без напоминаний'}</span></div>
          {isOwner && <button type="button" className={`admin-user-access ${user.blocked ? 'unblock' : ''}`} aria-label={`${user.blocked ? 'Разблокировать' : 'Заблокировать'} ${user.name}`} onClick={() => void updateUserAccess(user.blocked ? 'unblock' : 'block', user.id)} disabled={updatingAccess === user.id}>{user.blocked ? <Unlock size={15}/> : <Ban size={15}/>}<span>{user.blocked ? 'Разблокировать' : 'Заблокировать'}</span></button>}
        </article>)}
      </div>
    </section>

    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Access management</p><h2>Администраторы</h2></div><span>{data.admins.length}</span></div>
      <div className="admin-admins-card">
        {isOwner && <form className="admin-add-form" onSubmit={(event) => { event.preventDefault(); void updateRole('grant', Number(adminId)) }}><input inputMode="numeric" value={adminId} onChange={(event) => setAdminId(event.target.value.replace(/\D/g, ''))} placeholder="Telegram ID пользователя" aria-label="Telegram ID администратора"/><button type="submit" disabled={!adminId || updatingRole !== null}><UserPlus size={16}/> Добавить</button></form>}
        {data.admins.map((admin) => <div className="admin-role-row" key={admin.id}><span className={`admin-role-icon ${admin.role === 'owner' ? 'owner' : ''}`}>{admin.role === 'owner' ? <Crown size={16}/> : <ShieldCheck size={16}/>}</span><div><strong>{admin.name}</strong><small>{admin.role === 'owner' ? 'Владелец бота' : `ID: ${admin.id}`}</small></div>{isOwner && admin.role === 'admin' && <button type="button" className="admin-remove-button" aria-label={`Удалить администратора ${admin.name}`} onClick={() => void updateRole('revoke', admin.id)} disabled={updatingRole === admin.id}><Trash2 size={16}/></button>}</div>)}
      </div>
    </section>

    <motion.p className="admin-security-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><LockKeyhole size={13}/> Доступ проверяется на сервере Cloudflare по подписи Telegram.</motion.p>
  </main>
}
