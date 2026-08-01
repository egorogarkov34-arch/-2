import { useId } from 'react'
import { motion } from 'framer-motion'
import { clamp } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'

interface Props { percentage: number }

/** Lightweight SVG silhouette; animated wave is clipped to a human-shaped path. */
export function BodyWater({ percentage }: Props) {
  const { language } = useTranslation()
  const uid = useId().replaceAll(':', '')
  const clipId = `body-clip-${uid}`
  const waveId = `water-wave-${uid}`
  const level = 205 - 1.32 * clamp(percentage, 0, 100)
  const head = { cx: 140, cy: 58, r: 32 }
  const bodyPath = 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82Z'
  return (
    <div className="body-water-wrap" role="img" aria-label={language === 'en' ? `Body silhouette filled to ${Math.round(percentage)} percent` : `Силуэт заполнен водой на ${Math.round(percentage)} процентов`}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={bodyPath} /><circle {...head} /></clipPath>
          <linearGradient id={waveId} x1="140" y1="55" x2="140" y2="370" gradientUnits="userSpaceOnUse">
            <stop stopColor="#75CEFF" /><stop offset=".45" stopColor="#328DFF" /><stop offset="1" stopColor="#1462D8" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-35%" y="-20%" width="170%" height="150%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <path d={bodyPath} className="silhouette-base" /><circle {...head} className="silhouette-base" />
        <g clipPath={`url(#${clipId})`}>
          <motion.g animate={{ y: level }} transition={{ type: 'spring', stiffness: 32, damping: 18, mass: 0.9 }}>
            <path d="M-50 6 C -15 -9 15 20 50 6 S 115 -9 150 6 S 215 20 250 6 S 315 -9 340 6 V420 H-50Z" fill={`url(#${waveId})`} filter={`url(#glow-${uid})`} opacity=".65" />
            <motion.path
              d="M-50 5 C -15 -10 15 20 50 5 S 115 -10 150 5 S 215 20 250 5 S 315 -10 340 5 V420 H-50Z"
              fill={`url(#${waveId})`}
              animate={{ x: [-15, 15, -15] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path d="M-50 14 C -5 -1 25 27 75 12 S 165 -3 220 13 S 295 23 340 8" stroke="rgba(213,246,255,.92)" strokeWidth="2" fill="none" animate={{ x: [12, -15, 12] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }} />
          </motion.g>
        </g>
        <path d={bodyPath} className="silhouette-stroke" /><circle {...head} className="silhouette-stroke" />
        <g className="body-ticks"><line x1="15" y1="74" x2="49" y2="74" /><line x1="15" y1="166" x2="49" y2="166" /><line x1="15" y1="258" x2="49" y2="258" /><line x1="15" y1="350" x2="49" y2="350" /></g>
      </svg>
      <div className="body-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
    </div>
  )
}
