import { useQuery } from '@tanstack/react-query'
import type { Profile } from './types'
import { getLocalWeather } from '@/services/weather'
import { calculateWaterGoal } from './calculateGoal'

export function useGoalRecommendation(profile: Profile) {
  return useQuery({
    queryKey: ['hydration-goal', profile.weight, profile.height, profile.age, profile.gender, profile.activity],
    queryFn: async () => {
      const weather = await getLocalWeather()
      return { value: calculateWaterGoal(profile, { temperatureC: weather.temperatureC }), temperatureC: weather.temperatureC }
    },
    placeholderData: { value: calculateWaterGoal(profile), temperatureC: null }
  })
}
