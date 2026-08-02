import { memo } from 'react'
import { motion } from 'framer-motion'
import { clamp } from '@/shared/lib/format'

interface Props { value: number; size?: number; stroke?: number; label?: string }

export const ProgressRing = memo(function ProgressRing({ value, size = 124, stroke = 9, label }: Props) {
  const safeValue = clamp(value, 0, 100)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Выполнено ${Math.round(safeValue)}%`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <motion.circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - safeValue / 100) }}
          transition={{ type: 'spring', stiffness: 65, damping: 15, mass: 0.7 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className="ring-label">{label ?? `${Math.round(safeValue)}%`}</span>
    </div>
  )
})
