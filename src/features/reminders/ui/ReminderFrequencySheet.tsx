import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

type Interval = '30m' | '1h' | '2h' | '3h'
interface Props { open: boolean; value: Interval; onClose: () => void; onSave: (value: Interval) => void }

export function ReminderFrequencySheet({ open, value, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const options = useMemo(() => [
    { value: '30m' as const, label: t('every30Minutes') },
    { value: '1h' as const, label: t('everyHour') },
    { value: '2h' as const, label: t('every2Hours') },
    { value: '3h' as const, label: t('every3Hours') }
  ], [t])
  const [selected, setSelected] = useState<Interval>(value)
  useEffect(() => setSelected(value), [value])
  const save = (next: Interval) => { haptic.success(); onSave(next); onClose() }
  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet reminder-sheet" role="dialog" aria-modal="true" aria-label={t('notificationFrequency')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('reminders')}</p><h2>{t('notificationFrequency')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      <div className="frequency-options">{options.map((option) => <button key={option.value} className={selected === option.value ? 'selected' : ''} onClick={() => { setSelected(option.value); save(option.value) }}><span>{option.label}</span>{selected === option.value && <Check size={18}/>}</button>)}</div>
    </motion.section>
  </>}</AnimatePresence>
}
