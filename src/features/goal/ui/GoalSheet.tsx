import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { open: boolean; goal: number; onClose: () => void; onSave: (value: number) => void }
export function GoalSheet({ open, goal, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState(String(goal))
  useEffect(() => setValue(String(goal)), [goal])
  const save = () => { const next = Number(value); if (next >= 500 && next <= 10000) { onSave(next); onClose() } }
  return <AnimatePresence>{open && <><motion.button className="sheet-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-label={t('close')}/><motion.section className="bottom-sheet compact-sheet" role="dialog" aria-modal="true" initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}><div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('personalGoal')}</p><h2>{t('dailyGoal')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div><div className="goal-input"><input value={value} inputMode="numeric" onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}/><span>ml</span></div><p className="field-hint">{t('goalHint')}</p><button className="primary-action" onClick={save} disabled={Number(value) < 500}>{t('saveGoal')}</button></motion.section></>}</AnimatePresence>
}
