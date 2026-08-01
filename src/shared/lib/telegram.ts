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
  app.requestFullscreen?.()
  app.enableClosingConfirmation?.()
  const background = app.themeParams.bg_color
  if (background) document.documentElement.style.setProperty('--telegram-bg', background)
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
