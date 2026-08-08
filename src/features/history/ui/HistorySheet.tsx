import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Trash2, X } from 'lucide-react'
import type { IntakeEntry } from '@/entities/hydration/model/types'
import { formatMl, todayKey } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

interface Props {
  open: boolean
  entries: IntakeEntry[]
  onClose: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function HistorySheet({ open, entries, onClose, onDelete, onClearAll }: Props) {
  const { language, t } = useTranslation()
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false)
  const [clearPending, setClearPending] = useState(false)
  const [currentDay, setCurrentDay] = useState(() => todayKey())
  const locale = language === 'en' ? 'en-US' : 'ru-RU'
  const activeDay = todayKey()
  const sortedEntries = entries
    .filter((entry) => todayKey(new Date(entry.createdAt)) === activeDay)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const remove = (id: string) => { haptic.success(); onDelete(id) }
  const close = () => { setClearConfirmationOpen(false); setClearPending(false); onClose() }
  const clearAll = () => { haptic.success(); setClearPending(true); setClearConfirmationOpen(false) }
  const finishConfirmationExit = () => {
    if (!clearPending) return
    onClearAll()
    setClearPending(false)
  }

  useEffect(() => {
    if (!open) {
      setClearConfirmationOpen(false)
      setClearPending(false)
      return undefined
    }

    setCurrentDay(todayKey())
    const nextDay = new Date()
    nextDay.setHours(24, 0, 1, 0)
    const timer = window.setTimeout(() => setCurrentDay(todayKey()), nextDay.getTime() - Date.now())
    return () => window.clearTimeout(timer)
  }, [open, currentDay])

  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}/>
    <motion.section className="bottom-sheet history-sheet" role="dialog" aria-modal="true" aria-label={t('entries')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('history')}</p><h2>{t('entries')} ({sortedEntries.length})</h2></div><div className="history-heading-actions">{sortedEntries.length > 0 && !clearConfirmationOpen && !clearPending && <button className="history-clear" onClick={() => { haptic.tap(); setClearConfirmationOpen(true) }}>{t('deleteAll')}</button>}<button className="icon-button" onClick={close} aria-label={t('close')}><X size={20}/></button></div></div>
      <AnimatePresence initial={false} mode="wait" onExitComplete={finishConfirmationExit}>
        {clearConfirmationOpen ? <motion.div key="confirm" className="history-confirm" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.18, ease: 'easeOut' }}><strong>{t('confirmDeleteAll')}</strong><p>{t('confirmDeleteAllHint')}</p><div><button onClick={() => setClearConfirmationOpen(false)}>{t('no')}</button><button className="destructive" onClick={clearAll}>{t('yes')}</button></div></motion.div> : clearPending ? null : sortedEntries.length ? <motion.div key="entries" className="history-list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>{sortedEntries.map((entry) => <article key={entry.id} className="history-entry"><span className="drop-dot"><Droplets size={16}/></span><div><strong>{formatMl(entry.amount, language)} {t('millilitres')}</strong><p>{new Date(entry.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><button className="delete-entry" onClick={() => remove(entry.id)} aria-label={`${t('delete')} ${formatMl(entry.amount, language)} ${t('millilitres')}`}><Trash2 size={17}/></button></article>)}</motion.div> : <motion.div key="empty" className="history-empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}><Droplets size={26}/><strong>{t('noEntries')}</strong><p>{t('noEntriesHint')}</p></motion.div>}
      </AnimatePresence>
    </motion.section>
  </>}</AnimatePresence>
}
