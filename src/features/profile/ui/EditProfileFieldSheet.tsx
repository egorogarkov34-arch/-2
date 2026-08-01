import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Profile } from '@/entities/hydration/model/types'
import { haptic } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

export type EditableProfileField = 'name' | 'gender' | 'age' | 'weight' | 'height' | 'activity'

interface Props {
  field: EditableProfileField | null
  open: boolean
  profile: Profile
  onClose: () => void
  onSave: (profile: Partial<Profile>) => void
}

const numberLimits: Partial<Record<EditableProfileField, readonly [number, number]>> = {
  age: [12, 120],
  weight: [25, 350],
  height: [100, 250]
}

export function EditProfileFieldSheet({ field, open, profile, onClose, onSave }: Props) {
  const { t } = useTranslation()
  const initialValue = useMemo(() => field ? String(profile[field]) : '', [field, profile])
  const [value, setValue] = useState(initialValue)

  useEffect(() => { if (open) setValue(initialValue) }, [initialValue, open])

  if (!field) return null

  const limits = numberLimits[field]
  const numericValue = Number(value)
  const valid = field === 'name'
    ? value.trim().length >= 2
    : limits
      ? Number.isFinite(numericValue) && numericValue >= limits[0] && numericValue <= limits[1]
      : Boolean(value)
  const fieldLabel = field === 'activity' ? t('activityLevel') : t(field)
  const unit = field === 'weight' ? 'kg' : field === 'height' ? 'cm' : undefined

  const submit = () => {
    if (!valid) { haptic.error(); return }
    const nextValue = limits ? numericValue : field === 'name' ? value.trim() : value
    haptic.success()
    onSave({ [field]: nextValue } as Partial<Profile>)
    onClose()
  }

  return <AnimatePresence>{open && <>
    <motion.button className="sheet-scrim" aria-label={t('close')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/>
    <motion.section className="bottom-sheet compact-sheet profile-field-sheet" role="dialog" aria-modal="true" aria-label={fieldLabel} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
      <div className="sheet-handle"/>
      <div className="sheet-heading"><div><p className="eyebrow">{t('personalData')}</p><h2>{fieldLabel}</h2></div><button className="icon-button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></div>
      <form className="single-field-form" onSubmit={(event) => { event.preventDefault(); submit() }}>
        <label className="form-field"><span>{unit ? `${fieldLabel}, ${unit}` : fieldLabel}</span>
          {field === 'gender' ? <select value={value} onChange={(event) => setValue(event.target.value)}><option value="male">{t('male')}</option><option value="female">{t('female')}</option><option value="other">{t('other')}</option></select>
            : field === 'activity' ? <select value={value} onChange={(event) => setValue(event.target.value)}><option value="low">{t('low')}</option><option value="moderate">{t('moderate')}</option><option value="high">{t('high')}</option></select>
              : <input value={value} onChange={(event) => setValue(field === 'name' ? event.target.value : event.target.value.replace(/[^0-9.]/g, ''))} inputMode={field === 'name' ? 'text' : 'decimal'} autoFocus/>}
          {limits && <small>{valid ? '' : `${limits[0]}–${limits[1]}${unit ? ` ${unit}` : ''}`}</small>}
        </label>
        <button className="primary-action" type="submit" disabled={!valid}>{t('saveChanges')}</button>
      </form>
    </motion.section>
  </>}</AnimatePresence>
}
