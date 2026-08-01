export type ActivityLevel = 'low' | 'moderate' | 'high'
export type Gender = 'male' | 'female' | 'other'

export interface IntakeEntry {
  id: string
  amount: number
  createdAt: string
}

export interface Profile {
  name: string
  age: number
  gender: Gender
  height: number
  weight: number
  activity: ActivityLevel
  reminders: boolean
  reminderInterval: string
  units: 'ml' | 'oz'
  language: 'ru' | 'en'
  theme: 'dark' | 'light'
}

export interface HydrationState {
  activeTab: 'home' | 'stats' | 'profile'
  goal: number
  intake: IntakeEntry[]
  profile: Profile
  setActiveTab: (tab: HydrationState['activeTab']) => void
  addWater: (amount: number) => void
  setGoal: (goal: number) => void
  updateProfile: (profile: Partial<Profile>) => void
}
