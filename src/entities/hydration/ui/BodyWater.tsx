import { memo, useId } from 'react'
import { motion } from 'framer-motion'
import { clamp } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import type { BodySkin } from '@/entities/hydration/model/types'

interface Props { percentage: number; skin?: BodySkin; compact?: boolean }

interface SkinShape {
  bodyPath: string
  bodyOutline: string
  headPath: string
  headOutline: string
  headExtras?: string[]
  headExtraOutlines?: string[]
}

export type HydrationMood = 'sad' | 'calm' | 'happy' | 'joy'

const maleHeadOutline = 'M119 84C112 78 108 69 108 58C108 40 122 26 140 26C158 26 172 40 172 58C172 69 168 78 161 84'

export function getHydrationMood(percentage: number): HydrationMood {
  if (percentage <= 0.01) return 'sad'
  if (percentage < 50) return 'calm'
  if (percentage < 100) return 'happy'
  return 'joy'
}

function BodyExpressionFace({ expression }: { expression: HydrationMood }) {
  const eyes = expression === 'joy'
    ? <><path className="expression-eye" d="M126 58Q130 62 134 58"/><path className="expression-eye" d="M146 58Q150 62 154 58"/></>
    : <><circle className="expression-eye-dot" cx="130" cy="59" r="2"/><circle className="expression-eye-dot" cx="150" cy="59" r="2"/></>

  const mouth = expression === 'sad'
    ? <path className="expression-mouth" d="M132 74Q140 67 148 74"/>
    : expression === 'calm'
      ? <path className="expression-mouth" d="M133 72H147"/>
      : expression === 'happy'
        ? <path className="expression-mouth" d="M132 69Q140 78 148 69"/>
        : <path className="expression-mouth expression-mouth-open" d="M130 68Q140 82 150 68Q140 76 130 68Z"/>

  return <motion.g className={`body-expression is-${expression}`} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .24, ease: 'easeOut' }} key={expression}>{eyes}{mouth}</motion.g>
}

const skins: Record<BodySkin, SkinShape> = {
  'male-classic': {
    bodyPath: 'M119 84C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 84Z',
    bodyOutline: 'M119 84C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 84',
    headPath: `${maleHeadOutline}C155 89 125 89 119 84Z`,
    headOutline: maleHeadOutline,
  },
  'female-classic': {
    bodyPath: 'M120 86C119 95 113 99 100 105C85 112 78 127 75 146L67 184C64 197 70 207 80 210C90 213 97 207 100 196L107 159L114 210C116 225 113 240 108 256C102 273 98 296 100 327C101 350 108 368 121 370C134 372 141 364 142 350L144 305C144 299 145 296 148 296C151 296 152 299 152 305L155 350C156 364 163 372 176 370C189 368 196 350 196 327C198 296 194 273 188 256C183 240 180 225 182 210L189 159L196 196C199 207 206 213 216 210C226 207 232 197 229 184L221 146C218 127 211 112 196 105C183 99 163 95 160 86Z',
    bodyOutline: 'M120 86C119 95 113 99 100 105C85 112 78 127 75 146L67 184C64 197 70 207 80 210C90 213 97 207 100 196L107 159L114 210C116 225 113 240 108 256C102 273 98 296 100 327C101 350 108 368 121 370C134 372 141 364 142 350L144 305C144 299 145 296 148 296C151 296 152 299 152 305L155 350C156 364 163 372 176 370C189 368 196 350 196 327C198 296 194 273 188 256C183 240 180 225 182 210L189 159L196 196C199 207 206 213 216 210C226 207 232 197 229 184L221 146C218 127 211 112 196 105C183 99 163 95 160 86',
    headPath: 'M120 86C112 79 108 68 110 55C112 38 125 26 140 26C155 26 169 38 171 55C172 68 168 79 160 86C154 92 126 92 120 86Z',
    headOutline: 'M120 86C112 79 108 68 110 55C112 38 125 26 140 26C155 26 169 38 171 55C172 68 168 79 160 86',
    headExtras: ['M158 35C178 40 191 57 189 77C188 92 179 103 173 114C170 121 177 127 171 137C166 132 161 127 163 117C165 107 172 98 175 88C181 69 174 47 158 35Z'],
    headExtraOutlines: ['M158 35C178 40 191 57 189 77C188 92 179 103 173 114C170 121 177 127 171 137C166 132 161 127 163 117C165 107 172 98 175 88C181 69 174 47 158 35'],
  },
  'male-athlete': {
    bodyPath: 'M119 84C118 91 106 96 88 101C66 107 52 120 47 140L35 181C31 197 39 213 53 218C67 223 79 215 84 202L97 157L105 210C108 229 104 248 101 269L97 327C95 352 102 371 117 373C133 375 142 365 143 351L145 304C145 299 147 296 150 296C153 296 155 299 155 304L157 351C158 365 167 375 183 373C198 371 205 352 203 327L199 269C196 248 192 229 195 210L203 157L216 202C221 215 233 223 247 218C261 213 269 197 265 181L253 140C248 120 234 107 212 101C194 96 162 91 161 84Z',
    bodyOutline: 'M119 84C118 91 106 96 88 101C66 107 52 120 47 140L35 181C31 197 39 213 53 218C67 223 79 215 84 202L97 157L105 210C108 229 104 248 101 269L97 327C95 352 102 371 117 373C133 375 142 365 143 351L145 304C145 299 147 296 150 296C153 296 155 299 155 304L157 351C158 365 167 375 183 373C198 371 205 352 203 327L199 269C196 248 192 229 195 210L203 157L216 202C221 215 233 223 247 218C261 213 269 197 265 181L253 140C248 120 234 107 212 101C194 96 162 91 161 84',
    headPath: `${maleHeadOutline}C155 89 125 89 119 84Z`,
    headOutline: maleHeadOutline,
  },
}

