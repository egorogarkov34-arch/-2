import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Plus, X } from 'lucide-react'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

const amounts = [100, 200, 250, 300, 500, 750, 1000]

interface Props { open: boolean; onClose: () => void; onAdd: (amount: number) => void }

export function AddWaterSheet({ open, onClose, onAdd }: Props) {
  const { t } = useTranslation()
  const [success, setSuccess] = useState<number | null>(null)

  useEffect(() => { if (!open) setSuccess(null) }, [open])
  const add = (amount: number) => {
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000) { haptic.error(); return }
    haptic.tap()
    onAdd(amount)
    setSuccess(amount)
    window.setTimeout(() => { haptic.success(); onClose() }, 550)
  }
  return <AnimatePresence>
    {open && <>
      <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={t('addWater')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
        <div className="sheet-handle" /><div className="sheet-heading"><div><p className="eyebrow">{t('quickEntry')}</p><h2>{t('addWater')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
        <div className="amount-grid">{amounts.map((amount) => <motion.button key={amount} className={`amount-option ${success === amount ? 'is-success' : ''}`} whileTap={{ scale: .96 }} onClick={() => add(amount)}>{success === amount ? <Check size={19}/> : <Plus size={16}/>}<span>{amount} ml</span></motion.button>)}</div>
      </motion.section>
    </>}
  </AnimatePresence>
}
