import { memo, useId } from 'react'
import { motion } from 'framer-motion'
import { clamp, formatMl } from '@/shared/lib/format'
import { useTranslation } from '@/shared/lib/i18n'
import type { BodySkin } from '@/entities/hydration/model/types'

interface Props { percentage: number; skin?: BodySkin; compact?: boolean; goal?: number }

interface SkinShape {
  bodyPath: string
  bodyOutline: string
  headPath: string
  headOutline: string
  headExtras?: string[]
  headExtraOutlines?: string[]
  details?: string[]
}

const maleHeadOutline = 'M119 84C112 78 108 69 108 58C108 40 122 26 140 26C158 26 172 40 172 58C172 69 168 78 161 84'

const skins: Record<BodySkin, SkinShape> = {
  'male-classic': {
    bodyPath: 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82Z',
    bodyOutline: 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82',
    headPath: `${maleHeadOutline}C155 89 125 89 119 84Z`,
    headOutline: maleHeadOutline,
  },
  'female-classic': {
    bodyPath: 'M121 83C120 92 112 98 97 104C80 111 70 124 67 143L58 185C55 198 62 208 72 211C83 214 90 208 94 197L104 159L110 212C112 225 109 241 104 257C99 274 97 296 99 326C100 349 106 367 118 369C131 371 138 363 139 350L141 304C141 299 142 296 145 296C148 296 149 299 149 304L152 350C153 363 160 371 173 369C185 367 190 349 191 326C193 296 191 274 186 257C181 241 178 225 180 212L186 159L196 197C200 208 207 214 218 211C228 208 235 198 232 185L223 143C220 124 210 111 193 104C178 98 161 92 160 83Z',
    bodyOutline: 'M121 83C120 92 112 98 97 104C80 111 70 124 67 143L58 185C55 198 62 208 72 211C83 214 90 208 94 197L104 159L110 212C112 225 109 241 104 257C99 274 97 296 99 326C100 349 106 367 118 369C131 371 138 363 139 350L141 304C141 299 142 296 145 296C148 296 149 299 149 304L152 350C153 363 160 371 173 369C185 367 190 349 191 326C193 296 191 274 186 257C181 241 178 225 180 212L186 159L196 197C200 208 207 214 218 211C228 208 235 198 232 185L223 143C220 124 210 111 193 104C178 98 161 92 160 83',
    headPath: 'M120 85C112 78 108 68 109 56C110 39 123 26 140 26C157 26 171 39 171 56C172 68 167 78 160 85C154 91 126 91 120 85Z',
    headOutline: 'M120 85C112 78 108 68 109 56C110 39 123 26 140 26C157 26 171 39 171 56C172 68 167 78 160 85',
    headExtras: ['M168 41C184 43 196 57 196 75C196 92 188 105 175 112C182 96 181 79 174 65C171 57 169 49 168 41Z'],
    headExtraOutlines: ['M168 41C184 43 196 57 196 75C196 92 188 105 175 112C182 96 181 79 174 65C171 57 169 49 168 41'],
  },
  'male-athlete': {
    bodyPath: 'M116 82C115 91 106 96 88 101C66 107 52 120 47 140L35 181C31 197 39 213 53 218C67 223 79 215 84 202L97 157L105 210C108 229 104 248 101 269L97 327C95 352 102 371 117 373C133 375 142 365 143 351L145 304C145 299 147 296 150 296C153 296 155 299 155 304L157 351C158 365 167 375 183 373C198 371 205 352 203 327L199 269C196 248 192 229 195 210L203 157L216 202C221 215 233 223 247 218C261 213 269 197 265 181L253 140C248 120 234 107 212 101C194 96 165 91 164 82Z',
    bodyOutline: 'M116 82C115 91 106 96 88 101C66 107 52 120 47 140L35 181C31 197 39 213 53 218C67 223 79 215 84 202L97 157L105 210C108 229 104 248 101 269L97 327C95 352 102 371 117 373C133 375 142 365 143 351L145 304C145 299 147 296 150 296C153 296 155 299 155 304L157 351C158 365 167 375 183 373C198 371 205 352 203 327L199 269C196 248 192 229 195 210L203 157L216 202C221 215 233 223 247 218C261 213 269 197 265 181L253 140C248 120 234 107 212 101C194 96 165 91 164 82',
    headPath: `${maleHeadOutline}C155 89 125 89 119 84Z`,
    headOutline: maleHeadOutline,
    details: ['M90 130C106 139 124 141 140 133C156 141 174 139 190 130', 'M107 161C117 168 128 171 140 165C152 171 163 168 173 161', 'M115 181C123 188 132 191 140 187C148 191 157 188 165 181'],
  },
}

