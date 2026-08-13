import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, ChevronDown, ChevronRight, Droplets, Flame, GlassWater, PencilLine, Share2, Trophy, X } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import type { IntakeEntry } from '@/entities/hydration/model/types'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { todayKey } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

const periods = ['week', 'month', 'year'] as const
type Period = (typeof periods)[number]
type Language = 'ru' | 'en'

interface DayTotal {
  date: Date
  key: string
  amount: number
  goal: number
}

interface ChartPoint {
  label: string
  amount: number
  goal: number
}

interface HistoryItem extends DayTotal {
  start: Date
  end: Date
  kind: 'day' | 'month'
  ratio: number
}

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date: Date, amount: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}
const startOfWeek = (date: Date) => addDays(dayStart(date), -((date.getDay() + 6) % 7))

function datesBetween(start: Date, end: Date) {
  const result: Date[] = []
  for (let date = dayStart(start); date <= end; date = addDays(date, 1)) result.push(date)
  return result
}

function buildAmounts(entries: IntakeEntry[]) {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    const key = todayKey(new Date(entry.createdAt))
    totals[key] = (totals[key] ?? 0) + entry.amount
    return totals
  }, {})
}

function volume(value: number, locale: string, language: Language) {
  return `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} ${language === 'ru' ? 'л' : 'L'}`
}

function monthName(date: Date, locale: string) {
  const text = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function historyItemLabel(item: HistoryItem, locale: string) {
  return item.kind === 'month'
    ? monthName(item.date, locale)
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(item.date)
}

function periodRange(period: Period, year: number, month: number, now: Date) {
  if (period === 'week') {
    const start = startOfWeek(now)
    return { start, end: addDays(start, 6), visibleEnd: now }
  }

  if (period === 'month') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    const visibleEnd = year === now.getFullYear() && month === now.getMonth() ? now : end
    return { start, end, visibleEnd }
  }

  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  return { start, end, visibleEnd: year === now.getFullYear() ? now : end }
}

