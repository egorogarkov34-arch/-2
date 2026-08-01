import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { open: boolean; value: string; onClose: () => void; onSave: (value: string) => void }

export function ReminderFrequencySheet({ open, value, onClose, onSave }: Props) {
  const { language, t } = useTranslation()
  const options = useMemo(() => language === 'en' ? ['Every 30 minutes', 'Every hour', 'Every 2 hours', 'Every 3 hours'] : ['Каждые 30 минут', 'Каждый час', 'Каждые 2 часа', 'Каждые 3 часа'], [language])
  const [selected, setSelected] = useState(value)
  useEffect(() => setSelected(value), [value])
  const save = (next: string) => { haptic.success(); onSave(next); onClose() }
  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet reminder-sheet" role="dialog" aria-modal="true" aria-label={t('notificationFrequency')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('reminders')}</p><h2>{t('notificationFrequency')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      <div className="frequency-options">{options.map((option) => <button key={option} className={selected === option ? 'selected' : ''} onClick={() => { setSelected(option); save(option) }}><span>{option}</span>{selected === option && <Check size={18}/>}</button>)}</div>
    </motion.section>
  </>}</AnimatePresence>
}
