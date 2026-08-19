import { useCallback, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { BellOff, BellRing, Droplets, Flame, History, Minus, PencilLine, Plus, Trophy } from 'lucide-react'
import { useShallow } from 'zustand/shallow'
import { useHydrationStore, selectTodayAmount } from '@/entities/hydration/model/store'
import { BodyWater } from '@/entities/hydration/ui/BodyWater'
import { ProgressRing } from '@/entities/hydration/ui/ProgressRing'
import { AddWaterSheet } from '@/features/log-water/ui/AddWaterSheet'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { HistorySheet } from '@/features/history/ui/HistorySheet'
import { WardrobeSheet } from '@/features/skins/ui/WardrobeSheet'
import { QuickRemindersSheet } from '@/features/reminders/ui/QuickRemindersSheet'
import { clamp, formatMl, todayKey } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useTranslation } from '@/shared/lib/i18n'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: .06 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 20 } },
}
const percentageMarks = [100, 75, 50, 25] as const

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function calculateStreak(dailyTotals: Record<string, number>, dayGoals: Record<string, number>, goal: number) {
  let cursor = startOfDay(new Date())
  const reachedGoal = (date: Date) => (dailyTotals[todayKey(date)] ?? 0) >= (dayGoals[todayKey(date)] ?? goal)

  if (!reachedGoal(cursor)) cursor = addDays(cursor, -1)

  let days = 0
  while (reachedGoal(cursor)) {
    days += 1
    cursor = addDays(cursor, -1)
  }
  return days
}

function correctedStreak(calculated: number, dailyTotals: Record<string, number>, dayGoals: Record<string, number>, goal: number, manualStreak: number | null, anchorDateKey: string | null) {
  if (manualStreak === null) return calculated
  if (!anchorDateKey) return manualStreak
  const anchor = startOfDay(new Date(`${anchorDateKey}T12:00:00`))
  if (Number.isNaN(anchor.getTime())) return manualStreak
  const today = startOfDay(new Date())
  const reachedGoal = (date: Date) => (dailyTotals[todayKey(date)] ?? 0) >= (dayGoals[todayKey(date)] ?? goal)
  if (anchor >= today) return reachedGoal(today) ? manualStreak + 1 : manualStreak
  if (!reachedGoal(anchor)) return calculated
  let cursor = addDays(anchor, 1)
  let value = manualStreak + 1
  while (cursor < today) {
    if (!reachedGoal(cursor)) return calculated
    value += 1
    cursor = addDays(cursor, 1)
  }
  return reachedGoal(today) ? value + 1 : value
}

