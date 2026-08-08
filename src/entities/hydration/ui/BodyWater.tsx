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

const maleHeadOutline = 'M119 84C112 78 108 69 108 58C108 40 122 26 140 26C158 26 172 40 172 58C172 69 168 78 161 84'

const skins: Record<BodySkin, SkinShape> = {
  'male-classic': {
    bodyPath: 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82Z',
    bodyOutline: 'M119 82C118 91 111 96 96 101C76 107 64 121 60 141L48 186C45 199 52 211 64 214C75 217 83 211 86 200L98 159L104 218C105 233 101 253 99 273L96 328C94 350 99 368 113 370C126 372 134 364 135 352L139 305C139 300 141 297 145 297C149 297 151 300 151 305L155 352C156 364 164 372 177 370C191 368 196 350 194 328L191 273C189 253 185 233 186 218L192 159L204 200C207 211 215 217 226 214C238 211 245 199 242 186L230 141C226 121 214 107 194 101C179 96 162 91 161 82',
    headPath: `${maleHeadOutline}C155 89 125 89 119 84Z`,
    headOutline: maleHeadOutline,
  },
  'female-classic': {
    bodyPath: 'M120 82C119 91 111 96 98 101C80 108 69 122 66 140L57 184C54 197 61 207 71 210C82 213 89 207 92 197L102 160L108 214C110 233 107 250 102 272L99 325C97 349 103 367 116 369C129 371 136 363 137 350L140 304C140 299 141 296 144 296C147 296 148 299 148 304L151 350C152 363 159 371 172 369C185 367 191 349 189 325L186 272C181 250 178 233 180 214L186 160L196 197C199 207 206 213 217 210C227 207 234 197 231 184L222 140C219 122 208 108 190 101C176 96 162 91 161 82Z',
    bodyOutline: 'M120 82C119 91 111 96 98 101C80 108 69 122 66 140L57 184C54 197 61 207 71 210C82 213 89 207 92 197L102 160L108 214C110 233 107 250 102 272L99 325C97 349 103 367 116 369C129 371 136 363 137 350L140 304C140 299 141 296 144 296C147 296 148 299 148 304L151 350C152 363 159 371 172 369C185 367 191 349 189 325L186 272C181 250 178 233 180 214L186 160L196 197C199 207 206 213 217 210C227 207 234 197 231 184L222 140C219 122 208 108 190 101C176 96 162 91 161 82',
    headPath: 'M120 83C113 77 110 68 110 58C110 42 123 29 140 29C157 29 170 42 170 58C170 68 167 77 160 83C154 89 126 89 120 83Z',
    headOutline: 'M120 83C113 77 110 68 110 58C110 42 123 29 140 29C157 29 170 42 170 58C170 68 167 77 160 83',
    headExtras: ['M168 48C181 48 191 58 191 72C191 80 187 87 180 91C184 81 182 68 174 60C172 56 170 52 168 48Z'],
    headExtraOutlines: ['M168 48C181 48 191 58 191 72C191 80 187 87 180 91C184 81 182 68 174 60C172 56 170 52 168 48'],
  },
  'male-athlete': {
    bodyPath: 'M117 82C116 91 107 96 91 101C69 108 56 122 52 142L40 184C37 199 45 213 58 216C71 219 81 212 85 200L97 157L106 215C108 232 104 251 102 272L99 328C97 351 103 369 117 371C131 373 139 364 140 351L142 305C142 300 144 297 148 297C152 297 154 300 154 305L156 351C157 364 165 373 179 371C193 369 199 351 197 328L194 272C192 251 188 232 190 215L199 157L211 200C215 212 225 219 238 216C251 213 259 199 256 184L244 142C240 122 227 108 205 101C189 96 164 91 163 82Z',
    bodyOutline: 'M117 82C116 91 107 96 91 101C69 108 56 122 52 142L40 184C37 199 45 213 58 216C71 219 81 212 85 200L97 157L106 215C108 232 104 251 102 272L99 328C97 351 103 369 117 371C131 373 139 364 140 351L142 305C142 300 144 297 148 297C152 297 154 300 154 305L156 351C157 364 165 373 179 371C193 369 199 351 197 328L194 272C192 251 188 232 190 215L199 157L211 200C215 212 225 219 238 216C251 213 259 199 256 184L244 142C240 122 227 108 205 101C189 96 164 91 163 82',
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
  const level = 390 - 3.9 * fillPercentage
  const hasWater = fillPercentage > 0.01
  const waveSurface = 'M-70 6 C-40 -6 -14 19 18 7 S82 -7 116 7 S182 20 216 6 S281 -7 322 7 S366 19 400 5'
  const waterShape = `${waveSurface} V430 H-70Z`
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
        <path d={shape.bodyOutline} className="silhouette-stroke"/><path d={shape.headOutline} className="silhouette-stroke"/>{shape.headExtraOutlines?.map((path) => <path d={path} className="silhouette-stroke" key={path}/>)}
        {!compact && <g className="body-ticks"><line x1="15" y1="74" x2="49" y2="74"/><line x1="15" y1="166" x2="49" y2="166"/><line x1="15" y1="258" x2="49" y2="258"/><line x1="15" y1="350" x2="49" y2="350"/></g>}
      </svg>
      {!compact && <div className="body-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span></div>}
    </div>
  )
})
