import { memo, useId } from 'react'
import { motion } from 'framer-motion'
import { clamp } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { percentage: number }

/** A lightweight, volumetric SVG body. The water remains clipped to the same silhouette. */
export const BodyWater = memo(function BodyWater({ percentage }: Props) {
  const { language } = useTranslation()
  const uid = useId().replaceAll(':', '')
  const clipId = `body-clip-${uid}`
  const baseId = `body-base-${uid}`
  const headId = `body-head-${uid}`
  const volumeId = `body-volume-${uid}`
  const waterId = `water-${uid}`
  const waterLightId = `water-light-${uid}`
  const rimId = `body-rim-${uid}`
  const fillPercentage = clamp(percentage, 0, 100)
  const level = 390 - 3.9 * fillPercentage
  const hasWater = fillPercentage > 0.01

  const bodyPath = 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82Z'
  const bodyOutline = 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82'
  const headOutline = 'M119 84C112 78 108 69 108 58C108 40 122 26 140 26C158 26 172 40 172 58C172 69 168 78 161 84'
  const headPath = `${headOutline}C155 89 125 89 119 84Z`
  const waveSurface = 'M-70 6 C-40 -6 -14 19 18 7 S82 -7 116 7 S182 20 216 6 S281 -7 322 7 S366 19 400 5'
  const deepWave = 'M-70 18 C-36 8 -7 30 26 18 S88 5 122 18 S188 33 223 17 S284 6 323 19 S370 31 405 16'
  const waterShape = `${waveSurface} V430 H-70Z`

  return (
    <div className="body-water-wrap body-water-3d" role="img" aria-label={language === 'en' ? `Body filled to ${Math.round(percentage)} percent` : `РЎРёР»СѓСЌС‚ Р·Р°РїРѕР»РЅРµРЅ РІРѕРґРѕР№ РЅР° ${Math.round(percentage)} РїСЂРѕС†РµРЅС‚РѕРІ`}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={bodyPath} /><path d={headPath} /></clipPath>
          <linearGradient id={baseId} x1="52" y1="164" x2="236" y2="230" gradientUnits="userSpaceOnUse">
            <stop stopColor="#314656" /><stop offset=".22" stopColor="#202e3a" /><stop offset=".58" stopColor="#121b24" /><stop offset="1" stopColor="#080d13" />
          </linearGradient>
          <radialGradient id={headId} cx="0" cy="0" r="1" gradientTransform="translate(127 43) rotate(54) scale(55 52)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#435f72" /><stop offset=".42" stopColor="#263846" /><stop offset="1" stopColor="#0b1118" />
          </radialGradient>
          <linearGradient id={volumeId} x1="82" y1="160" x2="207" y2="248" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b9e7ff" stopOpacity=".18" /><stop offset=".35" stopColor="#77c8ff" stopOpacity=".035" /><stop offset=".68" stopColor="#02070d" stopOpacity=".14" /><stop offset="1" stopColor="#000" stopOpacity=".34" />
          </linearGradient>
          <linearGradient id={waterId} x1="64" y1="132" x2="222" y2="342" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8ae0ff" /><stop offset=".22" stopColor="#5bbdff" /><stop offset=".6" stopColor="#287df4" /><stop offset="1" stopColor="#124fbe" />
          </linearGradient>
          <linearGradient id={waterLightId} x1="70" y1="182" x2="222" y2="202" gradientUnits="userSpaceOnUse">
            <stop stopColor="#effcff" stopOpacity=".42" /><stop offset=".36" stopColor="#a9e7ff" stopOpacity=".11" /><stop offset="1" stopColor="#082b88" stopOpacity=".34" />
          </linearGradient>
          <linearGradient id={rimId} x1="52" y1="126" x2="237" y2="258" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c7efff" stopOpacity=".88" /><stop offset=".28" stopColor="#70c2ff" stopOpacity=".62" /><stop offset=".72" stopColor="#3985cf" stopOpacity=".58" /><stop offset="1" stopColor="#162f4e" stopOpacity=".78" />
          </linearGradient>
        </defs>

        <path d={bodyPath} fill={`url(#${baseId})`} />
        <path d={headPath} fill={`url(#${headId})`} />
        <g clipPath={`url(#${clipId})`}>
          <ellipse className="body-volume" cx="141" cy="232" rx="92" ry="170" fill={`url(#${volumeId})`} />
          <ellipse className="body-gloss" cx="120" cy="61" rx="15" ry="18" fill="#d9f4ff" opacity=".16" />
          <path className="body-side-light" d="M100 105C82 116 72 131 68 150L57 187C55 196 59 202 65 203C73 205 78 197 80 189L96 148L104 223C106 248 101 273 100 317C100 340 104 354 113 357C118 359 122 355 123 347L128 250C129 199 122 132 100 105Z" />
          {hasWater && <motion.g className="water-level" style={{ willChange: 'transform' }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 32, damping: 18, mass: 0.9 }}>
            <motion.g className="water-wave" style={{ willChange: 'transform' }} animate={{ x: [-13, 13, -13] }} transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}>
              <path d={waterShape} fill={`url(#${waterId})`} />
              <path d={waterShape} fill={`url(#${waterLightId})`} />
              <path d={waveSurface} className="water-surface" />
              <path d={deepWave} className="water-depth-wave" />
            </motion.g>
          </motion.g>}
        </g>
        <path d={bodyOutline} className="silhouette-stroke" stroke={`url(#${rimId})`} />
        <path d={headOutline} className="silhouette-stroke" stroke={`url(#${rimId})`} />
        <g className="body-ticks"><line x1="15" y1="74" x2="49" y2="74" /><line x1="15" y1="166" x2="49" y2="166" /><line x1="15" y1="258" x2="49" y2="258" /><line x1="15" y1="350" x2="49" y2="350" /></g>
      </svg>
      <div className="body-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
    </div>
  )
})