/** Lightweight SVG skins with one shared, animated water-fill system. */
export const BodyWater = memo(function BodyWater({ percentage, skin = 'male-classic', compact = false, goal = 0 }: Props) {
  const { language } = useTranslation()
  const uid = useId().replaceAll(':', '')
  const clipId = `body-clip-${uid}`
  const waveId = `water-wave-${uid}`
  const shape = skins[skin]
  const fillPercentage = clamp(percentage, 0, 100)
  const level = 390 - 3.9 * fillPercentage
  const hasWater = fillPercentage > 0.01
  const waveSurface = 'M-70 6 C-40 -6 -14 19 18 7 S82 -7 116 7 S182 20 216 6 S281 -7 322 7 S366 19 400 5'
  const waterShape = `${waveSurface} V430 H-70Z`
  const scaleMarks = [100, 75, 50, 25]
  const label = language === 'en' ? `Body silhouette filled to ${Math.round(percentage)} percent` : `\u0421\u0438\u043b\u0443\u044d\u0442 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d \u0432\u043e\u0434\u043e\u0439 \u043d\u0430 ${Math.round(percentage)} \u043f\u0440\u043e\u0446\u0435\u043d\u0442\u043e\u0432`
  return (
    <div className={`body-water-wrap${compact ? ' is-preview' : ''}`} role="img" aria-label={label}>
      <svg className="body-water" viewBox="0 0 280 390" fill="none">
        <defs>
          <clipPath id={clipId}><path d={shape.bodyPath}/><path d={shape.headPath}/>{shape.headExtras?.map((path) => <path d={path} key={path}/>)}</clipPath>
          <linearGradient id={waveId} x1="140" y1="55" x2="140" y2="370" gradientUnits="userSpaceOnUse"><stop stopColor="#75CEFF"/><stop offset=".45" stopColor="#328DFF"/><stop offset="1" stopColor="#1462D8"/></linearGradient>
        </defs>
        <path d={shape.bodyPath} className="silhouette-base"/><path d={shape.headPath} className="head-fill"/>{shape.headExtras?.map((path) => <path d={path} className="head-fill" key={path}/>)}
        <g clipPath={`url(#${clipId})`}>{hasWater && <motion.g className="water-level" style={{ willChange: 'transform' }} initial={{ y: 390 }} animate={{ y: level }} transition={{ type: 'spring', stiffness: 32, damping: 18, mass: .9 }}><motion.g className="water-wave" style={{ willChange: 'transform' }} animate={{ x: [-13, 13, -13] }} transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}><path d={waterShape} fill={`url(#${waveId})`}/><path d={waveSurface} stroke="rgba(225,248,255,.92)" strokeWidth="2" fill="none" strokeLinecap="round"/></motion.g></motion.g>}</g>
        {shape.details?.map((path) => <path d={path} className="skin-detail" key={path}/>)}<path d={shape.bodyOutline} className="silhouette-stroke"/><path d={shape.headOutline} className="silhouette-stroke"/>{shape.headExtraOutlines?.map((path) => <path d={path} className="silhouette-stroke" key={path}/>)}
      </svg>
      {!compact && <div className="body-scale">{scaleMarks.map((mark) => <span key={mark}><b>{formatMl(Math.round(goal * mark / 100), language)} {language === 'ru' ? '\u043c\u043b' : 'ml'}</b><i/></span>)}</div>}
    </div>
  )
})
