import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, LoaderCircle, ScanLine, Search, X } from 'lucide-react'
import type { BeverageEntryDetails } from '@/entities/hydration/model/types'
import { haptic, lookupBeverageBarcode, type BarcodeBeverageProduct } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (amount: number, beverage: BeverageEntryDetails) => void
}

type ScannerStep = 'start' | 'camera' | 'loading' | 'review' | 'not-found' | 'error'

const initialBarcode = ''

export function BeverageScannerSheet({ open, onClose, onAdd }: Props) {
  const { language } = useTranslation()
  const [step, setStep] = useState<ScannerStep>('start')
  const [barcode, setBarcode] = useState(initialBarcode)
  const [product, setProduct] = useState<BarcodeBeverageProduct | null>(null)
  const [serving, setServing] = useState('250')
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  const copy = language === 'ru'
    ? {
        eyebrow: 'Умное добавление', title: 'Сканировать напиток', camera: 'Открыть камеру', cameraHint: 'Наведите камеру на штрихкод бутылки.', manual: 'Или введите штрихкод вручную', search: 'Найти напиток', unsupported: 'Камера или распознавание штрихкода недоступны в этом устройстве. Введите код вручную.', notFound: 'Напиток не найден', notFoundHint: 'Такого штрихкода нет в открытом каталоге. Попробуйте другой код или добавьте объём вручную.', retry: 'Попробовать ещё раз', review: 'Проверьте напиток', amount: 'Сколько выпито', add: 'Добавить в цель', nutrition: 'Состав на выбранный объём', kcal: 'ккал', sugar: 'сахар', salt: 'соль', sodium: 'натрий', caffeine: 'кофеин', facts: 'Данные берутся с этикетки продукта. Проверьте объём перед добавлением.', close: 'Закрыть', manualAdd: 'Добавить без состава', cameraPermission: 'Не удалось включить камеру. Разрешите доступ к камере и попробуйте снова.', unavailable: 'Сервис временно недоступен. Попробуйте позднее или добавьте объём вручную.', auth: 'Откройте сканер внутри Telegram, чтобы найти продукт.', ml: 'мл', brandFallback: 'Напиток',
      }
    : {
        eyebrow: 'Smart add', title: 'Scan a drink', camera: 'Open camera', cameraHint: 'Point the camera at the barcode on a bottle.', manual: 'Or enter a barcode manually', search: 'Find drink', unsupported: 'Camera or barcode detection is unavailable on this device. Enter the code manually.', notFound: 'Drink not found', notFoundHint: 'This barcode is not in the open catalogue. Try another code or add the amount manually.', retry: 'Try again', review: 'Review your drink', amount: 'How much did you drink?', add: 'Add to goal', nutrition: 'Nutrition for selected amount', kcal: 'kcal', sugar: 'sugar', salt: 'salt', sodium: 'sodium', caffeine: 'caffeine', facts: 'Values come from the product label. Check the amount before adding.', close: 'Close', manualAdd: 'Add without nutrition', cameraPermission: 'Could not start the camera. Allow camera access and try again.', unavailable: 'Service is temporarily unavailable. Try again later or add the amount manually.', auth: 'Open the scanner inside Telegram to find a product.', ml: 'ml', brandFallback: 'Drink',
      }

  const reset = () => {
    setStep('start')
    setBarcode(initialBarcode)
    setProduct(null)
    setServing('250')
    setCameraError('')
  }

  const close = () => { reset(); onClose() }

  const findProduct = async (rawBarcode: string) => {
    const code = rawBarcode.replace(/\D/g, '')
    if (!/^\d{8,14}$/.test(code)) { setCameraError(copy.unsupported); setStep('error'); haptic.error(); return }
    setBarcode(code)
    setStep('loading')
    const result = await lookupBeverageBarcode(code)
    if (result.ok) {
      setProduct(result.product)
      setServing(String(result.product.volumeMl ?? 250))
      setStep('review')
      haptic.success()
      return
    }
    setCameraError(result.reason === 'not_found' ? copy.notFoundHint : result.reason === 'unauthorized' ? copy.auth : copy.unavailable)
    setStep(result.reason === 'not_found' ? 'not-found' : 'error')
    haptic.error()
  }

  useEffect(() => {
    if (!open || step !== 'camera') return
    const video = videoRef.current
    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setCameraError(copy.cameraPermission)
      setStep('error')
      return
    }
    let controls: { stop: () => void } | undefined
    let cancelled = false
    const stop = () => {
      controls?.stop()
    }
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video,
          (result) => {
            const code = result?.getText().replace(/\D/g, '')
            if (!code || cancelled) return
            cancelled = true
            stop()
            void findProduct(code)
          },
        )
      } catch {
        if (cancelled) return
        setCameraError(copy.cameraPermission)
        setStep('error')
      }
    }
    void start()
    return () => { cancelled = true; stop() }
  }, [copy.cameraPermission, copy.unsupported, open, step])

  useEffect(() => { if (!open) reset() }, [open])

  const addProduct = () => {
    if (!product) return
    const amount = Math.max(1, Math.min(5000, Math.round(Number(serving))))
    if (!Number.isFinite(amount)) { haptic.error(); return }
    const multiplier = amount / 100
    const value = (item: number | undefined) => item === undefined ? undefined : Math.round(item * multiplier * 100) / 100
    onAdd(amount, {
      productName: product.name,
      ...(product.brand ? { brand: product.brand } : {}),
      barcode: product.barcode,
      ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
      nutrition: {
        ...(value(product.nutritionPer100ml.caloriesKcal) !== undefined ? { caloriesKcal: value(product.nutritionPer100ml.caloriesKcal) } : {}),
        ...(value(product.nutritionPer100ml.sugarsG) !== undefined ? { sugarsG: value(product.nutritionPer100ml.sugarsG) } : {}),
        ...(value(product.nutritionPer100ml.saltG) !== undefined ? { saltG: value(product.nutritionPer100ml.saltG) } : {}),
        ...(value(product.nutritionPer100ml.sodiumMg) !== undefined ? { sodiumMg: value(product.nutritionPer100ml.sodiumMg) } : {}),
        ...(value(product.nutritionPer100ml.caffeineMg) !== undefined ? { caffeineMg: value(product.nutritionPer100ml.caffeineMg) } : {}),
      },
    })
    haptic.success()
    window.setTimeout(close, 280)
  }

  const manualAmount = () => {
    const amount = Math.max(1, Math.min(5000, Math.round(Number(serving))))
    if (!Number.isFinite(amount)) { haptic.error(); return }
    onAdd(amount, { productName: copy.brandFallback, nutrition: {} })
    haptic.success()
    window.setTimeout(close, 280)
  }

  const nutrient = (value: number | undefined, label: string, suffix: string) => <div><span>{label}</span><b>{value === undefined ? '—' : `${value.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 1 })} ${suffix}`}</b></div>

  return <AnimatePresence>
    {open && <>
      <motion.button className="sheet-scrim" aria-label={copy.close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}/>
      <motion.section className="bottom-sheet beverage-scanner-sheet" role="dialog" aria-modal="true" aria-label={copy.title} initial={{ y: '105%' }} animate={{ y: 0 }} exit={{ y: '105%' }} transition={{ type: 'spring', stiffness: 320, damping: 31 }}>
        <div className="sheet-handle"/>
        <div className="sheet-heading"><div><p className="eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2></div><button className="icon-button" type="button" onClick={close} aria-label={copy.close}><X size={20}/></button></div>
        {step === 'start' && <div className="beverage-scanner-start">
          <button type="button" className="beverage-camera-button" onClick={() => { haptic.tap(); setStep('camera') }}><span><Camera size={23}/></span><div><b>{copy.camera}</b><small>{copy.cameraHint}</small></div><ScanLine size={20}/></button>
          <form className="beverage-manual-form" onSubmit={(event) => { event.preventDefault(); void findProduct(barcode) }}><label>{copy.manual}<input value={barcode} onChange={(event) => setBarcode(event.target.value.replace(/\D/g, '').slice(0, 14))} inputMode="numeric" placeholder="4820000000000"/></label><button type="submit" disabled={!/^\d{8,14}$/.test(barcode)}><Search size={17}/>{copy.search}</button></form>
        </div>}
        {step === 'camera' && <div className="beverage-camera-view"><video ref={videoRef} muted playsInline/><div><ScanLine size={32}/><span>{copy.cameraHint}</span></div></div>}
        {step === 'loading' && <div className="beverage-scanner-status"><LoaderCircle className="is-refreshing" size={30}/><p>{language === 'ru' ? 'Ищем напиток…' : 'Looking up drink…'}</p></div>}
        {(step === 'not-found' || step === 'error') && <div className="beverage-scanner-status beverage-scanner-error"><Search size={28}/><b>{step === 'not-found' ? copy.notFound : language === 'ru' ? 'Не удалось найти напиток' : 'Could not find drink'}</b><p>{cameraError}</p><div><button type="button" className="secondary-action" onClick={() => setStep('start')}>{copy.retry}</button><button type="button" className="primary-action" onClick={manualAmount}>{copy.manualAdd}</button></div></div>}
        {step === 'review' && product && <div className="beverage-review">
          <div className="beverage-product-card">{product.imageUrl ? <img src={product.imageUrl} alt=""/> : <span><ScanLine size={24}/></span>}<div><p>{product.brand || copy.brandFallback}</p><b>{product.name}</b><small>{product.volumeMl ? `${product.volumeMl} ${copy.ml}` : product.barcode}</small></div><Check size={18}/></div>
          <label className="beverage-serving-field"><span>{copy.amount}</span><div><input value={serving} onChange={(event) => setServing(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric"/><b>{copy.ml}</b></div></label>
          <section className="beverage-nutrition"><p>{copy.nutrition}</p><div>{nutrient(product.nutritionPer100ml.caloriesKcal === undefined ? undefined : product.nutritionPer100ml.caloriesKcal * (Number(serving) || 0) / 100, copy.kcal, copy.kcal)}{nutrient(product.nutritionPer100ml.sugarsG === undefined ? undefined : product.nutritionPer100ml.sugarsG * (Number(serving) || 0) / 100, copy.sugar, 'g')}{nutrient(product.nutritionPer100ml.saltG === undefined ? undefined : product.nutritionPer100ml.saltG * (Number(serving) || 0) / 100, copy.salt, 'g')}{nutrient(product.nutritionPer100ml.caffeineMg === undefined ? undefined : product.nutritionPer100ml.caffeineMg * (Number(serving) || 0) / 100, copy.caffeine, 'mg')}</div></section>
          <p className="beverage-facts">{copy.facts}</p><button type="button" className="primary-action beverage-confirm" onClick={addProduct} disabled={!Number(serving)}>{copy.add}</button>
        </div>}
      </motion.section>
    </>}
  </AnimatePresence>
}
