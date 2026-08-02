import { memo, useId } from 'react'
import { motion } from 'framer-motion'
import { clamp } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { percentage: number }

/** Lightweight SVG silhouette; animated wave is clipped to a human-shaped path. */
export const BodyWater = memo(function BodyWater({ percentage }: Props) {
  const { language } = useTranslation()
  const uid = useId().replaceAll(':', '')
  const clipId = `body-clip-${uid}`
  const waveId = `water-wave-${uid}`
  const fillPercentage = clamp(percentage, 0, 100)
  // The water surface starts below the feet at 0% and reaches the top at 100%.
  // This keeps an empty silhouette completely empty instead of showing the lower body.
  const level = 390 - 3.9 * fillPercentage
  const hasWater = fillPercentage > 0.01
  const head = { cx: 140, cy: 58, r: 32 }
  const bodyPath = 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82Z'
  const bodyOutline = 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82'
  const headOutline = 'M119 84C112 78 108 69 108 58C108 40 122 26 140 26C158 26 172 40 172 58C172 69 168 78 161 84'
  const waveSurface = 'M-70 6 C-40 -6 -14 19 18 7 S82 -7 116 7 S182 20 216 6 S281 -7 322 7 S366 19 400 5'
  const waterShape = `${waveSurface} V430 H-70Z`
  return (
    <div className="body-water-wrap" role="img" aria-label={language === 'en' ? `Body silhouette filled to ${Math.round(percentage)} percent` : `Силуэт заполнен водой на ${Math.round(percentage)} процентов`}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={bodyPath} /><circle {...head} /></clipPath>
          <linearGradient id={waveId} x1="140" y1="55" x2="140" y2="370" gradientUnits="userSpaceOnUse">
            <stop stopColor="#75CEFF" /><stop offset=".45" stopColor="#328DFF" /><stop offset="1" stopColor="#1462D8" />
          </linearGradient>
        </defs>
        <path d={bodyPath} className="silhouette-base" /><circle {...head} className="head-fill" />
        <g clipPath={`url(#${clipId})`}>
          {hasWater && <motion.g className="water-level" style={{ willChange: 'transform' }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 32, damping: 18, mass: 0.9 }}>
            <motion.g className="water-wave" style={{ willChange: 'transform' }} animate={{ x: [-13, 13, -13] }} transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}>
              <path d={waterShape} fill={`url(#${waveId})`} />
              <path d={waveSurface} stroke="rgba(225,248,255,.92)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </motion.g>
          </motion.g>}
        </g>
        <path d={bodyOutline} className="silhouette-stroke" /><path d={headOutline} className="silhouette-stroke" />
        <g className="body-ticks"><line x1="15" y1="74" x2="49" y2="74" /><line x1="15" y1="166" x2="49" y2="166" /><line x1="15" y1="258" x2="49" y2="258" /><line x1="15" y1="350" x2="49" y2="350" /></g>
      </svg>
      <div className="body-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
    </div>
  )
})