/** Lightweight SVG skins with one shared, animated water-fill system. */
export const BodyWater = memo(function BodyWater({ percentage, skin = 'male-classic', compact = false }: Props) {
  const { language } = useTranslation()
  const uid = useId().replaceAll(':', '')
  const clipId = `body-clip-${uid}`
  const waveId = `water-wave-${uid}`
  const shape = skins[skin]
  const fillPercentage = clamp(percentage, 0, 100)
  const expression = getHydrationMood(fillPercentage)
  const level = 390 - 3.9 * fillPercentage
  const hasWater = fillPercentage > 0.01
  const waveSurface = 'M-70 6 C-40 -6 -14 19 18 7 S82 -7 116 7 S182 20 216 6 S281 -7 322 7 S366 19 400 5'
  const waterShape = `${waveSurface} V430 H-70Z`
  const label = language === 'en' ? `Body silhouette filled to ${Math.round(percentage)} percent` : `\u0421\u0438\u043b\u0443\u044d\u0442 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d \u0432\u043e\u0434\u043e\u0439 \u043d\u0430 ${Math.round(percentage)} \u043f\u0440\u043e\u0446\u0435\u043d\u0442\u043e\u0432`
  return (
    <div className={`body-water-wrap${compact ? ' is-preview' : ''}`} role="img" aria-label={label}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={shape.bodyPath}/><path d={shape.headPath}/></clipPath>
          <linearGradient id={waveId} x1="140" y1="55" x2="140" y2="370" gradientUnits="userSpaceOnUse"><stop stopColor="#75CEFF"/><stop offset=".45" stopColor="#328DFF"/><stop offset="1" stopColor="#1462D8"/></linearGradient>
        </defs>
        <path d={shape.bodyPath} className="silhouette-base"/><path d={shape.headPath} className="head-fill"/>{shape.headExtras?.map((path) => <path d={path} className="head-fill" key={path}/>)}
        <g clipPath={`url(#${clipId})`}>{hasWater && <motion.g className="water-level" style={{ willChange: 'transform' }} initial={{ y: 390 }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 32, damping: 18, mass: .9 }}><motion.g className="water-wave" style={{ willChange: 'transform' }} animate={{ x: [-13, 13, -13] }} transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}><path d={waterShape} fill={`url(#${waveId})`}/><path d={waveSurface} stroke="rgba(225,248,255,.92)" strokeWidth="2" fill="none" strokeLinecap="round"/></motion.g></motion.g>}</g>
        <path d={shape.bodyOutline} className="silhouette-stroke"/><path d={shape.headOutline} className="silhouette-stroke"/>{shape.headExtraOutlines?.map((path) => <path d={path} className="silhouette-stroke" key={path}/>)}
        {!compact && <BodyExpressionFace expression={expression}/>} 
      </svg>
    </div>
  )
})
