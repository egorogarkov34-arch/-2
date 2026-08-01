import type { Profile } from '@/entities/hydration/model/types'
import { getTelegramInitData } from './telegram'

const profileEndpoint = 'https://aquora-water-bot.egorogarkov34.workers.dev/profile'

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

export async function syncProfileToBot(profile: Profile, goal: number, todayAmount: number, todayDate: string, timezoneOffsetMinutes: number, attempt = 0): Promise<boolean> {
  const initData = getTelegramInitData()
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
          reminders: profile.reminders,
          reminderInterval: profile.reminderInterval,
        },
        goal,
        todayAmount,
        todayDate,
        timezoneOffsetMinutes,
      }),
    })

    if (response.ok || attempt >= 2) return response.ok
  } catch {
    if (attempt >= 2) return false
  }

  await wait(900 * (attempt + 1))
  return syncProfileToBot(profile, goal, todayAmount, todayDate, timezoneOffsetMinutes, attempt + 1)
}
