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
}

const reminderApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_AQUORA_BOT_URL as string | undefined
  return configuredUrl?.replace(/\/+$/, '')
}

/** Mirrors only the data required for a bot reminder. The Worker validates initData before accepting it. */
export const syncReminderState = ({ profile, goal, intake }: ReminderSyncState) => {
  const apiUrl = reminderApiUrl()
  const initData = getTelegramInitData()
  if (!apiUrl || !initData) return

  const dateKey = todayKey()
  const todayAmount = intake
    .filter((entry) => todayKey(new Date(entry.createdAt)) === dateKey)
    .reduce((sum, entry) => sum + entry.amount, 0)

  void fetch(`${apiUrl}/api/reminder-state`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      initData,
      dateKey,
      goal,
      todayAmount,
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
  }).catch(() => undefined)
}
