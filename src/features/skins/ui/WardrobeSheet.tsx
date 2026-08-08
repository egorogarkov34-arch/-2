import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { BodyWater } from '@/entities/hydration/ui/BodyWater'
import type { BodySkin } from '@/entities/hydration/model/types'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation, type TranslationKey } from '@/shared/lib/i18n'

interface Props {
  open: boolean
  skin: BodySkin
  onClose: () => void
  onSelect: (skin: BodySkin) => void
}

const options: Array<{ id: BodySkin; label: TranslationKey }> = [
  { id: 'male-classic', label: 'maleClassic' },
  { id: 'female-classic', label: 'femaleClassic' },
  { id: 'male-athlete', label: 'maleAthlete' },
]

export function WardrobeSheet({ open, skin, onClose, onSelect }: Props) {
  const { t } = useTranslation()
  const choose = (nextSkin: BodySkin) => {
    haptic.select()
    onSelect(nextSkin)
  }

  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet wardrobe-sheet" role="dialog" aria-modal="true" aria-label={t('wardrobe')} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">{t('wardrobe')}</p><h2>{t('chooseSkin')}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      <div className="wardrobe-options">{options.map((option) => {
        const selected = option.id === skin
        return <motion.button type="button" key={option.id} className={`wardrobe-option${selected ? ' is-selected' : ''}`} onClick={() => choose(option.id)} whileTap={{ scale: .97 }} aria-pressed={selected}>
          <span className="wardrobe-preview"><BodyWater percentage={36} skin={option.id} compact/></span><span>{t(option.label)}</span>{selected && <i><Check size={14}/></i>}
        </motion.button>
      })}</div>
    </motion.section>
  </>}</AnimatePresence>
}
