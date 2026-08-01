import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Trash2, X } from 'lucide-react'
import type { IntakeEntry } from '@/entities/hydration/model/types'
import { formatMl } from '@/shared/lib/format'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

interface Props {
  open: boolean
  entries: IntakeEntry[]
  onClose: () => void
  onDelete: (id: string) => void
}

export function HistorySheet({ open, entries, onClose, onDelete }: Props) {
  const { language, t } = useTranslation()
  const locale = language === 'en' ? 'en-US' : 'ru-RU'
  const sortedEntries = [...entries].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const remove = (id: string) => { haptic.success(); onDelete(id) }

  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet history-sheet" role="dialog" aria-modal="true" aria-label={t('entries')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('history')}</p><h2>{t('entries')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      {sortedEntries.length ? <div className="history-list">{sortedEntries.map((entry) => <article key={entry.id} className="history-entry"><span className="drop-dot"><Droplets size={16}/></span><div><strong>{formatMl(entry.amount)} ml</strong><p>{new Date(entry.createdAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p></div><button className="delete-entry" onClick={() => remove(entry.id)} aria-label={`${t('delete')} ${formatMl(entry.amount)} ml`}><Trash2 size={17}/></button></article>)}</div> : <div className="history-empty"><Droplets size={26}/><strong>{t('noEntries')}</strong><p>{t('noEntriesHint')}</p></div>}
    </motion.section>
  </>}</AnimatePresence>
}
