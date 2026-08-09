import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { BottomNavigation } from '@/widgets/bottom-navigation/ui/BottomNavigation'
import { useHydrationStore } from '@/entities/hydration/model/store'
import type { StoredUserState } from '@/entities/hydration/model/types'
import { initializeTelegram, loadFromCloud, syncToCloud, telegram } from '@/shared/lib/telegram'

const HomePage = lazy(() => import('@/pages/home/ui/HomePage'))
const StatisticsPage = lazy(() => import('@/pages/statistics/ui/StatisticsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ui/ProfilePage'))
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })

function PageFallback() { return <main className="page skeleton-page"><div className="skeleton title"/><div className="skeleton hero"/><div className="skeleton button"/></main> }

export function App() {
  const activeTab = useHydrationStore((state) => state.activeTab)
  const theme = useHydrationStore((state) => state.profile.theme)
  const language = useHydrationStore((state) => state.profile.language)
  const restoreUserState = useHydrationStore((state) => state.restoreUserState)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    initializeTelegram()
    let active = true
    void loadFromCloud<StoredUserState>('aquora:user-state').then((stored) => {
      if (!active) return
      if (stored) { restoreUserState(stored); return }
      const current = useHydrationStore.getState()
      syncToCloud('aquora:user-state', { profile: current.profile, goal: current.goal, goalMode: current.goalMode, dayGoals: current.dayGoals } satisfies StoredUserState)
    })
    const frame = requestAnimationFrame(() => setReady(true))
    return () => { active = false; cancelAnimationFrame(frame) }
  }, [restoreUserState])
  useEffect(() => { telegram()?.MainButton?.hide() }, [activeTab])
  useEffect(() => { document.body.dataset.theme = theme; document.documentElement.lang = language }, [language, theme])
  const page = activeTab === 'home' ? <HomePage/> : activeTab === 'stats' ? <StatisticsPage/> : <ProfilePage/>
  return <QueryClientProvider client={queryClient}><ErrorBoundary><div className={`app-shell ${ready ? 'is-ready' : ''}`}><Suspense fallback={<PageFallback/>}><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .18 }}>{page}</motion.div></AnimatePresence></Suspense><BottomNavigation/></div></ErrorBoundary></QueryClientProvider>
}