function calculateStreak(amounts: Record<string, number>, goals: Record<string, number>, fallbackGoal: number, now: Date) {
  const reached = (date: Date) => (amounts[todayKey(date)] ?? 0) >= (goals[todayKey(date)] ?? fallbackGoal)
  let cursor = reached(now) ? dayStart(now) : addDays(dayStart(now), -1)
  let streak = 0
  while (reached(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

function streakLabel(value: number, language: Language) {
  if (language === 'en') return `${value} ${value === 1 ? 'day' : 'days'}`
  const tail = value % 100
  const last = value % 10
  const word = tail >= 11 && tail <= 14 ? 'дней' : last === 1 ? 'день' : last >= 2 && last <= 4 ? 'дня' : 'дней'
  return `${value} ${word}`
}

function bucketAverage(days: DayTotal[]) {
  if (!days.length) return 0
  return Math.round(days.reduce((sum, day) => sum + day.amount, 0) / days.length)
}

function chartData(period: Period, days: DayTotal[], locale: string) {
  if (period === 'week') {
    return days.map((day) => ({
      label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day.date).replace('.', ''),
      amount: day.amount,
      goal: day.goal,
    }))
  }

  if (period === 'month') {
    const buckets: ChartPoint[] = []
    for (let index = 0; index < days.length; index += 7) {
      const bucket = days.slice(index, index + 7)
      const first = bucket[0]?.date.getDate() ?? 1
      const last = bucket.at(-1)?.date.getDate() ?? first
      buckets.push({
        label: `${first}–${last}`,
        amount: bucketAverage(bucket),
        goal: Math.round(bucket.reduce((sum, day) => sum + day.goal, 0) / Math.max(bucket.length, 1)),
      })
    }
    return buckets
  }

  const months = Array.from({ length: 12 }, () => [] as DayTotal[])
  days.forEach((day) => months[day.date.getMonth()]?.push(day))
  return months.map((monthDays, index) => ({
    label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(days[0]?.date.getFullYear() ?? new Date().getFullYear(), index, 1)).replace('.', ''),
    amount: bucketAverage(monthDays),
    goal: Math.round(monthDays.reduce((sum, day) => sum + day.goal, 0) / Math.max(monthDays.length, 1)),
  }))
}

function makeTimePoints(entries: IntakeEntry[], daysCount: number) {
  const hours = Array.from({ length: 24 }, () => 0)
  entries.forEach((entry) => { hours[new Date(entry.createdAt).getHours()] += entry.amount })
  return Array.from({ length: 8 }, (_, index) => {
    const hour = index * 3
    const total = hours.slice(hour, hour + 3).reduce((sum, value) => sum + value, 0)
    return { label: String(hour).padStart(2, '0'), amount: Math.round(total / Math.max(daysCount, 1)) }
  })
}

function getDistribution(entries: IntakeEntry[], language: Language) {
  const labels = language === 'ru'
    ? ['Утро', 'День', 'Вечер', 'Ночь']
    : ['Morning', 'Day', 'Evening', 'Night']
  const totals = [0, 0, 0, 0]
  entries.forEach((entry) => {
    const hour = new Date(entry.createdAt).getHours()
    const index = hour >= 6 && hour < 12 ? 0 : hour >= 12 && hour < 18 ? 1 : hour >= 18 ? 2 : 3
    totals[index] += entry.amount
  })
  const sum = totals.reduce((result, value) => result + value, 0)
  return labels.map((label, index) => ({ label, amount: totals[index] ?? 0, percent: sum ? Math.round(((totals[index] ?? 0) / sum) * 100) : 0 }))
}

function donutBackground(parts: number[]) {
  const colors = ['#63B7FF', '#237BE6', '#8CC65B', '#F4CC5A']
  if (!parts.some((part) => part > 0)) return '#2A2E33'
  let cursor = 0
  return `conic-gradient(${parts.map((part, index) => {
    const next = cursor + part
    const slice = `${colors[index]} ${cursor}% ${next}%`
    cursor = next
    return slice
  }).join(', ')})`
}

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth())
  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<HistoryItem | null>(null)
  const [distributionOpen, setDistributionOpen] = useState(false)
  const intake = useHydrationStore((state) => state.intake)
  const goal = useHydrationStore((state) => state.goal)
  const dayGoals = useHydrationStore((state) => state.dayGoals)
  const setGoal = useHydrationStore((state) => state.setGoal)
  const { language } = useTranslation()
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const now = new Date()

  const availableYears = useMemo(() => {
    const years = new Set([now.getFullYear()])
    intake.forEach((entry) => years.add(new Date(entry.createdAt).getFullYear()))
    Object.keys(dayGoals).forEach((key) => years.add(new Date(`${key}T12:00:00`).getFullYear()))
    return [...years].sort((left, right) => right - left)
  }, [dayGoals, intake, now.getFullYear()])

  const statistics = useMemo(() => {
    const amounts = buildAmounts(intake)
    const range = periodRange(period, selectedYear, selectedMonth, now)
    const allDays = datesBetween(range.start, range.end).map((date) => ({
      date,
      key: todayKey(date),
      amount: amounts[todayKey(date)] ?? 0,
      goal: dayGoals[todayKey(date)] ?? goal,
    }))
    const visibleDays = allDays.filter((day) => day.date <= dayStart(range.visibleEnd))
    const entries = intake.filter((entry) => {
      const date = new Date(entry.createdAt)
      return date >= range.start && date <= range.visibleEnd
    })
    const data = chartData(period, allDays, locale)
    const total = visibleDays.reduce((sum, day) => sum + day.amount, 0)
    const average = bucketAverage(visibleDays)
    const dailyGoal = visibleDays.length ? Math.round(visibleDays.reduce((sum, day) => sum + day.goal, 0) / visibleDays.length) : goal
    const maxDay = visibleDays.reduce<DayTotal | null>((best, day) => !best || day.amount > best.amount ? day : best, null)
    const goalDays = visibleDays.filter((day) => day.amount >= day.goal && day.goal > 0).length
    const goalDaysTarget = period === 'year' ? allDays.length : visibleDays.length
    const history: HistoryItem[] = period === 'year'
      ? Array.from({ length: 12 }, (_, month) => {
          const start = new Date(selectedYear, month, 1)
          const end = new Date(selectedYear, month + 1, 0)
          const monthDays = allDays.filter((day) => day.date.getMonth() === month)
          const amount = monthDays.reduce((sum, day) => sum + day.amount, 0)
          const monthGoal = monthDays.reduce((sum, day) => sum + day.goal, 0)
          return {
            key: `${selectedYear}-${String(month + 1).padStart(2, '0')}`,
            date: start,
            start,
            end,
            kind: 'month' as const,
            amount,
            goal: monthGoal,
            ratio: Math.min(100, Math.round((amount / Math.max(monthGoal, 1)) * 100)),
          }
        }).reverse()
      : visibleDays.filter((day) => day.amount > 0).reverse().map((day) => ({
          ...day,
          start: day.date,
          end: day.date,
          kind: 'day' as const,
          ratio: Math.min(100, Math.round((day.amount / Math.max(day.goal, 1)) * 100)),
        }))
    return {
      data,
      total,
      average,
      dailyGoal,
      maxDay,
      goalDays,
      goalDaysTarget,
      visibleDays,
      history,
      entries,
      distribution: getDistribution(entries, language),
      timePoints: makeTimePoints(entries, visibleDays.length),
    }
  }, [dayGoals, goal, intake, language, locale, period, selectedMonth, selectedYear])

  const streak = calculateStreak(buildAmounts(intake), dayGoals, goal, now)
  const periodTitle = language === 'ru' ? (period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год') : (period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year')
  const historyTitle = language === 'ru' ? (period === 'year' ? `Месяцы ${selectedYear} года` : `История за ${period === 'week' ? 'неделю' : 'месяц'}`) : (period === 'year' ? `${selectedYear} months` : `${periodTitle} history`)
  const maxAmount = Math.max(statistics.dailyGoal, ...statistics.data.map((entry) => entry.amount), 1000)
  const axisMax = Math.ceil(maxAmount / 500) * 500
  const axisTicks = [0, axisMax / 3, (axisMax / 3) * 2, axisMax].map((value) => Math.round(value))
  const months = Array.from({ length: 12 }, (_, month) => ({ value: month, label: monthName(new Date(selectedYear, month, 1), locale) }))
  const selectedDateLabel = period === 'month'
    ? `${monthName(new Date(selectedYear, selectedMonth, 1), locale)} ${selectedYear}`
    : period === 'year'
      ? String(selectedYear)
      : `${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(startOfWeek(now))} – ${new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(addDays(startOfWeek(now), 6))}`

  const shareStats = async () => {
    const text = language === 'ru'
      ? `Мой водный баланс Aquora: ${volume(statistics.total, locale, language)} за ${periodTitle.toLowerCase()}. Среднее — ${volume(statistics.average, locale, language)} в день.`
      : `My Aquora water balance: ${volume(statistics.total, locale, language)} this ${periodTitle.toLowerCase()}. Average — ${volume(statistics.average, locale, language)} a day.`
    try {
      if (navigator.share) await navigator.share({ title: 'Aquora Water', text })
      else await navigator.clipboard.writeText(text)
      haptic.success()
    } catch { haptic.tap() }
  }

  const selectedDayEntries = useMemo(() => selectedHistoryDay
    ? intake.filter((entry) => {
        const createdAt = new Date(entry.createdAt)
        return createdAt >= dayStart(selectedHistoryDay.start) && createdAt < addDays(dayStart(selectedHistoryDay.end), 1)
      }).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : [], [intake, selectedHistoryDay])

  return <main className="page stats-page stats-v2-page">
    <header className="stats-v2-header">
      <p className="eyebrow">{language === 'ru' ? 'Ваш ритм' : 'Your rhythm'}</p>
      <h1>{language === 'ru' ? 'Статистика' : 'Insights'}</h1>
    </header>

    <nav className="period-tabs stats-v2-tabs" aria-label={language === 'ru' ? 'Период статистики' : 'Statistics period'}>
      {periods.map((item) => <button key={item} type="button" className={period === item ? 'active' : ''} onClick={() => { haptic.tap(); setPeriod(item) }}>{item === 'week' ? (language === 'ru' ? 'Неделя' : 'Week') : item === 'month' ? (language === 'ru' ? 'Месяц' : 'Month') : (language === 'ru' ? 'Год' : 'Year')}</button>)}
    </nav>

    <section className="stats-v2-filter" aria-label={language === 'ru' ? 'Выбор периода' : 'Period selector'}>
      <CalendarDays size={16}/>
      <span>{periodTitle}</span>
      {period === 'month' && <><label><select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} aria-label={language === 'ru' ? 'Месяц' : 'Month'}>{months.map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}</select><ChevronDown size={14}/></label><label className="stats-v2-year-select"><select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label={language === 'ru' ? 'Год' : 'Year'}>{availableYears.map((year) => <option value={year} key={year}>{year}</option>)}</select><ChevronDown size={14}/></label></>}
      {period === 'year' && <label><select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label={language === 'ru' ? 'Год' : 'Year'}>{availableYears.map((year) => <option value={year} key={year}>{year}</option>)}</select><ChevronDown size={14}/></label>}
      {period === 'week' && <strong>{selectedDateLabel}</strong>}
      <button type="button" onClick={() => void shareStats()} aria-label={language === 'ru' ? 'Поделиться статистикой' : 'Share statistics'}><Share2 size={19}/></button>
    </section>

    <motion.section className="stats-v2-main-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="stats-v2-main-top">
        <div><span>{language === 'ru' ? 'В среднем за день' : 'Daily average'}</span><strong>{volume(statistics.average, locale, language)}</strong></div>
        <button type="button" onClick={() => setGoalSheetOpen(true)}><span>{language === 'ru' ? 'Цель в день' : 'Daily goal'}</span><b>{volume(statistics.dailyGoal, locale, language)}</b><i><PencilLine size={14}/></i></button>
      </div>
      <div className="stats-v2-chart stats-v2-bar-chart">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={statistics.data} barSize={period === 'year' ? 15 : 27} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
          <defs><linearGradient id="statsMainBar" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#72C0FF"/><stop offset="1" stopColor="#2377EA"/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#FFFFFF0B"/>
          <YAxis width={44} domain={[0, axisMax]} ticks={axisTicks} tickFormatter={(value: number) => volume(value, locale, language)} axisLine={false} tickLine={false} tick={{ fill: '#89919a', fontSize: 10 }}/>
          <XAxis dataKey="label" interval={0} minTickGap={period === 'year' ? 2 : 0} axisLine={false} tickLine={false} tick={{ fill: '#949ba3', fontSize: period === 'year' ? 9 : 11 }}/>
          <Tooltip cursor={{ fill: '#FFFFFF08' }} content={<WaterTooltip format={(value) => volume(value, locale, language)}/>}/>
          <ReferenceLine y={statistics.dailyGoal} stroke="#4BA4FF" strokeDasharray="5 6" ifOverflow="extendDomain"/>
          <Bar dataKey="amount" radius={[7, 7, 2, 2]}>{statistics.data.map((entry) => <Cell key={entry.label} fill={entry.amount > 0 && entry.amount === Math.max(...statistics.data.map((item) => item.amount)) ? 'url(#statsMainBar)' : '#35404D'}/>)}</Bar>
        </BarChart></ResponsiveContainer>
      </div>
    </motion.section>

    <section className="stats-v2-metrics" aria-label={language === 'ru' ? 'Показатели' : 'Key metrics'}>
      <Metric icon={Droplets} label={language === 'ru' ? 'Всего выпито' : 'Total intake'} value={volume(statistics.total, locale, language)} tone="blue"/>
      <Metric icon={GlassWater} label={language === 'ru' ? 'Дней с целью' : 'Goal days'} value={language === 'ru' ? `${statistics.goalDays} из ${statistics.goalDaysTarget}` : `${statistics.goalDays} of ${statistics.goalDaysTarget}`} tone="cyan"/>
      <Metric icon={Flame} label={language === 'ru' ? 'Серия' : 'Streak'} value={streakLabel(streak, language)} tone="orange"/>
      <Metric icon={Trophy} label={language === 'ru' ? 'Лучший день' : 'Best day'} value={statistics.maxDay ? volume(statistics.maxDay.amount, locale, language) : volume(0, locale, language)} caption={statistics.maxDay?.amount ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(statistics.maxDay.date) : (language === 'ru' ? 'Пока нет записей' : 'No entries yet')} tone="gold"/>
    </section>

    <section className="stats-v2-secondary-grid">
      <article className="stats-v2-small-card distribution-card"><div className="stats-v2-card-title"><span>{language === 'ru' ? 'Распределение' : 'Distribution'}</span><button type="button" className="stats-v2-card-action" onClick={() => { haptic.tap(); setDistributionOpen(true) }} aria-label={language === 'ru' ? 'Открыть распределение воды' : 'Open water distribution'}><ChevronRight size={16}/></button></div><div className="distribution-content"><div className="distribution-donut" style={{ background: donutBackground(statistics.distribution.map((item) => item.percent)) }}><i/></div><div className="distribution-legend">{statistics.distribution.map((item, index) => <div key={item.label}><i className={`dot-${index}`}/><span>{item.label}</span><b>{item.percent}%</b></div>)}</div></div></article>
      <article className="stats-v2-small-card time-card"><div className="stats-v2-card-title"><span>{language === 'ru' ? 'Среднее по времени' : 'Average by time'}</span></div><div className="stats-v2-time-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={statistics.timePoints} margin={{ top: 8, right: 2, bottom: -4, left: -26 }}><CartesianGrid vertical={false} stroke="#FFFFFF09"/><YAxis width={29} tickFormatter={(value: number) => volume(value, locale, language)} axisLine={false} tickLine={false} tick={{ fill: '#77818b', fontSize: 8 }}/><XAxis dataKey="label" interval={1} axisLine={false} tickLine={false} tick={{ fill: '#7c858e', fontSize: 8 }}/><Tooltip content={<WaterTooltip format={(value) => volume(value, locale, language)}/>}/><Line type="monotone" dataKey="amount" stroke="#55AEFF" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: '#0e1012', stroke: '#72baff', strokeWidth: 2 }}/></LineChart></ResponsiveContainer></div></article>
    </section>

    <section className="stats-v2-history-card">
      <div className="stats-v2-history-header"><span>{historyTitle}</span>{statistics.history.length > 5 && <button type="button" onClick={() => { haptic.tap(); setHistoryExpanded((value) => !value) }}>{historyExpanded ? (language === 'ru' ? 'Свернуть' : 'Collapse') : (language === 'ru' ? 'Подробнее' : 'Details')}</button>}</div>
      {statistics.history.length ? <div className="stats-v2-history-list">{statistics.history.slice(0, historyExpanded ? undefined : 5).map((day) => <button type="button" className="stats-v2-history-row" key={day.key} onClick={() => { haptic.tap(); setSelectedHistoryDay(day) }} aria-label={language === 'ru' ? `Подробности за ${historyItemLabel(day, locale)}` : `Details for ${historyItemLabel(day, locale)}`}><time>{historyItemLabel(day, locale)}</time><div><i style={{ width: `${day.ratio}%` }}/></div><strong>{volume(day.amount, locale, language)} <small>/ {volume(day.goal, locale, language)}</small></strong><ChevronRight size={15}/></button>)}</div> : <div className="stats-v2-empty-history">{language === 'ru' ? 'В выбранном периоде ещё нет записей воды.' : 'There are no water entries in this period yet.'}</div>}
    </section>

    <GoalSheet open={goalSheetOpen} goal={goal} onClose={() => setGoalSheetOpen(false)} onSave={setGoal}/>
    <AnimatePresence>
      {selectedHistoryDay && <>
        <motion.button className="sheet-scrim" aria-label={language === 'ru' ? 'Закрыть подробности дня' : 'Close day details'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedHistoryDay(null)}/>
        <motion.section className="bottom-sheet compact-sheet stats-v2-detail-sheet" role="dialog" aria-modal="true" aria-label={language === 'ru' ? 'Подробности дня' : 'Day details'} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
          <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{selectedHistoryDay.kind === 'month' ? (language === 'ru' ? 'Статистика за месяц' : 'Monthly statistics') : (language === 'ru' ? 'История воды' : 'Water history')}</p><h2>{historyItemLabel(selectedHistoryDay, locale)}</h2></div><button className="icon-button" onClick={() => setSelectedHistoryDay(null)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={20}/></button></div>
          <div className="stats-v2-detail-summary"><div><span>{language === 'ru' ? 'Выпито' : 'Drank'}</span><strong>{volume(selectedHistoryDay.amount, locale, language)}</strong></div><div><span>{language === 'ru' ? 'Цель' : 'Goal'}</span><strong>{volume(selectedHistoryDay.goal, locale, language)}</strong></div><div><span>{language === 'ru' ? 'Выполнение' : 'Progress'}</span><strong>{Math.round((selectedHistoryDay.amount / Math.max(selectedHistoryDay.goal, 1)) * 100)}%</strong></div></div>
          <div className="stats-v2-detail-list"><p>{language === 'ru' ? `Записи (${selectedDayEntries.length})` : `Entries (${selectedDayEntries.length})`}</p>{selectedDayEntries.map((entry) => <div key={entry.id}><span>{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt))}</span><strong>{volume(entry.amount, locale, language)}</strong></div>)}</div>
        </motion.section>
      </>}
      {distributionOpen && <>
        <motion.button className="sheet-scrim" aria-label={language === 'ru' ? 'Закрыть распределение' : 'Close distribution'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDistributionOpen(false)}/>
        <motion.section className="bottom-sheet compact-sheet stats-v2-detail-sheet" role="dialog" aria-modal="true" aria-label={language === 'ru' ? 'Распределение воды' : 'Water distribution'} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
          <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{periodTitle}</p><h2>{language === 'ru' ? 'Распределение воды' : 'Water distribution'}</h2></div><button className="icon-button" onClick={() => setDistributionOpen(false)} aria-label={language === 'ru' ? 'Закрыть' : 'Close'}><X size={20}/></button></div>
          <p className="stats-v2-detail-note">{selectedDateLabel}</p>
          <div className="stats-v2-distribution-list">{statistics.distribution.map((item, index) => <div key={item.label}><span className={`dot-${index}`}/><strong>{item.label}</strong><b>{volume(item.amount, locale, language)}</b><small>{item.percent}%</small></div>)}</div>
        </motion.section>
      </>}
    </AnimatePresence>
  </main>
}

function Metric({ icon: Icon, label, value, caption, tone }: { icon: typeof Droplets; label: string; value: string; caption?: string; tone: 'blue' | 'cyan' | 'orange' | 'gold' }) {
  return <article className="stats-v2-metric"><span className={`stats-v2-metric-icon ${tone}`}><Icon size={18}/></span><p>{label}</p><strong>{value}</strong>{caption && <small>{caption}</small>}</article>
}

function WaterTooltip({ active, payload, format }: { active?: boolean; payload?: readonly { value?: number | string | readonly (number | string)[] }[]; format: (value: number) => string }) {
  const raw = payload?.[0]?.value
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!active || !Number.isFinite(value)) return null
  return <div className="chart-tooltip">{format(value)}</div>
}
