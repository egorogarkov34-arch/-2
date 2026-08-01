import type { Profile } from './types'

export interface HydrationConditions { temperatureC?: number | null }

/** Evidence-informed default used as a personalisation starting point, not medical advice. */
export function calculateWaterGoal(profile: Profile, conditions: HydrationConditions = {}): number {
  const perKg = profile.gender === 'male' ? 35 : profile.gender === 'female' ? 31 : 33
  const ageAdjustment = profile.age >= 55 ? -200 : profile.age < 22 ? 150 : 0
  const heightAdjustment = Math.round((profile.height - 170) * 3)
  const activityAdjustment = profile.activity === 'high' ? 650 : profile.activity === 'moderate' ? 350 : 0
  const heatAdjustment = conditions.temperatureC && conditions.temperatureC > 20 ? Math.min(600, Math.round((conditions.temperatureC - 20) * 30)) : 0
  const workoutAdjustment = Math.min(1200, Math.max(0, profile.workoutMinutes ?? 0) * 12)
  const total = profile.weight * perKg + ageAdjustment + heightAdjustment + activityAdjustment + heatAdjustment + workoutAdjustment
  return Math.round(Math.min(5500, Math.max(1500, total)) / 50) * 50
}