export default function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const [wardrobeOpen, setWardrobeOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [toast, setToast] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('250')
  const [isEditingCustomAmount, setIsEditingCustomAmount] = useState(false)
  const { goal, addWater, removeWater, clearTodayWater, setGoal, profile, intake, dayGoals, manualStreak, manualStreakAnchorDateKey, setActiveTab, updateProfile } = useHydrationStore(useShallow((state) => ({
    goal: state.goal,
    addWater: state.addWater,
    removeWater: state.removeWater,
    clearTodayWater: state.clearTodayWater,
    setGoal: state.setGoal,
    profile: state.profile,
    intake: state.intake,
    dayGoals: state.dayGoals,
    manualStreak: state.manualStreak,
    manualStreakAnchorDateKey: state.manualStreakAnchorDateKey,
    setActiveTab: state.setActiveTab,
    updateProfile: state.updateProfile,
  })))
  const { language, t } = useTranslation()
  const millilitres = t('millilitres')
  const today = useHydrationStore(selectTodayAmount)
  const completion = goal > 0 ? Math.round((today / goal) * 100) : 0
  const fillPercentage = clamp(completion, 0, 100)
  const remaining = Math.max(goal - today, 0)
  const locale = language === 'en' ? 'en-US' : 'ru-RU'

  const dailyTotals = useMemo(() => intake.reduce<Record<string, number>>((totals, entry) => {
    const key = todayKey(new Date(entry.createdAt))
    totals[key] = (totals[key] ?? 0) + entry.amount
    return totals
  }, {}), [intake])

  const weekAverage = useMemo(() => {
    const todayStart = startOfDay(new Date())
    const total = Array.from({ length: 7 }, (_, index) => dailyTotals[todayKey(addDays(todayStart, -index))] ?? 0)
      .reduce((sum, value) => sum + value, 0)
    return Math.round(total / 7)
  }, [dailyTotals])

  const bestDay = useMemo(() => Object.entries(dailyTotals).reduce(
    (best, [date, amount]) => amount > best.amount ? { date, amount } : best,
    { date: todayKey(), amount: 0 },
  ), [dailyTotals])

  const calculatedStreak = useMemo(() => calculateStreak(dailyTotals, dayGoals, goal), [dailyTotals, dayGoals, goal])
  const streak = correctedStreak(calculatedStreak, dailyTotals, dayGoals, goal, manualStreak, manualStreakAnchorDateKey)
  const bestDate = useMemo(() => {
    if (bestDay.amount === 0) return language === 'en' ? 'No entries yet' : 'Пока нет записей'
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(`${bestDay.date}T12:00:00`))
  }, [bestDay, language, locale])

  const add = (amount: number) => {
    addWater(amount)
    setToast(amount)
    window.setTimeout(() => setToast(null), 2500)
  }

  const submitCustomAmount = () => {
    const amount = Number(customAmount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
      haptic.error()
      return
    }
    haptic.success()
    add(amount)
  }

  const adjustCustomAmount = (delta: number) => {
    const nextAmount = Math.max(0, Math.min(5000, (Number(customAmount) || 0) + delta))
    haptic.tap()
    setCustomAmount(String(nextAmount))
  }

  const remove = (id: string) => {
    haptic.success()
    removeWater(id)
  }

  const refresh = useCallback(() => haptic.success(), [])
  const { ref, pullDistance, isRefreshing } = usePullToRefresh(refresh)
  const labels = language === 'en'
    ? {
        subtitle: 'Let’s drink some water',
        remaining: 'Remaining',
        untilGoal: 'to your goal',
        goal: 'Daily goal',
        progress: 'Your progress',
        best: 'Best result',
        streak: 'Streak',
        inRow: 'in a row',
        average: 'Weekly average',
        perDay: 'per day',
        fast: 'Quick add',
        history: 'Water history',
        skins: 'Skins',
        reminders: 'Reminders',
      }
    : {
        subtitle: 'Давайте выпьем немного воды',
        remaining: 'Осталось',
        untilGoal: 'до цели',
        goal: 'Цель в день',
        progress: 'Ваш прогресс',
        best: 'Лучший результат',
        streak: 'Серия',
        inRow: 'подряд',
        average: 'Среднее за неделю',
        perDay: 'в день',
        fast: 'Быстрое добавление',
        history: 'История воды',
        skins: 'Скины',
        reminders: 'Напоминания',
      }

  return <motion.main ref={ref} className={`page home-v3-page${isEditingCustomAmount ? ' is-editing-amount' : ''}`} variants={container} initial="hidden" animate="show">
    <motion.div className="refresh-indicator" animate={{ y: Math.max(-46, pullDistance - 46), opacity: pullDistance ? 1 : 0 }}>
      <Droplets size={16} className={isRefreshing ? 'is-refreshing' : ''}/><span>{isRefreshing ? t('refresh') : t('pullToRefresh')}</span>
    </motion.div>

    <motion.header className="home-v3-header" variants={item}>
      <div>
        <h1>{t('greeting')}, {profile.name}</h1>
        <p>{labels.subtitle} <span aria-hidden="true">💧</span></p>
      </div>
    </motion.header>

    <motion.section className="home-v3-balance-card" variants={item} aria-label={t('progress')}>
      <div>
        <p>{t('todayBalance')}</p>
        <strong>{formatMl(today, language)} <small>{millilitres}</small></strong>
        <span>{t('of')} {formatMl(goal, language)} {millilitres}</span>
      </div>
      <ProgressRing value={fillPercentage} label={`${completion}%`} size={102} stroke={8}/>
    </motion.section>

    <motion.section className="home-v3-summary-grid" variants={item}>
      <div className="home-v3-summary-card home-v3-summary-card--remaining">
        <div><span>{labels.remaining}</span><strong>{remaining ? `${formatMl(remaining, language)} ${millilitres}` : t('goalReached')}</strong><small>{remaining ? labels.untilGoal : ''}</small></div>
        <i><Droplets size={21}/></i>
      </div>
      <button type="button" className="home-v3-summary-card is-button" onClick={() => { haptic.tap(); setGoalOpen(true) }}>
        <div><span>{labels.goal}</span><strong>{formatMl(goal, language)} {millilitres}</strong><small>{language === 'en' ? 'Edit target' : 'Изменить цель'}</small></div>
        <i><PencilLine size={20}/></i>
      </button>
    </motion.section>

    <motion.section className="home-v3-progress-card" variants={item}>
      <div className="home-v3-progress-heading"><h2>{labels.progress}</h2></div>
      <div className="home-v3-progress-content">
        <div className="home-v3-progress-figure">
          <div className="home-v3-scale" aria-hidden="true">{percentageMarks.map((mark) => <span key={mark}><b>{mark}%</b><i/></span>)}</div>
          <BodyWater percentage={fillPercentage} skin={profile.skin}/>
        </div>
        <div className="home-v3-metrics">
          <div className="home-v3-metric"><i><Trophy size={17}/></i><dt>{labels.best}</dt><dd>{formatMl(bestDay.amount, language)} {millilitres}</dd><small>{bestDate}</small></div>
          <div className="home-v3-metric"><i><Flame size={17}/></i><dt>{labels.streak}</dt><dd>{streak} {language === 'en' ? (streak === 1 ? 'day' : 'days') : (streak === 1 ? 'день' : streak > 1 && streak < 5 ? 'дня' : 'дней')}</dd><small>{labels.inRow}</small></div>
          <div className="home-v3-metric"><i><Droplets size={17}/></i><dt>{labels.average}</dt><dd>{formatMl(weekAverage, language)} {millilitres}</dd><small>{labels.perDay}</small></div>
          <div className="home-v3-progress-actions">
            <button type="button" onClick={() => { haptic.tap(); setActiveTab('stats') }} aria-label={language === 'en' ? 'Statistics' : 'Статистика'}><i><Trophy size={19}/></i></button>
            <button type="button" className={profile.reminders.enabled ? '' : 'is-reminders-off'} onClick={() => { haptic.tap(); setRemindersOpen(true) }} aria-label={labels.reminders}><i>{profile.reminders.enabled ? <BellRing size={19}/> : <BellOff size={19}/>}</i></button>
            <button type="button" onClick={() => { haptic.tap(); setWardrobeOpen(true) }} aria-label={labels.skins}><i><HangerIcon/></i></button>
          </div>
        </div>
      </div>
    </motion.section>

    <motion.section className="home-v3-add-row" variants={item}>
      <motion.button type="button" className="home-v3-add-water" onClick={() => { haptic.tap(); setSheetOpen(true) }} whileTap={{ scale: .985 }}>
        <span className="home-v3-add-icon"><Plus size={26}/></span><span><b>{t('addWater')}</b><small>{labels.fast}</small></span><Droplets size={22}/>
      </motion.button>
      <button type="button" className="home-v3-history-button" onClick={() => { haptic.tap(); setHistoryOpen(true) }} aria-label={labels.history}><History size={21}/></button>
    </motion.section>

    <motion.form className="home-v3-custom-entry" variants={item} onSubmit={(event) => { event.preventDefault(); submitCustomAmount() }}>
      <div className="home-v3-custom-label"><span>{t('customAmount')}</span><small>{language === 'en' ? 'Step 50 ml' : 'Шаг 50 мл'}</small></div>
      <div className="home-v3-custom-controls">
        <button type="button" onClick={() => adjustCustomAmount(-50)} aria-label={`-50 ${millilitres}`}><Minus size={18}/></button>
        <label><input value={customAmount} onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, '').slice(0, 4))} onFocus={() => setIsEditingCustomAmount(true)} onBlur={() => setIsEditingCustomAmount(false)} inputMode="numeric" aria-label={t('customAmount')}/><span>{millilitres}</span></label>
        <button type="button" onClick={() => adjustCustomAmount(50)} aria-label={`+50 ${millilitres}`}><Plus size={18}/></button>
        <motion.button type="submit" className="home-v3-custom-submit" whileTap={{ scale: .96 }} disabled={!customAmount || Number(customAmount) > 5000}>{t('addWater')}</motion.button>
      </div>
    </motion.form>

    <AddWaterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={add}/>
    <GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/>
    <HistorySheet open={historyOpen} entries={intake} onClose={() => setHistoryOpen(false)} onDelete={remove} onClearAll={clearTodayWater}/>
    <WardrobeSheet open={wardrobeOpen} skin={profile.skin} onClose={() => setWardrobeOpen(false)} onSelect={(skin) => { updateProfile({ skin }); setWardrobeOpen(false) }}/>
    <QuickRemindersSheet open={remindersOpen} enabled={profile.reminders.enabled} interval={profile.reminders.intervalMinutes} language={language} onClose={() => setRemindersOpen(false)} onToggle={(enabled) => updateProfile({ reminders: { ...profile.reminders, enabled } })} onSelectInterval={(intervalMinutes) => updateProfile({ reminders: { ...profile.reminders, intervalMinutes } })}/>
    {toast !== null && <motion.div className="success-toast" initial={{ opacity: 0, y: 16, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }}><span><Droplets size={17}/></span> +{toast} {millilitres} {t('added')}</motion.div>}
  </motion.main>
}

function HangerIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.3 7.5a2.7 2.7 0 1 1 4.1 2.3c-.9.5-1.4 1.1-1.4 2V13m-7.8 6.2 7.1-5.5a1.1 1.1 0 0 1 1.4 0l7.1 5.5a.8.8 0 0 1-.5 1.4H4.7a.8.8 0 0 1-.5-1.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
