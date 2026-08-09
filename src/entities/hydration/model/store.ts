import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HydrationState, IntakeEntry, StoredUserState } from './types'
import { syncToCloud, telegram } from '@/shared/lib/telegram'
import { calculateWaterGoal } from './calculateGoal'
import { todayKey } from '@/shared/lib/format'

const telegramUser = telegram()?.initDataUnsafe.user
const telegramUserId = telegramUser?.id ?? 'guest'
const storageKey = `aquora-hydration-v2:${telegramUserId}`
const cloudUserStateKey = 'aquora:user-state'
const hydrationProfileFields = ['age', 'gender', 'height', 'weight', 'activity'] as const

const initialProfile = {
  name: telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name ?? 'Пользователь',
  age: 28,
  gender: 'male' as const,
  height: 180,
  weight: 75,
  activity: 'moderate' as const,
  units: 'ml' as const,
  language: 'ru' as const,
  theme: 'dark' as const,
  skin: 'male-classic' as const,
}

const syncUserState = (state: Pick<HydrationState, 'profile' | 'goal' | 'goalMode' | 'dayGoals'>) =>
  syncToCloud(cloudUserStateKey, { profile: state.profile, goal: state.goal, goalMode: state.goalMode, dayGoals: state.dayGoals } satisfies StoredUserState)

function changesHydrationNeed(profile: Partial<HydrationState['profile']>) {
  return hydrationProfileFields.some((field) => field in profile)
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      goal: calculateWaterGoal(initialProfile),
      goalMode: 'auto',
      intake: [],
      dayGoals: {},
      profile: initialProfile,
      setActiveTab: (activeTab) => set({ activeTab }),
      addWater: (amount) =>
        set((state) => {
          const intake = [...state.intake, { id: crypto.randomUUID(), amount, createdAt: new Date().toISOString() }]
          const dayGoals = { ...state.dayGoals, [todayKey()]: state.goal }
          syncToCloud('aquora:intake', intake)
          syncUserState({ ...state, dayGoals })
          return { intake, dayGoals }
        }),
      removeWater: (id) =>
        set((state) => {
          const intake = state.intake.filter((entry) => entry.id !== id)
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      clearWater: () =>
        set(() => {
          const intake: IntakeEntry[] = []
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      clearTodayWater: () =>
        set((state) => {
          const currentDay = todayKey()
          const intake = state.intake.filter((entry) => todayKey(new Date(entry.createdAt)) !== currentDay)
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      setGoal: (goal) =>
        set((state) => {
          const next = { goal, goalMode: 'custom' as const, dayGoals: { ...state.dayGoals, [todayKey()]: goal } }
          syncUserState({ ...state, ...next })
          return next
        }),
      setAutomaticGoal: (goal) =>
        set((state) => {
          if (state.goalMode !== 'auto') return {}
          const next = { goal, dayGoals: { ...state.dayGoals, [todayKey()]: goal } }
          syncUserState({ ...state, ...next })
          return next
        }),
      updateProfile: (profile) =>
        set((state) => {
          const nextProfile = { ...state.profile, ...profile }
          const automaticGoal = calculateWaterGoal(nextProfile)
          const next = changesHydrationNeed(profile)
            ? { profile: nextProfile, goal: automaticGoal, goalMode: 'auto' as const, dayGoals: { ...state.dayGoals, [todayKey()]: automaticGoal } }
            : { profile: nextProfile }
          syncUserState({ ...state, ...next })
          return next
        }),
      restoreUserState: (stored) =>
        set((state) => {
          const profile = { ...initialProfile, ...state.profile, ...stored.profile }
          const goalMode = stored.goalMode === 'custom' ? 'custom' : 'auto'
          const storedGoal = typeof stored.goal === 'number' && stored.goal >= 500 && stored.goal <= 10_000 ? stored.goal : state.goal
          return { profile, goal: goalMode === 'auto' ? calculateWaterGoal(profile) : storedGoal, goalMode, dayGoals: { ...state.dayGoals, ...stored.dayGoals } }
        }),
    }),
    {
      name: storageKey,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<HydrationState>
        const profile = { ...initialProfile, ...persisted.profile }
        const goalMode = persisted.goalMode === 'custom' ? 'custom' : 'auto'
        const storedGoal = typeof persisted.goal === 'number' && persisted.goal >= 500 && persisted.goal <= 10_000 ? persisted.goal : currentState.goal
        return { ...currentState, ...persisted, profile, goal: goalMode === 'auto' ? calculateWaterGoal(profile) : storedGoal, goalMode, dayGoals: { ...currentState.dayGoals, ...persisted.dayGoals } }
      },
    },
  ),
)

export const selectTodayAmount = (state: HydrationState) =>
  state.intake.filter((item) => todayKey(new Date(item.createdAt)) === todayKey()).reduce((sum, item) => sum + item.amount, 0)
