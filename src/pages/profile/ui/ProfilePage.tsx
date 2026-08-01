import { useEffect, useState } from 'react'
import { BellRing, CalendarDays, ChevronRight, CircleHelp, Droplets, Globe2, Info, MoonStar, Ruler, Scale, ShieldCheck, UserRound } from 'lucide-react'
import { useHydrationStore } from '@/entities/hydration/model/store'
import { haptic } from '@/shared/lib/telegram'
import { useGoalRecommendation } from '@/entities/hydration/model/useGoalRecommendation'
import { EditProfileSheet } from '@/features/profile/ui/EditProfileSheet'
import { GoalSheet } from '@/features/goal/ui/GoalSheet'
import { useTranslation } from '@/shared/lib/i18n'
import { calculateWaterGoal } from '@/entities/hydration/model/calculateGoal'

type RowId = 'reminders' | 'frequency' | 'theme' | 'language'
interface SettingRow { id?: RowId; icon: typeof UserRound; label: string; value?: string; action?: 'toggle' | 'chevron' }

export default function ProfilePage() {
  const { profile, updateProfile, goal, goalMode, setAutomaticGoal, setGoal } = useHydrationStore()
  const { t } = useTranslation()
  const recommendation = useGoalRecommendation(profile)
  const [profileOpen, setProfileOpen] = useState(false)
  const [goalOpen, setGoalOpen] = useState(false)
  const recommendedGoal = recommendation.data?.value ?? calculateWaterGoal(profile)
  useEffect(() => { setAutomaticGoal(recommendedGoal) }, [recommendedGoal, setAutomaticGoal])
  const activityName = profile.activity === 'moderate' ? t('moderate') : profile.activity === 'high' ? t('high') : t('low')
  const genderName = profile.gender === 'male' ? t('male') : profile.gender === 'female' ? t('female') : t('other')
  const toggleTheme = () => updateProfile({ theme: profile.theme === 'dark' ? 'light' : 'dark' })
  const toggleLanguage = () => updateProfile({ language: profile.language === 'ru' ? 'en' : 'ru' })
  const personal: SettingRow[] = [
    { icon: UserRound, label: t('name'), value: profile.name }, { icon: Droplets, label: t('gender'), value: genderName },
    { icon: CalendarDays, label: t('age'), value: `${profile.age} ${t('years')}` }, { icon: Scale, label: t('weight'), value: `${profile.weight} kg` },
    { icon: Ruler, label: t('height'), value: `${profile.height} cm` }
  ]
  const preferences: SettingRow[] = [
    { id: 'reminders', icon: BellRing, label: t('reminders'), action: 'toggle' }, { id: 'frequency', icon: BellRing, label: t('notificationFrequency'), value: profile.reminderInterval },
    { id: 'theme', icon: MoonStar, label: t('darkTheme'), value: profile.theme === 'dark' ? t('enabled') : t('disabled'), action: 'toggle' },
    { id: 'language', icon: Globe2, label: t('language'), value: profile.language === 'ru' ? t('russian') : 'English' }
  ]
  const preferenceAction = (id: RowId | undefined) => id === 'reminders' ? () => updateProfile({ reminders: !profile.reminders }) : id === 'theme' ? toggleTheme : undefined
  const preferenceClick = (id: RowId | undefined) => id === 'language' ? toggleLanguage : haptic.tap
  return <main className="page profile-page"><header className="page-header"><div><p className="eyebrow">{t('personalSpace')}</p><h1>{t('profile')}</h1></div><div className="avatar">{profile.name.replace('@', '').slice(0, 1).toUpperCase()}</div></header>
    <section className="profile-summary"><div className="profile-orb"><Droplets size={25}/></div><div><strong>{goal / 1000} L {t('perDay')}</strong><p>{goalMode === 'auto' ? t('personalPlanHint') : t('customAmount')}{recommendation.data?.temperatureC ? ` · ${recommendation.data.temperatureC}°C` : ''}</p></div></section>
    <SettingsGroup title={t('personalData')} rows={personal} onClick={() => setProfileOpen(true)}/>
    <section className="settings-section"><h2>{t('goalAndActivity')}</h2><div className="settings-card"><Setting icon={Droplets} label={t('goal')} value={`${goal} ml`} onClick={() => setGoalOpen(true)}/><Setting icon={CircleHelp} label={t('activity')} value={activityName} onClick={() => setProfileOpen(true)}/></div></section>
    <section className="settings-section"><h2>{t('settings')}</h2><div className="settings-card">{preferences.map((row) => <Setting key={row.id} {...row} toggleValue={row.id === 'reminders' ? profile.reminders : profile.theme === 'dark'} onToggle={preferenceAction(row.id)} onClick={preferenceClick(row.id)}/>)}</div></section>
    <section className="settings-section"><div className="settings-card"><Setting icon={ShieldCheck} label={t('privacy')} onClick={haptic.tap}/><Setting icon={CircleHelp} label={t('support')} onClick={haptic.tap}/><Setting icon={Info} label={t('about')} onClick={haptic.tap}/></div></section>
    <p className="app-version">Aquora · {t('version')} 1.0.0</p><GoalSheet open={goalOpen} goal={goal} onClose={() => setGoalOpen(false)} onSave={setGoal}/><EditProfileSheet open={profileOpen} profile={profile} onClose={() => setProfileOpen(false)} onSave={updateProfile}/>
  </main>
}

function SettingsGroup({ title, rows, onClick }: { title: string; rows: SettingRow[]; onClick: () => void }) {
  return <section className="settings-section"><h2>{title}</h2><div className="settings-card">{rows.map((row) => <Setting key={row.label} {...row} onClick={onClick}/>)}</div></section>
}

function Setting({ icon: Icon, label, value, action = 'chevron', toggleValue, onToggle, onClick }: SettingRow & { toggleValue?: boolean; onToggle?: () => void; onClick: () => void }) {
  const toggle = () => { haptic.tap(); onToggle?.() }
  return <button className="setting-row" onClick={action === 'toggle' ? toggle : onClick}><span className="setting-icon"><Icon size={18}/></span><span className="setting-label">{label}</span>{value && <span className="setting-value">{value}</span>}{action === 'toggle' ? <span className={`switch ${toggleValue ? 'on' : ''}`}><i/></span> : <ChevronRight className="row-chevron" size={17}/>}</button>
}
