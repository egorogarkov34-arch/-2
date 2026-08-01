export type ActivityLevel = 'low' | 'moderate' | 'high'
export type Gender = 'male' | 'female' | 'other'
export type ReminderInterval = '30m' | '1h' | '2h' | '3h'

export interface IntakeEntry {
  id: string
  amount: number
  createdAt: string
}

export interface StoredUserState {
  profile: Profile
  goal: number
  goalMode: 'auto' | 'custom'
}

export interface Profile {
  name: string
  age: number
  gender: Gender
  height: number
  weight: number
  activity: ActivityLevel
  reminders: boolean
  reminderInterval: ReminderInterval
  units: 'ml' | 'oz'
  language: 'ru' | 'en'
  theme: 'dark' | 'light'
}

export interface HydrationState {
  activeTab: 'home' | 'stats' | 'profile'
  goal: number
  goalMode: 'auto' | 'custom'
  intake: IntakeEntry[]
  profile: Profile
  setActiveTab: (tab: HydrationState['activeTab']) => void
  addWater: (amount: number) => void
  removeWater: (id: string) => void
  clearWater: () => void
  clearTodayWater: () => void
  setGoal: (goal: number) => void
  setAutomaticGoal: (goal: number) => void
  updateProfile: (profile: Partial<Profile>) => void
  restoreUserState: (state: Partial<StoredUserState>) => void
}
