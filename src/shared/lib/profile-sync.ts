import type { Profile } from '@/entities/hydration/model/types'
import { telegram } from './telegram'

const profileEndpoint = 'https://aquora-water-bot.egorogarkov34.workers.dev/profile'

export function syncProfileToBot(profile: Profile, goal: number) {
  const initData = telegram()?.initData
  if (!initData) return

  void fetch(profileEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      initData,
      profile: {
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        activity: profile.activity,
        language: profile.language,
      },
      goal,
    }),
  }).catch(() => undefined)
}
