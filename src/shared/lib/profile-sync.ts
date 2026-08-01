import type { Profile } from '@/entities/hydration/model/types'
import { telegram } from './telegram'

const profileEndpoint = 'https://aquora-water-bot.egorogarkov34.workers.dev/profile'

export async function syncProfileToBot(profile: Profile, goal: number) {
  const initData = telegram()?.initData
  if (!initData) return false

  try {
    const response = await fetch(profileEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // The request still completes if the user closes the Mini App right after saving.
      keepalive: true,
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
    })

    return response.ok
  } catch {
    return false
  }
}
