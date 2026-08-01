import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, Flame, Trophy } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import { formatLitres } from '@/shared/lib/format'
const periods = ['Сегодня', 'Неделя', 'Месяц', 'Год'] as const
type Period = typeof periods[number]

export default function StatisticsPage() {
  const [period, setPeriod] = useState<Period>('Неделя')
  const goal = useHydrationStore((state) => state.goal)
  const intake = useHydrationStore((state) => state.intake)
  const data = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = date.toISOString().slice(0, 10)
    const amount = intake.filter((entry) => entry.createdAt.startsWith(key)).reduce((sum, entry) => sum + entry.amount, 0)
    return { day: new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', ''), amount }
  }), [intake])
  const average = Math.round(data.reduce((sum, entry) => sum + entry.amount, 0) / data.length)
  const max = Math.max(0, ...data.map((entry) => entry.amount))
  const complete = Math.round((data.filter((entry) => entry.amount >= goal).length / data.length) * 100)
  const total = data.reduce((sum, entry) => sum + entry.amount, 0)
  const record = Math.max(0, ...Object.values(intake.reduce<Record<string, number>>((daysByDate, entry) => { const key = entry.createdAt.slice(0, 10); daysByDate[key] = (daysByDate[key] ?? 0) + entry.amount; return daysByDate }, {})))
  const cards = [
    { label: 'Серия', value: total ? '1 день' : '0 дней', icon: Flame, tone: 'orange' },
    { label: 'Личный рекорд', value: formatLitres(record), icon: Trophy, tone: 'blue' }
  ]
  return <main className="page stats-page"><header className="page-header"><div><p className="eyebrow">Ваш ритм</p><h1>Статистика</h1></div><button className="period-dropdown">2026 <ChevronDown size={16}/></button></header>
    <div className="period-tabs" role="tablist">{periods.map((name) => <button key={name} className={name === period ? 'active' : ''} onClick={() => setPeriod(name)}>{name}</button>)}</div>
    <motion.section className="chart-card primary-chart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="section-row"><div><p className="eyebrow">{period}</p><h2>{formatLitres(average)} <small>в среднем</small></h2></div><span className="goal-chip">{complete}% цели</span></div><div className="chart-holder bar-holder"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barSize={22} margin={{ top: 10, right: 2, bottom: 0, left: -25 }}><defs><linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#68BAFF"/><stop offset="1" stopColor="#2678F6"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#FFFFFF0C"/><YAxis tickFormatter={(value: number) => `${value / 1000}л`} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><Tooltip cursor={{ fill: '#FFFFFF08' }} content={<WaterTooltip/>}/><Bar dataKey="amount" radius={[8,8,4,4]}>{data.map((entry) => <Cell key={entry.day} fill={entry.amount === max ? 'url(#barGradient)' : '#2B3442'}/>)}</Bar></BarChart></ResponsiveContainer></div></motion.section>
    <section className="metric-grid">{cards.map(({ label, value, icon: Icon, tone }) => <motion.article className="metric-card" key={label} whileTap={{ scale: .98 }}><span className={`metric-icon ${tone}`}><Icon size={18}/></span><p>{label}</p><strong>{value}</strong></motion.article>)}</section>
    <section className="chart-card line-card"><div className="section-row"><div><p className="eyebrow">Тренд за 7 дней</p><h2>Ваш водный баланс</h2></div><span className="soft-dot"/></div><div className="chart-holder line-holder"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -25 }}><defs><linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#48A5FF" stopOpacity=".35"/><stop offset="1" stopColor="#48A5FF" stopOpacity="0"/></linearGradient></defs><CartesianGrid vertical={false} stroke="#FFFFFF0A"/><YAxis tickFormatter={(value: number) => `${value / 1000}л`} axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#83878e', fontSize: 11 }}/><Tooltip content={<WaterTooltip/>}/><Line type="monotone" dataKey="amount" stroke="#55AEFF" strokeWidth={3} dot={{ fill: '#0F1115', stroke: '#80C8FF', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} isAnimationActive/></LineChart></ResponsiveContainer></div></section>
    <section className="insight-card"><div><span>Лучший день недели</span><strong>{formatLitres(max)}</strong><p>{total ? 'Данные обновляются после каждой записи' : 'Добавьте первую запись воды'}</p></div><div className="mini-heatmap" aria-label="Тепловая карта недели">{data.map((entry) => <i key={entry.day} style={{ opacity: .12 + entry.amount / 3700 }}/>)}</div></section>
  </main>
}

function WaterTooltip({ active, payload }: { active?: boolean; payload?: readonly { value?: number | string | readonly (number | string)[] }[] }) {
  const rawValue = payload?.[0]?.value
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  if (!active || !Number.isFinite(value)) return null
  return <div className="chart-tooltip">{formatLitres(value)}</div>
}
