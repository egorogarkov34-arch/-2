import { BarChart3, Droplets, UserRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { useHydrationStore } from '@/entities/hydration/model/store'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

export function BottomNavigation() {
  const active = useHydrationStore((state) => state.activeTab)
  const setActive = useHydrationStore((state) => state.setActiveTab)
  const { t } = useTranslation()
  const items = [
    { id: 'home' as const, label: t('home'), icon: Droplets },
    { id: 'stats' as const, label: t('stats'), icon: BarChart3 },
    { id: 'profile' as const, label: t('profile'), icon: UserRound }
  ]
  return <nav className="bottom-navigation" aria-label={t('navigation')}>{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => { haptic.select(); setActive(id) }}><span className="nav-icon">{active === id && <motion.i layoutId="nav-active" transition={{ type: 'spring', stiffness: 420, damping: 30 }}/>}<Icon size={21} strokeWidth={active === id ? 2.2 : 1.75}/></span><span>{label}</span></button>)}</nav>
}
