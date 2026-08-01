import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Flame, Trophy } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import type { IntakeEntry } from '@/entities/hydration/model/types'
import { useTranslation } from '@/shared/lib/i18n'
import { todayKey } from '@/shared/lib/format'

const periods = [{ id: 'week', key: 'week' }, { id: 'month', key: 'month' }, { id: 'year', key: 'year' }] as const
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

const getDateRange = (start: Date, end: Date) => {
  const dates: Date[] = []
  for (let current = startOfDay(start); current <= end; current = addDays(current, 1)) dates.push(current)
  return dates
}

function buildAmountByDay(intake: IntakeEntry[]) {
  return intake.reduce<Record<string, number>>((amounts, entry) => {
    const key = todayKey(new Date(entry.createdAt))
    amounts[key] = (amounts[key] ?? 0) + entry.amount
    return amounts
  }, {})
}

function getChartData(period: Period, amountsByDay: Record<string, number>, locale: string, now: Date): ChartPoint[] {
  if (period === 'week') {
    return getDateRange(addDays(now, -6), now).map((date) => ({
      label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).replace('.', ''),
      amount: amountsByDay[todayKey(date)] ?? 0,
    }))
  }

  if (period === 'month') {
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, weekIndex) => {
      const firstDay = weekIndex * 7 + 1
      const lastDay = Math.min(firstDay + 6, daysInMonth)
      const amount = getDateRange(new Date(year, month, firstDay), new Date(year, month, lastDay))
        .reduce((total, date) => total + (amountsByDay[todayKey(date)] ?? 0), 0)

      return { label: `${firstDay}–${lastDay}`, amount }
    })
  }

  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(now.getFullYear(), month, 1)
    const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate()
    const amount = getDateRange(date, new Date(now.getFullYear(), month, daysInMonth))
      .reduce((total, day) => total + (amountsByDay[todayKey(day)] ?? 0), 0)

    return {
      label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', ''),
      amount,
    }
  })
}

