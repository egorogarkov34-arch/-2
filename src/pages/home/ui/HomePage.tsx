import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Bell, ChevronRight, Droplets, History, PencilLine, Plus } from 'lucide-react'
import { useHydrationStore, selectTodayAmount } from '@/entities/hydration/model/store'
import { BodyWater } from '@/entities/hydration/ui/BodyWater'
import { ProgressRing } from '@/entities/hydration/ui/ProgressRing'
import { AddWaterSheet } from '@/features/log-water/ui/AddWaterSheet'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { clamp, formatMl } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { telegram } from '@/shared/lib/telegram'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: .07 } } }
const item: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 20 } } }

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [toast, setToast] = useState<number | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const { goal, addWater, setGoal, profile, intake } = useHydrationStore()
  const today = useHydrationStore(selectTodayAmount)
  const percentage = clamp((today / goal) * 100, 0, 100)
  const remaining = Math.max(goal - today, 0)
  const recent = useMemo(() => intake.filter((entry) => entry.createdAt.startsWith(new Date().toISOString().slice(0, 10))).slice(-3).reverse(), [intake])
  const add = (amount: number) => { addWater(amount); setToast(amount); window.setTimeout(() => setToast(null), 2500) }
  const refresh = useCallback(() => { haptic.success(); setRefreshVersion((version) => version + 1) }, [])
  const { ref, pullDistance, isRefreshing } = usePullToRefresh(refresh)
  useEffect(() => {
    const app = telegram()
    const openSheet = () => setSheetOpen(true)
    app?.MainButton?.setText('Добавить воду')
    app?.MainButton?.show()
    app?.MainButton?.onClick(openSheet)
    return () => { app?.MainButton?.offClick(openSheet); app?.MainButton?.hide() }
  }, [])

  return <motion.main ref={ref} className="page home-page" variants={container} initial="hidden" animate="show">
    <motion.div className="refresh-indicator" animate={{ y: Math.max(-46, pullDistance - 46), opacity: pullDistance ? 1 : 0 }}><Droplets size={16} className={isRefreshing ? 'is-refreshing' : ''}/><span>{isRefreshing ? 'Обновляем' : 'Потяните, чтобы обновить'}</span></motion.div>
    <motion.header className="home-header" variants={item}><div><p className="eyebrow">Сегодня, 1 августа</p><h1>Привет, {profile.name} <span>✦</span></h1></div><button className="icon-button notification" aria-label="Уведомления" onClick={haptic.tap}><Bell size={20}/><i/></button></motion.header>
    <motion.section className="goal-overview" variants={item} aria-label="Прогресс за сегодня"><div className="goal-copy"><p>Сегодняшний баланс</p><strong>{formatMl(today)} <small>мл</small></strong><span>из {formatMl(goal)} мл</span></div><ProgressRing value={percentage} size={96} stroke={8}/></motion.section>
    <motion.section className="body-section" variants={item}><div className="body-metrics"><span>Осталось</span><strong>{remaining ? `${formatMl(remaining)} мл` : 'Цель достигнута'}</strong></div><BodyWater percentage={percentage}/><button className="edit-goal" onClick={() => { haptic.tap(); setGoalOpen(true) }}><PencilLine size={14}/> Цель {formatMl(goal)} мл</button></motion.section>
    <motion.section className="quick-actions" variants={item}><motion.button className="add-water-button" onClick={() => { haptic.tap(); setSheetOpen(true) }} whileTap={{ scale: .98 }}><span className="add-icon"><Plus size={24}/></span><span><b>Добавить воду</b><small>Сделать запись</small></span><Droplets size={21}/></motion.button><button className="history-button" onClick={haptic.tap} aria-label="История выпитой воды"><History size={20}/></button></motion.section>
    <motion.section className="recent-card" variants={item} key={refreshVersion}><div className="section-row"><h2>Последние записи</h2><button onClick={haptic.tap}>Все <ChevronRight size={15}/></button></div>{recent.length ? <div className="recent-list">{recent.map((entry) => <div key={entry.id}><span className="drop-dot"><Droplets size={15}/></span><p>{formatMl(entry.amount)} мл <small>{new Date(entry.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small></p></div>)}</div> : <p className="empty-state">Первая запись уже ждёт вас.</p>}</motion.section>
    <AddWaterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={add}/><GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/>
    {toast !== null && <motion.div className="success-toast" initial={{ opacity: 0, y: 16, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}><span><Droplets size={17}/></span> +{toast} мл добавлено</motion.div>}
  </motion.main>
}
