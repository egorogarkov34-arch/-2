import { AnimatePresence, motion } from 'framer-motion'
import { BellOff, BellRing, Check, X } from 'lucide-react'
import type { ReminderInterval } from '@/entities/hydration/model/types'
import { haptic } from '@/shared/lib/telegram'

interface QuickRemindersSheetProps {
  open: boolean
  enabled: boolean
  interval: ReminderInterval
  language: 'ru' | 'en'
  onClose: () => void
  onToggle: (enabled: boolean) => void
  onSelectInterval: (interval: ReminderInterval) => void
}

const reminderIntervals: ReminderInterval[] = [30, 60, 120, 180]

export function QuickRemindersSheet({
  open,
  enabled,
  interval,
  language,
  onClose,
  onToggle,
  onSelectInterval,
}: QuickRemindersSheetProps) {
  const copy = language === 'en'
    ? {
        eyebrow: 'DAILY RHYTHM',
        title: 'Reminders',
        enabled: 'Reminders are on',
        disabled: 'Reminders are off',
        enabledHint: 'The bot will remind you to drink water.',
        disabledHint: 'Turn them on to receive messages from the bot.',
        frequency: 'Reminder frequency',
        intervals: { 30: 'Every 30 min', 60: 'Every hour', 120: 'Every 2 hours', 180: 'Every 3 hours' },
        close: 'Close',
      }
    : {
        eyebrow: 'ЕЖЕДНЕВНЫЙ РИТМ',
        title: 'Напоминания',
        enabled: 'Напоминания включены',
        disabled: 'Напоминания выключены',
        enabledHint: 'Бот будет напоминать вам выпить воду.',
        disabledHint: 'Включите их, чтобы получать сообщения от бота.',
        frequency: 'Частота напоминаний',
        intervals: { 30: 'Каждые 30 минут', 60: 'Каждый час', 120: 'Каждые 2 часа', 180: 'Каждые 3 часа' },
        close: 'Закрыть',
      }

  const toggle = () => {
    haptic.success()
    onToggle(!enabled)
  }

  const selectInterval = (value: ReminderInterval) => {
    haptic.success()
    onSelectInterval(value)
  }

  return <AnimatePresence>
    {open && <>
      <motion.button className="sheet-scrim" type="button" aria-label={copy.close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
      <motion.section className="bottom-sheet quick-reminders-sheet" role="dialog" aria-modal="true" aria-label={copy.title} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
        <div className="sheet-handle"/>
        <div className="sheet-heading">
          <div><p className="eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label={copy.close}><X size={20}/></button>
        </div>

        <button type="button" className={`quick-reminders-status${enabled ? ' is-enabled' : ''}`} onClick={toggle}>
          <i>{enabled ? <BellRing size={20}/> : <BellOff size={20}/>}</i>
          <span><strong>{enabled ? copy.enabled : copy.disabled}</strong><small>{enabled ? copy.enabledHint : copy.disabledHint}</small></span>
          <b className="quick-reminders-switch" aria-hidden="true"><i/></b>
        </button>

        <section className={`quick-reminders-options${enabled ? '' : ' is-disabled'}`} aria-disabled={!enabled}>
          <p>{copy.frequency}</p>
          <div>{reminderIntervals.map((value) => <button type="button" key={value} className={value === interval ? 'is-selected' : ''} disabled={!enabled} onClick={() => selectInterval(value)}><span>{copy.intervals[value]}</span>{value === interval && <Check size={18}/>}</button>)}</div>
        </section>
      </motion.section>
    </>}
  </AnimatePresence>
}
