import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HydrationState, IntakeEntry, ReminderInterval, StoredUserState } from './types'
import { syncToCloud, telegram } from '@/shared/lib/telegram'
import { calculateWaterGoal } from './calculateGoal'
import { todayKey } from '@/shared/lib/format'

const telegramUser = telegram()?.initDataUnsafe.user
const telegramUserId = telegramUser?.id ?? 'guest'
const storageKey = `aquora-hydration-v2:${telegramUserId}`
const cloudUserStateKey = 'aquora:user-state'

const initialProfile = {
  name: telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.first_name ?? 'Пользователь',
  age: 28,
  gender: 'male' as const,
  height: 180,
  weight: 75,
  activity: 'moderate' as const,
  reminders: true,
  reminderInterval: '2h' as ReminderInterval,
  units: 'ml' as const,
  language: 'ru' as const,
  theme: 'dark' as const
}

const syncUserState = (state: Pick<HydrationState, 'profile' | 'goal' | 'goalMode'>) =>
  syncToCloud(cloudUserStateKey, { profile: state.profile, goal: state.goal, goalMode: state.goalMode } satisfies StoredUserState)

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      goal: calculateWaterGoal(initialProfile),
      goalMode: 'auto',
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
      clearWater: () =>
        set(() => {
          const intake: IntakeEntry[] = []
          syncToCloud('aquora:intake', intake)
          return { intake }
        }),
      setGoal: (goal) => set((state) => {
        const next = { goal, goalMode: 'custom' as const }
        syncUserState({ ...state, ...next })
        return next
      }),
      setAutomaticGoal: (goal) => set((state) => {
        if (state.goalMode !== 'auto') return {}
        const next = { goal }
        syncUserState({ ...state, ...next })
        return next
      }),
      updateProfile: (profile) => set((state) => {
        const next = { profile: { ...state.profile, ...profile } }
        syncUserState({ ...state, ...next })
        return next
      }),
      restoreUserState: (stored) => set((state) => ({
        profile: { ...initialProfile, ...state.profile, ...stored.profile, reminderInterval: normalizeReminderInterval(stored.profile?.reminderInterval ?? state.profile.reminderInterval) },
        goal: typeof stored.goal === 'number' && stored.goal >= 500 && stored.goal <= 10_000 ? stored.goal : state.goal,
        goalMode: stored.goalMode ?? state.goalMode
      }))
    }),
    {
      name: storageKey,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<HydrationState>
        return { ...currentState, ...persisted, profile: { ...initialProfile, ...persisted.profile, reminderInterval: normalizeReminderInterval(persisted.profile?.reminderInterval) } }
      }
    }
  )
)

function normalizeReminderInterval(value: unknown): ReminderInterval {
  if (value === '30m' || value === '1h' || value === '2h' || value === '3h') return value
  if (typeof value !== 'string') return '2h'
  const normalized = value.toLowerCase()
  if (normalized.includes('30')) return '30m'
  if (normalized.includes('3')) return '3h'
  if (normalized.includes('1') || normalized.includes('every hour') || normalized.includes('каждый час')) return '1h'
  return '2h'
}

export const selectTodayAmount = (state: HydrationState) =>
  state.intake.filter((item) => item.createdAt.startsWith(todayKey())).reduce((sum, item) => sum + item.amount, 0)
