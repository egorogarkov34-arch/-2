import type { Profile } from './types'

export interface HydrationConditions { temperatureC?: number | null }

/**
 * A hydration target for water logged in the app. It uses body mass as the
 * primary factor and applies small, bounded adjustments for the other profile
 * inputs. It is a wellness estimate, not a medical prescription.
 */
export function calculateWaterGoal(profile: Profile, conditions: HydrationConditions = {}): number {
  const millilitresPerKg = profile.gender === 'male' ? 35 : profile.gender === 'female' ? 31 : 33
  const ageAdjustment = profile.age >= 55 ? -200 : profile.age < 22 ? 150 : 0
  const heightAdjustment = Math.round((profile.height - 170) * 3)
  const activityAdjustment = profile.activity === 'high' ? 650 : profile.activity === 'moderate' ? 350 : 0
  const temperature = conditions.temperatureC
  const heatAdjustment = typeof temperature === 'number' && Number.isFinite(temperature) && temperature > 20
    ? Math.min(600, Math.round((temperature - 20) * 30))
    : 0
  const total = profile.weight * millilitresPerKg + ageAdjustment + heightAdjustment + activityAdjustment + heatAdjustment
  return Math.round(Math.min(5500, Math.max(1500, total)) / 50) * 50
}
