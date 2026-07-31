export const telegram = () => window.Telegram?.WebApp

export const initializeTelegram = () => {
  const app = telegram()
  if (!app) return

  app.ready()
  app.expand()
  app.requestFullscreen?.()
  app.enableClosingConfirmation?.()
  const background = app.themeParams.bg_color
  if (background) document.documentElement.style.setProperty('--telegram-bg', background)
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
