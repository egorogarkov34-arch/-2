import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Ban, BellRing, CalendarDays, ChevronRight, Crown, Download, FileText, Gauge, ImagePlus, LockKeyhole, Megaphone, Paperclip, RefreshCw, Send, ShieldCheck, Target, Trash2, TrendingUp, Unlock, UserPlus, UsersRound, X } from 'lucide-react'
import { getTelegramInitData, haptic } from '@/shared/lib/telegram'
import type { DashboardData, DashboardUser, UserDetails } from '../model/types'

interface BroadcastResult { ok: true; sent: number; failed: number; recipients: number }
type BroadcastMediaKind = 'photo' | 'animation' | 'sticker'
interface BroadcastMedia { kind: BroadcastMediaKind; dataUrl: string; name: string }

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
function fullDate(value: number) { return value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(value) : '—' }
function historyDate(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)) }

const genderLabel = { male: 'Мужской', female: 'Женский', other: 'Не указан' } as const

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
  const [accessUserId, setAccessUserId] = useState('')
  const [updatingAccessMode, setUpdatingAccessMode] = useState(false)
  const [updatingAllowedUser, setUpdatingAllowedUser] = useState<number | null>(null)
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [broadcastMediaKind, setBroadcastMediaKind] = useState<BroadcastMediaKind>('photo')
  const [broadcastMedia, setBroadcastMedia] = useState<BroadcastMedia | null>(null)
  const [premiumEmojiId, setPremiumEmojiId] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null)
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null)
  const [manualStreakInput, setManualStreakInput] = useState('')
  const [savingManualStreak, setSavingManualStreak] = useState(false)
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [exportingPdf, setExportingPdf] = useState<'analytics' | 'users' | null>(null)
  const broadcastFileInputRef = useRef<HTMLInputElement>(null)

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
  useEffect(() => { setManualStreakInput(selectedUser?.manualStreak?.toString() ?? '') }, [selectedUser?.id, selectedUser?.manualStreak])

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

  const updateAccessMode = async (mode: DashboardData['access']['mode']) => {
    if (mode === data?.access.mode) return
    const confirmation = mode === 'private'
      ? 'Закрыть бота для всех, кроме владельца, администраторов и разрешённых пользователей?'
      : 'Открыть бота для всех пользователей?'
    if (!window.confirm(confirmation)) return
    setUpdatingAccessMode(true)
    try {
      const next = await requestAdmin<DashboardData>('/api/admin/access/mode', { mode })
      setData(next)
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setUpdatingAccessMode(false) }
  }

  const updateAllowedUser = async (action: 'grant' | 'revoke', id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) { haptic.error(); return }
    setUpdatingAllowedUser(id)
    try {
      const next = await requestAdmin<DashboardData>('/api/admin/access/users', { action, userId: id })
      setData(next)
      setAccessUserId('')
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setUpdatingAllowedUser(null) }
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

  const openUserProfile = async (userId: number) => {
    setLoadingUserId(userId)
    try {
      const result = await requestAdmin<{ ok: true; user: UserDetails }>('/api/admin/users/details', { userId })
      setSelectedUser(result.user)
      haptic.tap()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setLoadingUserId(null) }
  }

  const saveManualStreak = async (manualStreak: number | null) => {
    if (!selectedUser) return
    const userId = selectedUser.id
    setSavingManualStreak(true)
    try {
      const result = await requestAdmin<{ ok: true; userId: number; manualStreak: number | null }>('/api/admin/users/streak', { userId, manualStreak })
      setSelectedUser((current) => current && current.id === userId ? { ...current, manualStreak: result.manualStreak } : current)
      setManualStreakInput(result.manualStreak?.toString() ?? '')
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'request_failed')
      haptic.error()
    } finally { setSavingManualStreak(false) }
  }

  const submitManualStreak = () => {
    const value = Number(manualStreakInput)
    if (!Number.isSafeInteger(value) || value < 0 || value > 9_999) { haptic.error(); return }
    void saveManualStreak(value)
  }

  const exportPdf = async (kind: 'analytics' | 'users') => {
    if (!data) return
    setExportingPdf(kind)
    try {
      const pdf = await import('../lib/adminPdf')
      if (kind === 'analytics') await pdf.exportAdminStatisticsPdf(data)
      else await pdf.exportUserListPdf(data)
      haptic.success()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'pdf_export_failed')
      haptic.error()
    } finally { setExportingPdf(null) }
  }

  if (loading && !data) return <main className="page admin-page"><div className="admin-loading"><div className="skeleton title"/><div className="admin-skeleton-grid"><div className="skeleton"/><div className="skeleton"/><div className="skeleton"/></div><div className="skeleton admin-skeleton-list"/></div></main>
  if (error && !data) return <AccessDenied reason={error}/>
  if (!data) return null

  const { metrics } = data
  const isOwner = data.role === 'owner'
  const visibleUsers = showAllUsers ? data.users : data.users.slice(0, 20)
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

    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Analytics</p><h2>Подробная статистика</h2></div><TrendingUp size={18}/></div>
      <div className="admin-analytics-card">
        <div className="admin-analytics-grid">
          <div><span><CalendarDays size={14}/> Активны за 7 дней</span><strong>{number.format(metrics.activeWeek)}</strong><small>из {number.format(metrics.totalUsers)} пользователей</small></div>
          <div><span><Target size={14}/> Выполнение целей</span><strong>{metrics.goalCompletionRate}%</strong><small>за все дни с историей</small></div>
          <div><span><Gauge size={14}/> Всего выпито</span><strong>{formatMl(metrics.trackedTotalAmount)}</strong><small>{number.format(metrics.trackedDays)} дней с водой</small></div>
          <div><span><Ban size={14}/> Ограничения</span><strong>{number.format(metrics.blockedUsers)}</strong><small>пользователей заблокировано</small></div>
        </div>
        <div className="admin-report-actions">
          <button type="button" onClick={() => void exportPdf('analytics')} disabled={exportingPdf !== null}><FileText size={16}/>{exportingPdf === 'analytics' ? 'Готовим PDF…' : 'Статистика в PDF'}</button>
          <button type="button" className="secondary" onClick={() => void exportPdf('users')} disabled={exportingPdf !== null}><Download size={16}/>{exportingPdf === 'users' ? 'Готовим PDF…' : 'Список пользователей'}</button>
        </div>
      </div>
    </section>

    {isOwner && <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Access control</p><h2>Режим доступа</h2></div><span>{data.access.mode === 'private' ? 'Приватный' : 'Открытый'}</span></div>
      <div className="admin-access-card">
        <div className="admin-access-mode">
          <div><strong>{data.access.mode === 'private' ? 'Бот закрыт для новых пользователей' : 'Бот доступен всем'}</strong><p>{data.access.mode === 'private' ? 'Доступ сохраняется у владельца, администраторов и пользователей из списка ниже.' : 'Любой пользователь может запустить бота и открыть трекер.'}</p></div>
          <button type="button" className={`admin-access-toggle ${data.access.mode === 'private' ? 'is-private' : ''}`} aria-pressed={data.access.mode === 'private'} onClick={() => void updateAccessMode(data.access.mode === 'private' ? 'open' : 'private')} disabled={updatingAccessMode}>
            {data.access.mode === 'private' ? <LockKeyhole size={16}/> : <Unlock size={16}/>}<span>{data.access.mode === 'private' ? 'Открыть' : 'Закрыть'}</span>
          </button>
        </div>
        <div className="admin-access-divider"/>
        <div className="admin-access-list-heading"><div><strong>Разрешённые пользователи</strong><small>Укажите Telegram ID — пользователь сможет пользоваться ботом, когда он закрыт.</small></div><span>{data.access.allowedUsers.length}</span></div>
        <form className="admin-add-form admin-access-form" onSubmit={(event) => { event.preventDefault(); void updateAllowedUser('grant', Number(accessUserId)) }}>
          <input inputMode="numeric" value={accessUserId} onChange={(event) => setAccessUserId(event.target.value.replace(/\D/g, ''))} placeholder="Telegram ID пользователя" aria-label="Telegram ID разрешённого пользователя"/>
          <button type="submit" disabled={!accessUserId || updatingAllowedUser !== null}><UserPlus size={16}/> Разрешить</button>
        </form>
        <div className="admin-allowed-users">
          {data.access.allowedUsers.length === 0 ? <p>Список пока пуст. В приватном режиме доступ есть только у владельца и администраторов.</p> : data.access.allowedUsers.map((user) => <div className="admin-role-row" key={user.id}>
            <span className="admin-role-icon"><UsersRound size={16}/></span><div><strong>{user.name}</strong><small>ID: {user.id} · добавлен {updatedAt(user.addedAt)}</small></div><button type="button" className="admin-remove-button" aria-label={`Убрать доступ у ${user.name}`} onClick={() => void updateAllowedUser('revoke', user.id)} disabled={updatingAllowedUser === user.id}><Trash2 size={16}/></button>
          </div>)}
        </div>
      </div>
    </section>}

    {isOwner && <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Owner tools</p><h2>Рассылка</h2></div><Megaphone size={18}/></div>
      <form className="admin-broadcast-card" onSubmit={(event) => { event.preventDefault(); void sendBroadcast() }}>
        <textarea value={broadcastText} onChange={(event) => setBroadcastText(event.target.value.slice(0, 1000))} maxLength={1000} placeholder="Текст сообщения для пользователей" aria-label="Текст рассылки" />
        <div className="admin-broadcast-options">
          <label className="admin-media-picker"><ImagePlus size={15}/><span>Вложение</span><select value={broadcastMediaKind} onChange={(event) => { setBroadcastMediaKind(event.target.value as BroadcastMediaKind); setBroadcastMedia(null) }} aria-label="Тип вложения"><option value="photo">Фото</option><option value="animation">GIF / видео</option><option value="sticker">Стикер</option></select></label>
          <label className="admin-emoji-picker"><span>Premium emoji</span><select value={premiumEmojiId} onChange={(event) => setPremiumEmojiId(event.target.value)} aria-label="Premium emoji"><option value="">Не добавлять</option>{data.premiumEmojis.map((emoji, index) => <option value={emoji.id} key={emoji.id}>Эмодзи {index + 1}</option>)}</select></label>
          <input ref={broadcastFileInputRef} key={`${broadcastMediaKind}:${broadcastMedia?.name ?? 'empty'}`} className="admin-file-input" type="file" accept={broadcastMediaKind === 'photo' ? 'image/jpeg,image/png' : broadcastMediaKind === 'animation' ? 'image/gif,video/mp4' : '.webp,.webm,.tgs,image/webp,video/webm,application/x-tgsticker'} onChange={(event) => selectBroadcastMedia(event.currentTarget.files?.[0] ?? null)} aria-label="Файл для рассылки" />
          <button className="admin-file-trigger" type="button" onClick={() => broadcastFileInputRef.current?.click()}><Paperclip size={15}/>{broadcastMediaKind === 'photo' ? 'Выбрать фото' : broadcastMediaKind === 'animation' ? 'Выбрать GIF или видео' : 'Выбрать стикер'}</button>
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
        {data.users.length === 0 ? <div className="admin-list-empty">Пока нет пользователей. Они появятся здесь сразу после команды /start.</div> : visibleUsers.map((user) => <article className="admin-user" key={user.id}>
          <div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="admin-user-copy"><strong>{user.name}</strong><small>{activityLabel[user.activity]} активность · {user.language.toUpperCase()} · {updatedAt(user.updatedAt)}</small><div className="admin-progress"><i style={{ width: `${Math.min(100, user.progress)}%` }}/></div></div>
          <div className="admin-user-value"><strong>{formatMl(user.todayAmount)}</strong><small>из {formatMl(user.goal)}</small><span className={user.remindersEnabled ? 'is-on' : ''}>{user.remindersEnabled ? 'Напоминания' : 'Без напоминаний'}</span></div>
          <button type="button" className="admin-user-profile-button" aria-label={`Открыть профиль ${user.name}`} onClick={() => void openUserProfile(user.id)} disabled={loadingUserId === user.id}>{loadingUserId === user.id ? <RefreshCw size={15} className="is-spinning"/> : <ChevronRight size={17}/>}</button>
          {isOwner && <button type="button" className={`admin-user-access ${user.blocked ? 'unblock' : ''}`} aria-label={`${user.blocked ? 'Разблокировать' : 'Заблокировать'} ${user.name}`} onClick={() => void updateUserAccess(user.blocked ? 'unblock' : 'block', user.id)} disabled={updatingAccess === user.id}>{user.blocked ? <Unlock size={15}/> : <Ban size={15}/>}<span>{user.blocked ? 'Разблокировать' : 'Заблокировать'}</span></button>}
        </article>)}
      </div>
      {data.users.length > 20 && <button type="button" className="admin-show-more" onClick={() => setShowAllUsers((value) => !value)}>{showAllUsers ? 'Свернуть список' : `Показать всех (${number.format(data.users.length)})`}</button>}
    </section>

    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Access management</p><h2>Администраторы</h2></div><span>{data.admins.length}</span></div>
      <div className="admin-admins-card">
        {isOwner && <form className="admin-add-form" onSubmit={(event) => { event.preventDefault(); void updateRole('grant', Number(adminId)) }}><input inputMode="numeric" value={adminId} onChange={(event) => setAdminId(event.target.value.replace(/\D/g, ''))} placeholder="Telegram ID пользователя" aria-label="Telegram ID администратора"/><button type="submit" disabled={!adminId || updatingRole !== null}><UserPlus size={16}/> Добавить</button></form>}
        {data.admins.map((admin) => <div className="admin-role-row" key={admin.id}><span className={`admin-role-icon ${admin.role === 'owner' ? 'owner' : ''}`}>{admin.role === 'owner' ? <Crown size={16}/> : <ShieldCheck size={16}/>}</span><div><strong>{admin.name}</strong><small>{admin.role === 'owner' ? 'Владелец бота' : `ID: ${admin.id}`}</small></div>{isOwner && admin.role === 'admin' && <button type="button" className="admin-remove-button" aria-label={`Удалить администратора ${admin.name}`} onClick={() => void updateRole('revoke', admin.id)} disabled={updatingRole === admin.id}><Trash2 size={16}/></button>}</div>)}
      </div>
    </section>

    <AnimatePresence>
      {selectedUser && <>
        <motion.button type="button" className="sheet-scrim" aria-label="Закрыть профиль пользователя" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)}/>
        <motion.section className="bottom-sheet admin-user-profile-sheet" role="dialog" aria-modal="true" aria-label={`Профиль ${selectedUser.name}`} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 34 }}>
          <div className="sheet-handle"/>
          <div className="admin-detail-header"><div><p className="eyebrow">Профиль пользователя</p><h2>{selectedUser.name}</h2><span>ID: {selectedUser.id} · с нами с {fullDate(selectedUser.joinedAt)}</span></div><button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setSelectedUser(null)}><X size={19}/></button></div>
          <div className="admin-detail-hero">
            <div><small>Сегодня</small><strong>{formatMl(selectedUser.todayAmount)}</strong><span>из {formatMl(selectedUser.goal)} · {selectedUser.progress}%</span></div>
            <div><small>Статус</small><strong>{selectedUser.blocked ? 'Заблокирован' : 'Активен'}</strong><span>{selectedUser.reminders?.enabled ? `Напоминания: ${selectedUser.reminders.intervalMinutes} мин.` : 'Без напоминаний'}</span></div>
          </div>
          <div className="admin-detail-stat-grid">
            <div><small>Всего выпито</small><strong>{formatMl(selectedUser.stats.totalAmount)}</strong></div><div><small>Среднее в день</small><strong>{formatMl(selectedUser.stats.averageDailyAmount)}</strong></div>
            <div><small>Активных дней</small><strong>{number.format(selectedUser.stats.activeDays)}</strong></div><div><small>Дней с целью</small><strong>{number.format(selectedUser.stats.goalDays)}</strong></div>
            <div><small>Личный рекорд</small><strong>{formatMl(selectedUser.stats.bestAmount)}</strong><span>{selectedUser.stats.bestDateKey ? historyDate(selectedUser.stats.bestDateKey) : '—'}</span></div><div><small>Последняя запись</small><strong>{selectedUser.stats.lastActiveDateKey ? historyDate(selectedUser.stats.lastActiveDateKey) : '—'}</strong></div>
          </div>
          {isOwner && <section className="admin-detail-section admin-streak-editor">
            <div className="admin-streak-editor-heading"><div><h3>Серия</h3><p>{selectedUser.manualStreak === null ? 'Считается автоматически по выполненным целям.' : 'Исправлено владельцем: дальше серия растёт автоматически.'}</p></div><button type="button" onClick={() => void saveManualStreak(null)} disabled={savingManualStreak || selectedUser.manualStreak === null}>Автоматически</button></div>
            <form className="admin-streak-form" onSubmit={(event) => { event.preventDefault(); submitManualStreak() }}>
              <label><span>Дней подряд</span><input value={manualStreakInput} onChange={(event) => setManualStreakInput(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="Например, 7" aria-label="Серия в днях" /></label>
              <button type="submit" disabled={savingManualStreak || !manualStreakInput}>{savingManualStreak ? 'Сохраняем…' : 'Сохранить'}</button>
            </form>
          </section>}
          <section className="admin-detail-section"><h3>Личные данные</h3>{selectedUser.profile ? <div className="admin-detail-list"><p><span>Возраст</span><strong>{selectedUser.profile.age} лет</strong></p><p><span>Пол</span><strong>{genderLabel[selectedUser.profile.gender]}</strong></p><p><span>Рост</span><strong>{selectedUser.profile.height} см</strong></p><p><span>Вес</span><strong>{selectedUser.profile.weight} кг</strong></p><p><span>Активность</span><strong>{activityLabel[selectedUser.profile.activity]}</strong></p></div> : <p className="admin-detail-empty">Пользователь пока не заполнял личные данные в Mini App.</p>}</section>
          <section className="admin-detail-section"><h3>Последние дни</h3><div className="admin-detail-list">{selectedUser.stats.dailyHistory.length === 0 ? <p className="admin-detail-empty">Записей воды пока нет.</p> : selectedUser.stats.dailyHistory.slice(-7).reverse().map((point) => <p key={point.dateKey}><span>{historyDate(point.dateKey)}</span><strong>{formatMl(point.amount)} / {formatMl(point.goal)}</strong></p>)}</div></section>
        </motion.section>
      </>}
    </AnimatePresence>

    <motion.p className="admin-security-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><LockKeyhole size={13}/> Доступ проверяется на сервере Cloudflare по подписи Telegram.</motion.p>
  </main>
}
