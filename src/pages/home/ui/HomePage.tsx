import { useCallback, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ChevronRight, Droplets, History, Minus, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useHydrationStore, selectTodayAmount } from '@/entities/hydration/model/store'
import { BodyWater } from '@/entities/hydration/ui/BodyWater'
import { ProgressRing } from '@/entities/hydration/ui/ProgressRing'
import { AddWaterSheet } from '@/features/log-water/ui/AddWaterSheet'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { HistorySheet } from '@/features/history/ui/HistorySheet'
import { clamp, formatMl } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useTranslation } from '@/shared/lib/i18n'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: .07 } } }
const item: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 20 } } }

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [toast, setToast] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('250')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const { goal, addWater, removeWater, clearWater, setGoal, profile, intake } = useHydrationStore()
  const { language, t } = useTranslation()
  const today = useHydrationStore(selectTodayAmount)
  const completion = goal > 0 ? Math.round((today / goal) * 100) : 0
  const fillPercentage = clamp(completion, 0, 100)
  const remaining = Math.max(goal - today, 0)
  const locale = language === 'en' ? 'en-US' : 'ru-RU'
  const todayDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date())
  const recent = useMemo(() => intake.filter((entry) => entry.createdAt.startsWith(new Date().toISOString().slice(0, 10))).slice(-3).reverse(), [intake])
  const add = (amount: number) => { addWater(amount); setToast(amount); window.setTimeout(() => setToast(null), 2500) }
  const submitCustomAmount = () => {
    const amount = Number(customAmount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000) { haptic.error(); return }
    haptic.success()
    add(amount)
  }
  const adjustCustomAmount = (delta: number) => {
    const nextAmount = Math.max(0, Math.min(5000, (Number(customAmount) || 0) + delta))
    haptic.tap()
    setCustomAmount(String(nextAmount))
  }
  const remove = (id: string) => { haptic.success(); removeWater(id) }
  const refresh = useCallback(() => { haptic.success(); setRefreshVersion((version) => version + 1) }, [])
  const { ref, pullDistance, isRefreshing } = usePullToRefresh(refresh)

  return <motion.main ref={ref} className="page home-page" variants={container} initial="hidden" animate="show">
    <motion.div className="refresh-indicator" animate={{ y: Math.max(-46, pullDistance - 46), opacity: pullDistance ? 1 : 0 }}><Droplets size={16} className={isRefreshing ? 'is-refreshing' : ''}/><span>{isRefreshing ? t('refresh') : t('pullToRefresh')}</span></motion.div>
    <motion.header className="home-header" variants={item}><div><p className="eyebrow">{t('today')}, {todayDate}</p><h1>{t('greeting')}, {profile.name} <span>✦</span></h1></div></motion.header>
    <motion.section className="goal-overview" variants={item} aria-label={t('progress')}><div className="goal-copy"><p>{t('todayBalance')}</p><strong>{formatMl(today)} <small>ml</small></strong><span>{t('of')} {formatMl(goal)} ml</span></div><ProgressRing value={fillPercentage} label={`${completion}%`} size={96} stroke={8}/></motion.section>
    <motion.section className="body-section" variants={item}><div className="body-metrics"><span>{t('remaining')}</span><strong>{remaining ? `${formatMl(remaining)} ml` : t('goalReached')}</strong></div><BodyWater percentage={fillPercentage}/><button className="edit-goal" onClick={() => { haptic.tap(); setGoalOpen(true) }}><PencilLine size={14}/> {t('goal')} {formatMl(goal)} ml</button></motion.section>
    <motion.section className="quick-actions" variants={item}><motion.button className="add-water-button" onClick={() => { haptic.tap(); setSheetOpen(true) }} whileTap={{ scale: .98 }}><span className="add-icon"><Plus size={24}/></span><span><b>{t('addWater')}</b><small>{t('createEntry')}</small></span><Droplets size={21}/></motion.button><button className="history-button" onClick={() => setHistoryOpen(true)} aria-label={t('history')}><History size={20}/></button></motion.section>
    <motion.form className="home-custom-entry" variants={item} onSubmit={(event) => { event.preventDefault(); submitCustomAmount() }}>
      <label htmlFor="home-custom-amount">{t('customAmount')}</label>
      <div className="home-custom-controls">
        <button type="button" className="amount-step" onClick={() => adjustCustomAmount(-100)} aria-label="Minus 100 ml"><Minus size={17}/></button>
        <div className="home-amount-input"><input id="home-custom-amount" value={customAmount} onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" aria-label={t('customAmount')} /><span>ml</span></div>
        <button type="button" className="amount-step" onClick={() => adjustCustomAmount(100)} aria-label="Plus 100 ml"><Plus size={17}/></button>
        <motion.button type="submit" className="home-add-custom" whileTap={{ scale: .96 }} disabled={!customAmount || Number(customAmount) > 5000}>{t('addWater')}</motion.button>
      </div>
    </motion.form>
    <motion.section className="recent-card" variants={item} key={refreshVersion}><div className="section-row"><h2>{t('recentEntries')}</h2><button onClick={() => setHistoryOpen(true)}>{t('all')} <ChevronRight size={15}/></button></div>{recent.length ? <div className="recent-list">{recent.map((entry) => <div key={entry.id}><span className="drop-dot"><Droplets size={15}/></span><p>{formatMl(entry.amount)} ml <small>{new Date(entry.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</small></p><button className="mini-delete" onClick={() => remove(entry.id)} aria-label={`${t('delete')} ${formatMl(entry.amount)} ml`}><Trash2 size={15}/></button></div>)}</div> : <p className="empty-state">{t('firstEntry')}</p>}</motion.section>
    <AddWaterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={add}/><GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/><HistorySheet open={historyOpen} entries={intake} onClose={() => setHistoryOpen(false)} onDelete={remove} onClearAll={clearWater}/>
    {toast !== null && <motion.div className="success-toast" initial={{ opacity: 0, y: 16, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}><span><Droplets size={17}/></span> +{toast} ml {t('added')}</motion.div>}
  </motion.main>
}
