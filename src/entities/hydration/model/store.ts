import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HydrationState } from './types'
import { todayKey } from '@/shared/lib/format'
import { syncToCloud } from '@/shared/lib/telegram'
import { calculateWaterGoal } from './calculateGoal'

const initialProfile = {
  name: 'Егор',
  age: 28,
  gender: 'male' as const,
  height: 180,
  weight: 75,
  activity: 'moderate' as const,
  reminders: true,
  reminderInterval: 'Каждые 2 часа',
  units: 'ml' as const,
  language: 'ru' as const
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      goal: calculateWaterGoal(initialProfile),
      intake: [
        { id: 'seed-1', amount: 500, createdAt: `${todayKey()}T08:40:00.000Z` },
        { id: 'seed-2', amount: 600, createdAt: `${todayKey()}T12:10:00.000Z` },
        { id: 'seed-3', amount: 700, createdAt: `${todayKey()}T15:30:00.000Z` }
      ],
      profile: initialProfile,
      setActiveTab: (activeTab) => set({ activeTab }),
      addWater: (amount) =>
        set((state) => {
          const intake = [...state.intake, { id: crypto.randomUUID(), amount, createdAt: new Date().toISOString() }]
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      setGoal: (goal) => set({ goal }),
      updateProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } }))
    }),
    { name: 'aquora-hydration-v1' }
  )
)

export const selectTodayAmount = (state: HydrationState) =>
  state.intake.filter((item) => item.createdAt.startsWith(todayKey())).reduce((sum, item) => sum + item.amount, 0)
