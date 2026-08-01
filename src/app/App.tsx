import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'
import { BottomNavigation } from '@/widgets/bottom-navigation/ui/BottomNavigation'
import { useHydrationStore } from '@/entities/hydration/model/store'
import { initializeTelegram, telegram } from '@/shared/lib/telegram'

const HomePage = lazy(() => import('@/pages/home/ui/HomePage'))
const StatisticsPage = lazy(() => import('@/pages/statistics/ui/StatisticsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ui/ProfilePage'))
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } })

function PageFallback() { return <main className="page skeleton-page"><div className="skeleton title"/><div className="skeleton hero"/><div className="skeleton button"/></main> }

export function App() {
  const activeTab = useHydrationStore((state) => state.activeTab)
  const theme = useHydrationStore((state) => state.profile.theme)
  const language = useHydrationStore((state) => state.profile.language)
  const updateProfile = useHydrationStore((state) => state.updateProfile)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    initializeTelegram()
    const user = telegram()?.initDataUnsafe.user
    const name = user?.username ? `@${user.username}` : user?.first_name
    if (name) updateProfile({ name })
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [updateProfile])
  useEffect(() => { if (activeTab !== 'home') telegram()?.MainButton?.hide() }, [activeTab])
  useEffect(() => { document.body.dataset.theme = theme; document.documentElement.lang = language }, [language, theme])
  const page = activeTab === 'home' ? <HomePage/> : activeTab === 'stats' ? <StatisticsPage/> : <ProfilePage/>
  return <QueryClientProvider client={queryClient}><ErrorBoundary><div className={`app-shell ${ready ? 'is-ready' : ''}`}><Suspense fallback={<PageFallback/>}><AnimatePresence mode="wait"><motion.div key={activeTab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .18 }}>{page}</motion.div></AnimatePresence></Suspense><BottomNavigation/></div></ErrorBoundary></QueryClientProvider>
}
