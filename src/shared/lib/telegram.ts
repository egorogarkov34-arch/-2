import type { IntakeEntry, Profile } from '@/entities/hydration/model/types'
import { todayKey } from '@/shared/lib/format'

export const telegram = () => window.Telegram?.WebApp

export const getTelegramInitData = () => {
  const initData = telegram()?.initData
  if (initData) return initData

  // Telegram also exposes the signed launch data in the Web App hash.
  // This fallback covers WebViews where the SDK finishes initialization late.
  return new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData') ?? ''
}

export const initializeTelegram = () => {
  const app = telegram()
  if (!app) return

  app.ready()
  app.expand()
  try { app.requestFullscreen?.() } catch { /* Older Telegram clients do not support fullscreen. */ }
  app.enableClosingConfirmation?.()
  document.documentElement.style.setProperty('--telegram-bg', '#090909')
  const topInset = app.contentSafeAreaInset?.top ?? app.safeAreaInset?.top ?? 0
  const bottomInset = app.contentSafeAreaInset?.bottom ?? app.safeAreaInset?.bottom ?? 0
  document.documentElement.style.setProperty('--tg-content-top', `${topInset}px`)
  document.documentElement.style.setProperty('--tg-content-bottom', `${bottomInset}px`)
}

export const haptic = {
  tap: () => telegram()?.HapticFeedback?.impactOccurred('light'),
  success: () => telegram()?.HapticFeedback?.notificationOccurred('success'),
  error: () => telegram()?.HapticFeedback?.notificationOccurred('error'),
  select: () => telegram()?.HapticFeedback?.selectionChanged()
}

export const syncToCloud = (key: string, value: unknown) => {
  const app = telegram()
  if (!app?.CloudStorage) return
  app.CloudStorage.setItem(key, JSON.stringify(value))
}

export const loadFromCloud = <T>(key: string): Promise<T | null> => new Promise((resolve) => {
  const app = telegram()
  if (!app?.CloudStorage) { resolve(null); return }
  app.CloudStorage.getItem(key, (error, value) => {
    if (error || !value) { resolve(null); return }
    try { resolve(JSON.parse(value) as T) } catch { resolve(null) }
  })
})

interface ReminderSyncState {
  profile: Profile
  goal: number
  intake: IntakeEntry[]
  dayGoals: Record<string, number>
}

const botApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_AQUORA_BOT_URL as string | undefined
  return (configuredUrl || 'https://aquora-water-bot.egorogarkov34.workers.dev').replace(/\/+$/, '')
}

export type AppAccessState = 'allowed' | 'closed' | 'unavailable'

/** The Worker verifies the Telegram signature before returning access status. */
export const checkAppAccess = async (): Promise<AppAccessState> => {
  const initData = getTelegramInitData()
  if (!initData) return 'allowed'
  try {
    const response = await fetch(`${botApiUrl()}/api/access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ initData }),
    })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok || !payload || typeof payload !== 'object' || !('allowed' in payload) || typeof payload.allowed !== 'boolean') return 'unavailable'
    return payload.allowed ? 'allowed' : 'closed'
  } catch { return 'unavailable' }
}

/** Mirrors only the data required for a bot reminder. The Worker validates initData before accepting it. */
export type ManualStreakSyncValue = number | null | undefined

export const syncReminderState = async ({ profile, goal, intake, dayGoals }: ReminderSyncState): Promise<ManualStreakSyncValue> => {
  const apiUrl = botApiUrl()
  const initData = getTelegramInitData()
  if (!apiUrl || !initData) return undefined

  const dateKey = todayKey()
  const todayAmount = intake
    .filter((entry) => todayKey(new Date(entry.createdAt)) === dateKey)
    .reduce((sum, entry) => sum + entry.amount, 0)
  const oldestHistoryDate = new Date()
  oldestHistoryDate.setDate(oldestHistoryDate.getDate() - 369)
  const oldestDateKey = todayKey(oldestHistoryDate)
  const totalsByDay = new Map<string, number>()
  for (const entry of intake) {
    const entryDateKey = todayKey(new Date(entry.createdAt))
    if (entryDateKey < oldestDateKey) continue
    totalsByDay.set(entryDateKey, (totalsByDay.get(entryDateKey) ?? 0) + entry.amount)
  }
  if (!totalsByDay.has(dateKey)) totalsByDay.set(dateKey, todayAmount)
  const dailyHistory = [...totalsByDay.entries()]
    .map(([historyDateKey, amount]) => ({ dateKey: historyDateKey, amount: Math.round(amount), goal: Math.round(dayGoals[historyDateKey] ?? goal) }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))

  try {
    const response = await fetch(`${apiUrl}/api/reminder-state`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        initData,
        dateKey,
        goal,
        todayAmount,
        dailyHistory,
        language: profile.language,
        reminders: profile.reminders,
        profile: {
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          activity: profile.activity,
        },
      }),
    })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok || !payload || typeof payload !== 'object' || !('manualStreak' in payload)) return undefined
    const manualStreak = payload.manualStreak
    if (manualStreak === null) return null
    return typeof manualStreak === 'number' && Number.isSafeInteger(manualStreak) && manualStreak >= 0 && manualStreak <= 9_999
      ? manualStreak
      : undefined
  } catch { return undefined }
}