function getActiveDates(period: Period, now: Date) {
  if (period === 'week') return getDateRange(addDays(now, -6), now)
  if (period === 'month') return getDateRange(new Date(now.getFullYear(), now.getMonth(), 1), now)
  return getDateRange(new Date(now.getFullYear(), 0, 1), now)
}

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('week')
  const goal = useHydrationStore((state) => state.goal)
  const intake = useHydrationStore((state) => state.intake)
  const { language, t } = useTranslation()
  const locale = language === 'en' ? 'en-US' : 'ru-RU'
  const formatVolume = (value: number) => `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} ${t('litres')}`
  const now = new Date()

  const { data, activeDates, amountsByDay } = useMemo(() => {
    const totals = buildAmountByDay(intake)
    return {
      amountsByDay: totals,
      data: getChartData(period, totals, locale, now),
      activeDates: getActiveDates(period, now),
    }
  }, [intake, locale, period])

  const total = data.reduce((sum, entry) => sum + entry.amount, 0)
  const average = activeDates.length ? Math.round(activeDates.reduce((sum, date) => sum + (amountsByDay[todayKey(date)] ?? 0), 0) / activeDates.length) : 0
  const max = Math.max(0, ...data.map((entry) => entry.amount))
  const axisUpperBound = max === 0 ? 1000 : Math.max(500, Math.ceil(max / 500) * 500)
  const axisTicks = [0, 1, 2, 3].map((step) => Math.round((axisUpperBound * step) / 3))
  const complete = activeDates.length ? Math.round((activeDates.filter((date) => (amountsByDay[todayKey(date)] ?? 0) >= goal).length / activeDates.length) * 100) : 0
  const record = Math.max(0, ...Object.values(amountsByDay))
  const cards = [{ label: t('streak'), value: total ? `1 ${t('day')}` : `0 ${t('days')}`, icon: Flame, tone: 'orange' }, { label: t('personalRecord'), value: formatVolume(record), icon: Trophy, tone: 'blue' }]
  const periodLabel = t(periods.find((entry) => entry.id === period)?.key ?? 'week')
  const trendLabel = language === 'ru'
    ? period === 'week' ? 'Тренд за 7 дней' : period === 'month' ? 'Тренд за месяц' : 'Тренд за год'
    : period === 'week' ? '7-day trend' : period === 'month' ? 'Monthly trend' : 'Yearly trend'
  const bestResultLabel = language === 'ru' ? 'Лучший результат за период' : 'Best result in this period'

  return <main className="page stats-page"><header className="page-header"><div><p className="eyebrow">{t('yourRhythm')}</p><h1>{t('stats')}</h1></div><button className="period-dropdown">{now.getFullYear()} <ChevronDown size={16}/></button></header>
    <div className="period-tabs" role="tablist">{periods.map(({ id, key }) => <button key={id} className={id === period ? 'active' : ''} onClick={() => setPeriod(id)}>{t(key)}</button>)}</div>
    <motion.section className="chart-card primary-chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="section-row"><div><p className="eyebrow">{periodLabel}</p><h2>{formatVolume(average)} <small>{t('average')}</small></h2></div><span className="goal-chip">{complete}% {t('goalPercent')}</span></div><div className="chart-holder bar-holder"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barSize={period === 'year' ? 14 : 22} margin={{ top: 10, right: 2, bottom: 0, left: -25 }}><defs><linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#68BAFF"/><stop offset="1" stopColor="#2678F6"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#FFFFFF0C"/><YAxis domain={[0, axisUpperBound]} ticks={axisTicks} allowDecimals={false} tickFormatter={formatVolume} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: period === 'year' ? 9 : 11 }}/><Tooltip cursor={{ fill: '#FFFFFF08' }} content={<WaterTooltip format={formatVolume}/>}/><Bar dataKey="amount" radius={[8, 8, 4, 4]}>{data.map((entry) => <Cell key={entry.label} fill={max > 0 && entry.amount === max ? 'url(#barGradient)' : '#2B3442'}/>)}</Bar></BarChart></ResponsiveContainer></div></motion.section>
    <section className="metric-grid">{cards.map(({ label, value, icon: Icon, tone }) => <motion.article className="metric-card" key={label} whileTap={{ scale: .98 }}><span className={`metric-icon ${tone}`}><Icon size={18}/></span><p>{label}</p><strong>{value}</strong></motion.article>)}</section>
    <section className="chart-card line-card"><div className="section-row"><div><p className="eyebrow">{trendLabel}</p><h2>{t('waterBalance')}</h2></div><span className="soft-dot"/></div><div className="chart-holder line-holder"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -25 }}><CartesianGrid vertical={false} stroke="#FFFFFF0A"/><YAxis domain={[0, axisUpperBound]} ticks={axisTicks} allowDecimals={false} tickFormatter={formatVolume} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: period === 'year' ? 9 : 11 }}/><Tooltip content={<WaterTooltip format={formatVolume}/>}/><Line type="monotone" dataKey="amount" stroke="#55AEFF" strokeWidth={3} dot={{ fill: '#0F1115', stroke: '#80C8FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} isAnimationActive/></LineChart></ResponsiveContainer></div></section>
    <section className="insight-card"><div><span>{bestResultLabel}</span><strong>{formatVolume(max)}</strong><p>{total ? t('dataUpdates') : t('addFirstRecord')}</p></div><div className="mini-heatmap" aria-label={t('heatmap')}>{data.slice(0, 9).map((entry) => <i key={entry.label} style={{ opacity: .12 + Math.min(entry.amount / 3700, .88) }}/>)}</div></section>
  </main>
}

function WaterTooltip({ active, payload, format }: { active?: boolean; payload?: readonly { value?: number | string | readonly (number | string)[] }[]; format: (value: number) => string }) {
  const rawValue = payload?.[0]?.value
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!active || !Number.isFinite(value)) return null
  return <div className="chart-tooltip">{format(value)}</div>
}
