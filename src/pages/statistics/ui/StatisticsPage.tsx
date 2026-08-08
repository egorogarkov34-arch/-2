import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Flame, Trophy } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import type { IntakeEntry } from '@/entities/hydration/model/types'
import { useTranslation } from '@/shared/lib/i18n'
import { todayKey } from '@/shared/lib/format'

const periods = [
  { id: 'week', key: 'week' },
  { id: 'month', key: 'month' },
  { id: 'year', key: 'year' },
] as const

type Period = (typeof periods)[number]['id']

interface ChartPoint {
  label: string
  amount: number
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ISO week: Monday is always the first day and Sunday is the last.
const startOfWeek = (date: Date) => {
  const day = startOfDay(date)
  const daysSinceMonday = (day.getDay() + 6) % 7
  return addDays(day, -daysSinceMonday)
}

const getDateRange = (start: Date, end: Date) => {
  const dates: Date[] = []
  for (let current = startOfDay(start); current <= end; current = addDays(current, 1)) {
    dates.push(current)
  }
  return dates
}

function buildAmountByDay(intake: IntakeEntry[]) {
  return intake.reduce<Record<string, number>>((amounts, entry) => {
    const key = todayKey(new Date(entry.createdAt))
    amounts[key] = (amounts[key] ?? 0) + entry.amount
    return amounts
  }, {})
}

function calculateStreak(amountsByDay: Record<string, number>, goal: number, now: Date) {
  const today = startOfDay(now)
  // An unfinished current day must not erase a streak completed through yesterday.
  let date = (amountsByDay[todayKey(today)] ?? 0) >= goal ? today : addDays(today, -1)
  let streak = 0

  while ((amountsByDay[todayKey(date)] ?? 0) >= goal) {
    streak += 1
    date = addDays(date, -1)
  }

  return streak
}

function formatStreak(streak: number, language: 'ru' | 'en') {
  if (language === 'en') return `${streak} ${streak === 1 ? 'day' : 'days'}`
  const lastTwoDigits = streak % 100
  const lastDigit = streak % 10
  const label = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? '\u0434\u043d\u0435\u0439'
    : lastDigit === 1
      ? '\u0434\u0435\u043d\u044c'
      : lastDigit >= 2 && lastDigit <= 4
        ? '\u0434\u043d\u044f'
        : '\u0434\u043d\u0435\u0439'
  return `${streak} ${label}`
}

function getChartData(
  period: Period,
  amountsByDay: Record<string, number>,
  locale: string,
  now: Date,
  selectedYear: number,
  selectedMonth: number,
): ChartPoint[] {
  if (period === 'week') {
    const monday = startOfWeek(now)
    return getDateRange(monday, addDays(monday, 6)).map((date) => ({
      label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', ''),
      amount: amountsByDay[todayKey(date)] ?? 0,
    }))
  }

  if (period === 'month') {
    const year = now.getFullYear()
    const month = selectedMonth
    const monthEnd = new Date(year, month + 1, 0)
    const daysInMonth = monthEnd.getDate()

    return Array.from({ length: 4 }, (_, weekIndex) => {
      const firstDay = weekIndex * 7 + 1
      const lastDay = weekIndex === 3 ? daysInMonth : Math.min(firstDay + 6, daysInMonth)
      const weekStart = new Date(year, month, firstDay)
      const weekEnd = new Date(year, month, lastDay)
      const amount = getDateRange(weekStart, weekEnd)
        .reduce((total, date) => total + (amountsByDay[todayKey(date)] ?? 0), 0)

      return { label: `${firstDay}\u2013${lastDay}`, amount }
    })
  }

  return Array.from({ length: 12 }, (_, month) => {
    const monthStart = new Date(selectedYear, month, 1)
    const monthEnd = new Date(selectedYear, month + 1, 0)
    const amount = getDateRange(monthStart, monthEnd)
      .reduce((total, date) => total + (amountsByDay[todayKey(date)] ?? 0), 0)

    return {
      label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(monthStart).replace('.', ''),
      amount,
    }
  })
}

function getActiveDates(period: Period, now: Date, selectedYear: number, selectedMonth: number) {
  if (period === 'week') return getDateRange(startOfWeek(now), now)
  if (period === 'month') {
    const monthEnd = new Date(now.getFullYear(), selectedMonth + 1, 0)
    const endDate = selectedMonth === now.getMonth() ? now : monthEnd
    return getDateRange(new Date(now.getFullYear(), selectedMonth, 1), endDate)
  }
  const yearEnd = selectedYear === now.getFullYear() ? now : new Date(selectedYear, 11, 31)
  return getDateRange(new Date(selectedYear, 0, 1), yearEnd)
}

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth())
  const intake = useHydrationStore((state) => state.intake)
  const goal = useHydrationStore((state) => state.goal)
  const { language, t } = useTranslation()
  const locale = language === 'en' ? 'en-US' : 'ru-RU'
  const now = new Date()
  const dayKey = todayKey(now)
  const formatVolume = (value: number) => `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} ${t('litres')}`
  const availableYears = useMemo(() => {
    const currentYear = now.getFullYear()
    const intakeYears = intake.map((entry) => new Date(entry.createdAt).getFullYear())
    return [...new Set([currentYear, ...intakeYears])].sort((first, second) => second - first)
  }, [intake, now.getFullYear()])

  const { data, activeDates, amountsByDay } = useMemo(() => {
    const totals = buildAmountByDay(intake)
    return {
      amountsByDay: totals,
      data: getChartData(period, totals, locale, now, selectedYear, selectedMonth),
      activeDates: getActiveDates(period, now, selectedYear, selectedMonth),
    }
  }, [dayKey, intake, locale, period, selectedMonth, selectedYear])

  const total = data.reduce((sum, entry) => sum + entry.amount, 0)
  const average = activeDates.length
    ? Math.round(activeDates.reduce((sum, date) => sum + (amountsByDay[todayKey(date)] ?? 0), 0) / activeDates.length)
    : 0
  const max = Math.max(0, ...data.map((entry) => entry.amount))
  const axisUpperBound = max === 0 ? 1000 : Math.max(500, Math.ceil(max / 500) * 500)
  const axisTicks = [0, 1, 2, 3].map((step) => Math.round((axisUpperBound * step) / 3))
  const record = Math.max(0, ...Object.values(amountsByDay))
  const streak = calculateStreak(amountsByDay, goal, now)
  const cards = [
    { label: t('streak'), value: formatStreak(streak, language), icon: Flame, tone: 'orange' },
    { label: t('personalRecord'), value: formatVolume(record), icon: Trophy, tone: 'blue' },
  ]
  const periodLabel = t(periods.find((entry) => entry.id === period)?.key ?? 'week')
  const monthOptions = Array.from({ length: 12 }, (_, month) => ({
    value: month,
    label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(now.getFullYear(), month, 1)),
  }))
  const trendLabel = language === 'ru'
    ? period === 'week'
      ? '\u0422\u0440\u0435\u043d\u0434 \u0437\u0430 7 \u0434\u043d\u0435\u0439'
      : period === 'month'
        ? '\u0422\u0440\u0435\u043d\u0434 \u0437\u0430 \u043c\u0435\u0441\u044f\u0446'
        : '\u0422\u0440\u0435\u043d\u0434 \u0437\u0430 \u0433\u043e\u0434'
    : period === 'week'
      ? '7-day trend'
      : period === 'month'
        ? 'Monthly trend'
        : 'Yearly trend'
  const bestResultLabel = language === 'ru'
    ? '\u041b\u0443\u0447\u0448\u0438\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0437\u0430 \u043f\u0435\u0440\u0438\u043e\u0434'
    : 'Best result in this period'
  const yearlyTickSize = period === 'year' ? 8 : 11

  return (
    <main className="page stats-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('yourRhythm')}</p>
          <h1>{t('stats')}</h1>
        </div>
      </header>

      <div className="period-tabs" role="tablist">
        {periods.map(({ id, key }) => (
          <button key={id} className={id === period ? 'active' : ''} onClick={() => setPeriod(id)}>
            {t(key)}
          </button>
        ))}
      </div>

      <motion.section className="chart-card primary-chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="section-row">
          <div>
            <div className="chart-period-heading">
              <p className="eyebrow">{periodLabel}</p>
              {period === 'month' && <label className="month-picker">
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} aria-label={t('month')}>
                  {monthOptions.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>}
              {period === 'year' && <label className="year-picker">
                <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label={t('year')}>
                  {availableYears.map((year) => <option value={year} key={year}>{year}</option>)}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>}
            </div>
            <h2>{formatVolume(average)} <small>{t('average')}</small></h2>
          </div>
        </div>
        <div className="chart-holder bar-holder">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={period === 'year' ? 12 : 22} margin={{ top: 10, right: 2, bottom: 0, left: -25 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#68BAFF" />
                  <stop offset="1" stopColor="#2678F6" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#FFFFFF0C" />
              <YAxis domain={[0, axisUpperBound]} ticks={axisTicks} allowDecimals={false} tickFormatter={formatVolume} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }} />
              <XAxis dataKey="label" interval={0} minTickGap={0} padding={{ left: 2, right: 2 }} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: yearlyTickSize }} />
              <Tooltip cursor={{ fill: '#FFFFFF08' }} content={<WaterTooltip format={formatVolume} />} />
              <Bar dataKey="amount" radius={[8, 8, 4, 4]}>
                {data.map((entry) => <Cell key={entry.label} fill={max > 0 && entry.amount === max ? 'url(#barGradient)' : '#2B3442'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <section className="metric-grid">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <motion.article className="metric-card" key={label} whileTap={{ scale: 0.98 }}>
            <span className={`metric-icon ${tone}`}><Icon size={18} /></span>
            <p>{label}</p>
            <strong>{value}</strong>
          </motion.article>
        ))}
      </section>

      <section className="chart-card line-card">
        <div className="section-row">
          <div>
            <p className="eyebrow">{trendLabel}</p>
            <h2>{t('waterBalance')}</h2>
          </div>
          <span className="soft-dot" />
        </div>
        <div className="chart-holder line-holder">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -25 }}>
              <CartesianGrid vertical={false} stroke="#FFFFFF0A" />
              <YAxis domain={[0, axisUpperBound]} ticks={axisTicks} allowDecimals={false} tickFormatter={formatVolume} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }} />
              <XAxis dataKey="label" interval={0} minTickGap={0} padding={{ left: 2, right: 2 }} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: yearlyTickSize }} />
              <Tooltip content={<WaterTooltip format={formatVolume} />} />
              <Line type="monotone" dataKey="amount" stroke="#55AEFF" strokeWidth={3} dot={{ fill: '#0F1115', stroke: '#80C8FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="insight-card">
        <div>
          <span>{bestResultLabel}</span>
          <strong>{formatVolume(max)}</strong>
          <p>{total ? t('dataUpdates') : t('addFirstRecord')}</p>
        </div>
        <div className="mini-heatmap" aria-label={t('heatmap')}>
          {data.slice(0, 9).map((entry) => <i key={entry.label} style={{ opacity: 0.12 + Math.min(entry.amount / 3700, 0.88) }} />)}
        </div>
      </section>
    </main>
  )
}

function WaterTooltip({ active, payload, format }: { active?: boolean; payload?: readonly { value?: number | string | readonly (number | string)[] }[]; format: (value: number) => string }) {
  const rawValue = payload?.[0]?.value
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!active || !Number.isFinite(value)) return null
  return <div className="chart-tooltip">{format(value)}</div>
}
