import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, CalendarDays, Check, ChevronRight, CircleHelp, Clock3, Droplets, Globe2, Ruler, Scale, UserRound, X } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import type { ReminderInterval } from '@/entities/hydration/model/types'
import { haptic } from '@/shared/lib/telegram'
import { useGoalRecommendation } from '@/entities/hydration/model/useGoalRecommendation'
import { EditProfileFieldSheet, type EditableProfileField } from '@/features/profile/ui/EditProfileFieldSheet'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { useTranslation, type TranslationKey } from '@/shared/lib/i18n'
import { calculateWaterGoal } from '@/entities/hydration/model/calculateGoal'

type RowId = 'language' | 'reminders' | 'reminderFrequency'
interface SettingRow { id?: RowId; field?: EditableProfileField; icon: typeof UserRound; label: string; value?: string; action?: 'toggle' | 'chevron'; disabled?: boolean }

const reminderFrequencyOptions: Array<{ value: ReminderInterval; label: TranslationKey }> = [
  { value: 30, label: 'every30Minutes' },
  { value: 60, label: 'everyHour' },
  { value: 120, label: 'every2Hours' },
  { value: 180, label: 'every3Hours' },
]

export default function ProfilePage() {
  const { profile, updateProfile, goal, setAutomaticGoal, setGoal } = useHydrationStore()
  const { language, t } = useTranslation()
  const recommendation = useGoalRecommendation(profile)
  const [editingField, setEditingField] = useState<EditableProfileField | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [reminderFrequencyOpen, setReminderFrequencyOpen] = useState(false)
  const recommendedGoal = recommendation.data?.value ?? calculateWaterGoal(profile)
  useEffect(() => { setAutomaticGoal(recommendedGoal) }, [recommendedGoal, setAutomaticGoal])
  const activityName = profile.activity === 'moderate' ? t('moderate') : profile.activity === 'high' ? t('high') : t('low')
  const genderName = profile.gender === 'male' ? t('male') : profile.gender === 'female' ? t('female') : t('other')
  const goalInLitres = (goal / 1000).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 })
  const toggleLanguage = () => updateProfile({ language: profile.language === 'ru' ? 'en' : 'ru' })
  const toggleReminders = () => updateProfile({ reminders: { ...profile.reminders, enabled: !profile.reminders.enabled } })
  const reminderFrequency = profile.reminders.intervalMinutes === 30 ? t('every30Minutes') : profile.reminders.intervalMinutes === 60 ? t('everyHour') : profile.reminders.intervalMinutes === 180 ? t('every3Hours') : t('every2Hours')
  const personal: SettingRow[] = [
    { field: 'name', icon: UserRound, label: t('name'), value: profile.name }, { field: 'gender', icon: Droplets, label: t('gender'), value: genderName },
    { field: 'age', icon: CalendarDays, label: t('age'), value: `${profile.age} ${t('years')}` }, { field: 'weight', icon: Scale, label: t('weight'), value: `${profile.weight} kg` },
    { field: 'height', icon: Ruler, label: t('height'), value: `${profile.height} cm` }
  ]
  const preferences: SettingRow[] = [
    { id: 'reminders', icon: BellRing, label: t('reminders'), value: profile.reminders.enabled ? t('enabled') : t('disabled'), action: 'toggle' },
    { id: 'reminderFrequency', icon: Clock3, label: t('reminderFrequency'), value: reminderFrequency, disabled: !profile.reminders.enabled },
    { id: 'language', icon: Globe2, label: t('language'), value: profile.language === 'ru' ? t('russian') : 'English' }
  ]
  const preferenceAction = (id: RowId | undefined) => id === 'reminders' ? toggleReminders : undefined
  const preferenceClick = (id: RowId | undefined) => id === 'language' ? toggleLanguage : id === 'reminderFrequency' ? () => { haptic.tap(); setReminderFrequencyOpen(true) } : haptic.tap
  return <main className="page profile-page"><header className="page-header"><div><p className="eyebrow">{t('personalSpace')}</p><h1>{t('profile')}</h1></div><div className="avatar">{profile.name.replace('@', '').slice(0, 1).toUpperCase()}</div></header>
    <section className="profile-summary"><div className="profile-orb"><Droplets size={25}/></div><div><strong>{goalInLitres} {t('litres')} {t('perDay')}</strong><p>{t('goalSummaryHint')}</p></div></section>
    <SettingsGroup title={t('personalData')} rows={personal} onClick={setEditingField}/>
    <section className="settings-section"><h2>{t('goalAndActivity')}</h2><div className="settings-card"><Setting icon={Droplets} label={t('goal')} value={`${goal} ${t('millilitres')}`} onClick={() => setGoalOpen(true)}/><Setting icon={CircleHelp} label={t('activity')} value={activityName} onClick={() => setEditingField('activity')}/></div></section>
    <section className="settings-section"><h2>{t('settings')}</h2><div className="settings-card">{preferences.map((row) => <Setting key={row.id} {...row} toggleValue={row.id === 'reminders' ? profile.reminders.enabled : undefined} onToggle={preferenceAction(row.id)} onClick={preferenceClick(row.id)}/>)}</div></section>
    <GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/><ReminderFrequencySheet open={reminderFrequencyOpen} interval={profile.reminders.intervalMinutes} onClose={() => setReminderFrequencyOpen(false)} onSave={(interval) => updateProfile({ reminders: { ...profile.reminders, intervalMinutes: interval } })}/><EditProfileFieldSheet open={editingField !== null} field={editingField} profile={profile} onClose={() => setEditingField(null)} onSave={updateProfile}/>
  </main>
}

function SettingsGroup({ title, rows, onClick }: { title: string; rows: SettingRow[]; onClick: (field: EditableProfileField) => void }) {
  return <section className="settings-section"><h2>{title}</h2><div className="settings-card">{rows.map((row) => <Setting key={row.label} {...row} onClick={() => row.field && onClick(row.field)}/>)}</div></section>
}

function Setting({ icon: Icon, label, value, action = 'chevron', disabled = false, toggleValue, onToggle, onClick }: SettingRow & { toggleValue?: boolean; onToggle?: () => void; onClick: () => void }) {
  const toggle = () => { haptic.tap(); onToggle?.() }
  return <button className="setting-row" disabled={disabled} onClick={action === 'toggle' ? toggle : onClick}><span className="setting-icon"><Icon size={18}/></span><span className="setting-label">{label}</span>{value && <span className="setting-value">{value}</span>}{action === 'toggle' ? <span className={`switch ${toggleValue ? 'on' : ''}`}><i/></span> : <ChevronRight className="row-chevron" size={17}/>}</button>
}

function ReminderFrequencySheet({ open, interval, onClose, onSave }: { open: boolean; interval: ReminderInterval; onClose: () => void; onSave: (interval: ReminderInterval) => void }) {
  const { t } = useTranslation()
  const selectInterval = (value: ReminderInterval) => {
    haptic.success()
    onSave(value)
    onClose()
  }

  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet reminder-frequency-sheet" role="dialog" aria-modal="true" aria-label={t('reminderFrequency')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/>
      <div className="sheet-heading"><div><p className="eyebrow">{t('reminders')}</p><h2>{t('reminderFrequency')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      <div className="reminder-frequency-options">{reminderFrequencyOptions.map((option) => <button key={option.value} className={option.value === interval ? 'is-selected' : ''} onClick={() => selectInterval(option.value)}><span>{t(option.label)}</span>{option.value === interval && <Check size={18}/>}</button>)}</div>
    </motion.section>
  </>}</AnimatePresence>
}
