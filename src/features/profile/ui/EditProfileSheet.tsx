import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'
import type { Profile } from '@/entities/hydration/model/types'
import { haptic } from '@/shared/lib/telegram'

type ProfileForm = Pick<Profile, 'name' | 'age' | 'gender' | 'height' | 'weight' | 'activity'>

interface Props { open: boolean; profile: Profile; onClose: () => void; onSave: (values: ProfileForm) => void }

export function EditProfileSheet({ open, profile, onClose, onSave }: Props) {
  const { register, handleSubmit, reset, formState: { isValid } } = useForm<ProfileForm>({ mode: 'onChange', defaultValues: profile })
  useEffect(() => reset(profile), [profile, reset])
  const submit = (values: ProfileForm) => { haptic.success(); onSave(values); onClose() }
  return <AnimatePresence>{open && <><motion.button className="sheet-scrim" aria-label="Закрыть" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}/><motion.section className="bottom-sheet max-h-[88dvh] overflow-auto" initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}><div className="sheet-handle"/><div className="sheet-heading"><div><p className="eyebrow">Личные данные</p><h2>Редактировать профиль</h2></div><button className="icon-button" onClick={onClose}><X size={20}/></button></div><form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3"><label className="col-span-2 grid gap-1.5 text-xs text-[#a9b0b8]">Имя<input className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" {...register('name', { required: true, minLength: 2 })}/></label><label className="grid gap-1.5 text-xs text-[#a9b0b8]">Возраст<input className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" inputMode="numeric" {...register('age', { valueAsNumber: true, min: 12, max: 120 })}/></label><label className="grid gap-1.5 text-xs text-[#a9b0b8]">Пол<select className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" {...register('gender')}><option value="male">Мужской</option><option value="female">Женский</option><option value="other">Другой</option></select></label><label className="grid gap-1.5 text-xs text-[#a9b0b8]">Рост, см<input className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" inputMode="numeric" {...register('height', { valueAsNumber: true, min: 100, max: 250 })}/></label><label className="grid gap-1.5 text-xs text-[#a9b0b8]">Вес, кг<input className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" inputMode="decimal" {...register('weight', { valueAsNumber: true, min: 25, max: 350 })}/></label><label className="col-span-2 grid gap-1.5 text-xs text-[#a9b0b8]">Уровень активности<select className="h-12 rounded-xl border border-white/10 bg-[#0e1012] px-3 text-white" {...register('activity')}><option value="low">Низкий</option><option value="moderate">Средний</option><option value="high">Высокий</option></select></label><button className="primary-action col-span-2 mt-1" type="submit" disabled={!isValid}>Сохранить изменения</button></form></motion.section></>}</AnimatePresence>
}
