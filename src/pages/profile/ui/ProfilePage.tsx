import { useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, CalendarDays, ChevronRight, CircleHelp, Droplets, Globe2, Info, MoonStar, Ruler, Scale, ShieldCheck, UserRound } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { haptic } from '@/shared/lib/telegram'
import { useGoalRecommendation } from '@/entities/hydration/model/useGoalRecommendation'

interface SettingRow { icon: typeof UserRound; label: string; value?: string; action?: 'toggle' | 'chevron' }

export default function ProfilePage() {
  const { profile, updateProfile, goal, setGoal } = useHydrationStore()
  const recommendation = useGoalRecommendation(profile)
  const [goalOpen, setGoalOpen] = useState(false)
  const personal: SettingRow[] = [
    { icon: UserRound, label: 'Имя', value: profile.name },
    { icon: Droplets, label: 'Пол', value: profile.gender === 'male' ? 'Мужской' : profile.gender === 'female' ? 'Женский' : 'Другой' },
    { icon: CalendarDays, label: 'Возраст', value: `${profile.age} лет` },
    { icon: Scale, label: 'Вес', value: `${profile.weight} кг` },
    { icon: Ruler, label: 'Рост', value: `${profile.height} см` }
  ]
  const preferences: SettingRow[] = [
    { icon: BellRing, label: 'Напоминания', action: 'toggle' },
    { icon: BellRing, label: 'Частота уведомлений', value: profile.reminderInterval },
    { icon: MoonStar, label: 'Тёмная тема', value: 'Включена', action: 'toggle' },
    { icon: Globe2, label: 'Язык', value: 'Русский' }
  ]
  return <main className="page profile-page"><header className="page-header"><div><p className="eyebrow">Личное пространство</p><h1>Профиль</h1></div><div className="avatar">{profile.name.slice(0, 1)}</div></header>
    <section className="profile-summary"><div className="profile-orb"><Droplets size={25}/></div><div><span>Персональный план</span><strong>{goal / 1000} л в день</strong><p>Рекомендация: {recommendation.data?.value ?? goal} мл{recommendation.data?.temperatureC ? ` · ${recommendation.data.temperatureC}°C` : ''}</p></div><button onClick={() => setGoalOpen(true)}><ChevronRight size={19}/></button></section>
    <SettingsGroup title="Личные данные" rows={personal} onClick={haptic.tap}/>
    <section className="settings-section"><h2>Цель и активность</h2><div className="settings-card"><Setting icon={Droplets} label="Дневная цель" value={`${goal} мл`} onClick={() => setGoalOpen(true)}/><Setting icon={CircleHelp} label="Уровень активности" value={profile.activity === 'moderate' ? 'Средний' : profile.activity === 'high' ? 'Высокий' : 'Низкий'} onClick={haptic.tap}/></div></section>
    <section className="settings-section"><h2>Настройки</h2><div className="settings-card">{preferences.map((row) => <Setting key={row.label} {...row} toggleValue={row.label === 'Напоминания' ? profile.reminders : true} onToggle={row.label === 'Напоминания' ? () => updateProfile({ reminders: !profile.reminders }) : undefined} onClick={haptic.tap}/>)}</div></section>
    <section className="settings-section"><div className="settings-card"><Setting icon={ShieldCheck} label="Политика конфиденциальности" onClick={haptic.tap}/><Setting icon={CircleHelp} label="Поддержка" onClick={haptic.tap}/><Setting icon={Info} label="О приложении" onClick={haptic.tap}/></div></section>
    <p className="app-version">Aquora · версия 1.0.0</p><GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/>
  </main>
}

function SettingsGroup({ title, rows, onClick }: { title: string; rows: SettingRow[]; onClick: () => void }) {
  return <section className="settings-section"><h2>{title}</h2><div className="settings-card">{rows.map((row) => <Setting key={row.label} {...row} onClick={onClick}/>)}</div></section>
}

function Setting({ icon: Icon, label, value, action = 'chevron', toggleValue, onToggle, onClick }: SettingRow & { toggleValue?: boolean; onToggle?: () => void; onClick: () => void }) {
  const toggle = () => { haptic.tap(); onToggle?.() }
  return <button className="setting-row" onClick={action === 'toggle' ? toggle : onClick}><span className="setting-icon"><Icon size={18}/></span><span className="setting-label">{label}</span>{value && <span className="setting-value">{value}</span>}{action === 'toggle' ? <span className={`switch ${toggleValue ? 'on' : ''}`}><i/></span> : <ChevronRight className="row-chevron" size={17}/>}</button>
}
