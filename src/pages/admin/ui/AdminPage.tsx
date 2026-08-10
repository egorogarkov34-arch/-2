import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, BellRing, Crown, LockKeyhole, RefreshCw, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
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
  updatedAt: number
  lastReminderAt: number | null
}

interface DashboardAdmin { id: number; role: AdminRole; name: string }

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
}

class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

const activityLabel: Record<DashboardUser['activity'], string> = { low: 'Низкая', moderate: 'Средняя', high: 'Высокая' }
const number = new Intl.NumberFormat('ru-RU')

function workerUrl() {
  return (import.meta.env.VITE_AQUORA_BOT_URL as string | undefined)?.replace(/\/+$/, '')
}

async function requestAdmin<T>(path: string, body: Record<string, unknown>) {
  const baseUrl = workerUrl()
  const initData = getTelegramInitData()
  if (!baseUrl) throw new ApiError(503, 'Сервер панели не настроен.')
  if (!initData) throw new ApiError(401, 'Откройте панель из Telegram.')
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData, ...body }),
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

    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="eyebrow">Live overview</p><h2>Пользователи</h2></div><span>{number.format(metrics.totalUsers)}</span></div>
      <div className="admin-users-card">
        {data.users.length === 0 ? <div className="admin-list-empty">Пока нет синхронизированных пользователей.</div> : data.users.map((user) => <article className="admin-user" key={user.id}>
          <div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="admin-user-copy"><strong>{user.name}</strong><small>{activityLabel[user.activity]} активность · {user.language.toUpperCase()} · {updatedAt(user.updatedAt)}</small><div className="admin-progress"><i style={{ width: `${Math.min(100, user.progress)}%` }}/></div></div>
          <div className="admin-user-value"><strong>{formatMl(user.todayAmount)}</strong><small>из {formatMl(user.goal)}</small><span className={user.remindersEnabled ? 'is-on' : ''}>{user.remindersEnabled ? 'Напоминания' : 'Без напоминаний'}</span></div>
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
