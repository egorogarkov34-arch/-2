import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HydrationState } from './types'
import { syncToCloud, telegram } from '@/shared/lib/telegram'
import { calculateWaterGoal } from './calculateGoal'
import { todayKey } from '@/shared/lib/format'

const telegramUser = telegram()?.initDataUnsafe.user
const telegramUserId = telegramUser?.id ?? 'guest'
const storageKey = `aquora-hydration-v2:${telegramUserId}`

const initialProfile = {
  name: telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name ?? 'Пользователь',
  age: 28,
  gender: 'male' as const,
  height: 180,
  weight: 75,
  activity: 'moderate' as const,
  reminders: true,
  reminderInterval: 'Каждые 2 часа',
  units: 'ml' as const,
  language: 'ru' as const,
  theme: 'dark' as const
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      goal: calculateWaterGoal(initialProfile),
      intake: [],
      profile: initialProfile,
      setActiveTab: (activeTab) => set({ activeTab }),
      addWater: (amount) =>
        set((state) => {
          const intake = [...state.intake, { id: crypto.randomUUID(), amount, createdAt: new Date().toISOString() }]
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      removeWater: (id) =>
        set((state) => {
          const intake = state.intake.filter((entry) => entry.id !== id)
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      setGoal: (goal) => set({ goal }),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } }))
    }),
    { name: storageKey }
  )
)

export const selectTodayAmount = (state: HydrationState) =>
  state.intake.filter((item) => item.createdAt.startsWith(todayKey())).reduce((sum, item) => sum + item.amount, 0)
