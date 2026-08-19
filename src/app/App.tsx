import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { BottomNavigation } from '@/widgets/bottom-navigation/ui/BottomNavigation'
import { syncCurrentReminderState, useHydrationStore } from '@/entities/hydration/model/store'
import type { StoredUserState } from '@/entities/hydration/model/types'
import { checkAppAccess, initializeTelegram, loadFromCloud, syncToCloud, telegram, type AppAccessState } from '@/shared/lib/telegram'

const HomePage = lazy(() => import('@/pages/home/ui/HomePage'))
const StatisticsPage = lazy(() => import('@/pages/statistics/ui/StatisticsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ui/ProfilePage'))
const AdminPage = lazy(() => import('@/pages/admin/ui/AdminPage'))
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })

function PageFallback() { return <main className="page skeleton-page"><div className="skeleton title"/><div className="skeleton hero"/><div className="skeleton button"/></main> }

function AccessScreen({ state }: { state: Exclude<AppAccessState, 'allowed'> | 'checking' }) {
  const isChecking = state === 'checking'
  const unavailable = state === 'unavailable'
  return <main className="app-access-screen"><div className="app-access-card"><span aria-hidden="true">{isChecking ? '…' : '💧'}</span><p className="eyebrow">Aquora Water</p><h1>{isChecking ? 'Проверяем доступ' : unavailable ? 'Не удалось подключиться' : 'Бот скоро начнёт работу'}</h1><p>{isChecking ? 'Пожалуйста, подождите немного.' : unavailable ? 'Попробуйте открыть приложение ещё раз чуть позже.' : 'Мы завершаем последние улучшения, чтобы всё работало стабильно и приятно. Совсем скоро вы сможете отслеживать водный баланс и видеть свой прогресс.'}</p></div></main>
}

export function App() {
  const isAdminMode = new URLSearchParams(window.location.search).get('admin') === '1'
  const activeTab = useHydrationStore((state) => state.activeTab)
  const language = useHydrationStore((state) => state.profile.language)
  const restoreUserState = useHydrationStore((state) => state.restoreUserState)
  const [ready, setReady] = useState(false)
  const [accessState, setAccessState] = useState<AppAccessState | 'checking'>('checking')
  useEffect(() => {
    initializeTelegram()
    let active = true
    let frame: number | undefined
    const prepare = async () => {
      const nextAccess = isAdminMode ? 'allowed' : await checkAppAccess()
      if (!active) return
      setAccessState(nextAccess)
      if (nextAccess !== 'allowed') { setReady(true); return }
      void loadFromCloud<StoredUserState>('aquora:user-state').then((stored) => {
        if (!active) return
        if (stored) { restoreUserState(stored); return }
        const current = useHydrationStore.getState()
        syncToCloud('aquora:user-state', { profile: current.profile, goal: current.goal, goalMode: current.goalMode, dayGoals: current.dayGoals, manualStreak: current.manualStreak, manualStreakAnchorDateKey: current.manualStreakAnchorDateKey } satisfies StoredUserState)
      }).finally(() => { if (active) syncCurrentReminderState() })
      frame = requestAnimationFrame(() => setReady(true))
    }
    void prepare()
    return () => { active = false; if (frame !== undefined) cancelAnimationFrame(frame) }
  }, [isAdminMode, restoreUserState])
  useEffect(() => {
    if (isAdminMode || accessState !== 'allowed') return
    const syncWhenVisible = () => { if (document.visibilityState === 'visible') syncCurrentReminderState() }
    const interval = window.setInterval(syncCurrentReminderState, 60_000)
    document.addEventListener('visibilitychange', syncWhenVisible)
    window.addEventListener('focus', syncWhenVisible)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', syncWhenVisible); window.removeEventListener('focus', syncWhenVisible) }
  }, [accessState, isAdminMode])
  useEffect(() => { telegram()?.MainButton?.hide() }, [activeTab])
  useEffect(() => {
    document.body.dataset.theme = 'dark'
    document.documentElement.lang = language
  }, [language])
  if (!isAdminMode && accessState !== 'allowed') return <div className="app-shell is-ready"><AccessScreen state={accessState}/></div>
  const page = isAdminMode ? <AdminPage/> : activeTab === 'home' ? <HomePage/> : activeTab === 'stats' ? <StatisticsPage/> : <ProfilePage/>
  const pageKey = isAdminMode ? 'admin' : activeTab
  return <QueryClientProvider client={queryClient}><ErrorBoundary><div className={`app-shell ${ready ? 'is-ready' : ''}`}><Suspense fallback={<PageFallback/>}><AnimatePresence mode="wait"><motion.div key={pageKey} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .18 }}>{page}</motion.div></AnimatePresence></Suspense>{!isAdminMode && <BottomNavigation/>}</div></ErrorBoundary></QueryClientProvider>
}
