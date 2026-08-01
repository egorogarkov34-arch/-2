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
  const bodyPath = 'M140 29c-17 0-30 13-30 30 0 13 8 24 18 28-2 7-12 12-25 16-20 6-31 16-36 36l-12 50c-3 13 6 25 17 25 8 0 13-4 15-12l12-45 7 54-13 66 12 67c2 12 9 18 20 18s17-6 18-18l9-58h3l9 58c1 12 7 18 18 18s18-6 20-18l12-67-13-66 7-54 12 45c2 8 7 12 15 12 11 0 20-12 17-25l-12-50c-5-20-16-30-36-36-13-4-25-9-25-16 10-4 18-15 18-28 0-17-13-30-30-30Z'
  return (
    <div className="body-water-wrap" role="img" aria-label={language === 'en' ? `Body silhouette filled to ${Math.round(percentage)} percent` : `Силуэт заполнен водой на ${Math.round(percentage)} процентов`}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={bodyPath} /></clipPath>
          <linearGradient id={waveId} x1="140" y1="55" x2="140" y2="370" gradientUnits="userSpaceOnUse">
            <stop stopColor="#75CEFF" /><stop offset=".45" stopColor="#328DFF" /><stop offset="1" stopColor="#1462D8" />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-35%" y="-20%" width="170%" height="150%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <path d={bodyPath} className="silhouette-base" />
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
        <path d={bodyPath} className="silhouette-stroke" />
        <g className="body-ticks"><line x1="15" y1="74" x2="49" y2="74" /><line x1="15" y1="166" x2="49" y2="166" /><line x1="15" y1="258" x2="49" y2="258" /><line x1="15" y1="350" x2="49" y2="350" /></g>
      </svg>
      <div className="body-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>
    </div>
  )
}
