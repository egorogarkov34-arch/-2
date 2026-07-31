interface TelegramWebApp {
  ready: () => void
  expand: () => void
  requestFullscreen?: () => void
  enableClosingConfirmation?: () => void
  themeParams: Record<string, string | undefined>
  colorScheme: 'light' | 'dark'
  initDataUnsafe: { user?: { first_name?: string; last_name?: string } }
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  MainButton?: {
    setText: (text: string) => void
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  BackButton?: { show: () => void; hide: () => void }
  CloudStorage?: {
    setItem: (key: string, value: string, callback?: (error: Error | null) => void) => void
  }
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp }
}
