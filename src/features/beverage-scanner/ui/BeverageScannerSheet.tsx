import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, Flashlight, FlashlightOff, LoaderCircle, ScanLine, Search, X } from 'lucide-react'
import { haptic, lookupBeverageBarcode } from '@/shared/lib/telegram'
import { useTranslation } from '@/shared/lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (amount: number) => void
}

type ScannerStep = 'start' | 'camera' | 'loading' | 'added' | 'not-found' | 'error'
type TorchCapabilities = { torch?: boolean }

const initialBarcode = ''

export function BeverageScannerSheet({ open, onClose, onAdd }: Props) {
  const { language } = useTranslation()
  const [step, setStep] = useState<ScannerStep>('start')
  const [barcode, setBarcode] = useState(initialBarcode)
  const [amountAdded, setAmountAdded] = useState(0)
  const [cameraError, setCameraError] = useState('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const torchTrackRef = useRef<MediaStreamTrack | null>(null)

  const copy = language === 'ru'
    ? {
        eyebrow: 'Умное добавление', title: 'Сканировать бутылку', camera: 'Открыть камеру', cameraHint: 'Наведите камеру на штрихкод бутылки.', manual: 'Или введите штрихкод вручную', search: 'Найти объём', unsupported: 'Неверный штрихкод. Введите от 8 до 14 цифр.', notFound: 'Объём не найден', notFoundHint: 'Для этой бутылки не указан объём. Добавьте воду вручную на главном экране.', retry: 'Попробовать ещё раз', close: 'Закрыть', cameraPermission: 'Не удалось включить камеру. Разрешите доступ к камере и попробуйте снова.', unavailable: 'Сервис временно недоступен. Попробуйте позднее.', auth: 'Откройте сканер внутри Telegram.', ml: 'мл', added: 'Добавлено', finding: 'Определяем объём бутылки…', torchOn: 'Выключить фонарик', torchOff: 'Включить фонарик',
      }
    : {
        eyebrow: 'Smart add', title: 'Scan a bottle', camera: 'Open camera', cameraHint: 'Point the camera at the barcode on the bottle.', manual: 'Or enter a barcode manually', search: 'Find volume', unsupported: 'Invalid barcode. Enter 8 to 14 digits.', notFound: 'Volume not found', notFoundHint: 'This bottle has no volume listed. Add water manually from the home screen.', retry: 'Try again', close: 'Close', cameraPermission: 'Could not start the camera. Allow camera access and try again.', unavailable: 'Service is temporarily unavailable. Try again later.', auth: 'Open the scanner inside Telegram.', ml: 'ml', added: 'Added', finding: 'Finding the bottle volume…', torchOn: 'Turn flashlight off', torchOff: 'Turn flashlight on',
      }

  const reset = () => {
    setStep('start')
    setBarcode(initialBarcode)
    setAmountAdded(0)
    setCameraError('')
    setTorchSupported(false)
    setTorchOn(false)
  }

  const close = () => { reset(); onClose() }

  const addScannedAmount = (amount: number) => {
    onAdd(amount)
    setAmountAdded(amount)
    setStep('added')
    haptic.success()
    window.setTimeout(close, 680)
  }

  const findProduct = async (rawBarcode: string) => {
    const code = rawBarcode.replace(/\D/g, '')
    if (!/^\d{8,14}$/.test(code)) { setCameraError(copy.unsupported); setStep('error'); haptic.error(); return }
    setBarcode(code)
    setStep('loading')
    const result = await lookupBeverageBarcode(code)
    if (result.ok) {
      addScannedAmount(result.product.volumeMl)
      return
    }
    setCameraError(result.reason === 'not_found' ? copy.notFoundHint : result.reason === 'unauthorized' ? copy.auth : copy.unavailable)
    setStep(result.reason === 'not_found' ? 'not-found' : 'error')
    haptic.error()
  }

  const toggleTorch = async () => {
    const track = torchTrackRef.current
    if (!track || !torchSupported) return
    const nextValue = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: nextValue }] } as unknown as MediaTrackConstraints)
      setTorchOn(nextValue)
      haptic.tap()
    } catch {
      setTorchSupported(false)
      setTorchOn(false)
    }
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
      const stream = video.srcObject instanceof MediaStream ? video.srcObject : null
      stream?.getTracks().forEach((track) => track.stop())
      torchTrackRef.current = null
    }
    const detectTorch = () => {
      const stream = video.srcObject instanceof MediaStream ? video.srcObject : null
      const track = stream?.getVideoTracks()[0]
      if (!track) return
      torchTrackRef.current = track
      const capabilities = (track as unknown as { getCapabilities?: () => TorchCapabilities }).getCapabilities?.()
      setTorchSupported(capabilities?.torch === true)
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
        if (!cancelled) detectTorch()
      } catch {
        if (cancelled) return
        setCameraError(copy.cameraPermission)
        setStep('error')
      }
    }
    void start()
    return () => { cancelled = true; stop(); setTorchSupported(false); setTorchOn(false) }
  }, [copy.cameraPermission, open, step])

  useEffect(() => { if (!open) reset() }, [open])

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
        {step === 'camera' && <div className="beverage-camera-view"><video ref={videoRef} muted playsInline/><div className="beverage-camera-overlay"><ScanLine size={32}/><span>{copy.cameraHint}</span></div>{torchSupported && <button type="button" className={`beverage-camera-torch${torchOn ? ' is-active' : ''}`} onClick={() => void toggleTorch()} aria-label={torchOn ? copy.torchOn : copy.torchOff}>{torchOn ? <FlashlightOff size={20}/> : <Flashlight size={20}/>}</button>}</div>}
        {step === 'loading' && <div className="beverage-scanner-status"><LoaderCircle className="is-refreshing" size={30}/><p>{copy.finding}</p></div>}
        {step === 'added' && <div className="beverage-scanner-status beverage-scanner-added"><Check size={31}/><b>{copy.added} {amountAdded} {copy.ml}</b></div>}
        {(step === 'not-found' || step === 'error') && <div className="beverage-scanner-status beverage-scanner-error"><Search size={28}/><b>{step === 'not-found' ? copy.notFound : language === 'ru' ? 'Не удалось определить объём' : 'Could not find the volume'}</b><p>{cameraError}</p><div><button type="button" className="secondary-action" onClick={() => setStep('start')}>{copy.retry}</button></div></div>}
      </motion.section>
    </>}
  </AnimatePresence>
}
