export type ActivityLevel = 'low' | 'moderate' | 'high'
export type Gender = 'male' | 'female' | 'other'
export type BodySkin = 'male-classic' | 'female-classic' | 'male-athlete'
export type ReminderInterval = 30 | 60 | 120 | 180

export interface ReminderSettings {
  enabled: boolean
  intervalMinutes: ReminderInterval
  timeZone: string
}

export interface IntakeEntry {
  id: string
  amount: number
  createdAt: string
  beverage?: BeverageEntryDetails
}

/** Product data saved with a scanned drink. Nutrition values refer to one logged serving. */
export interface BeverageEntryDetails {
  productName: string
  brand?: string
  barcode?: string
  imageUrl?: string
  nutrition: BeverageNutrition
}

export interface BeverageNutrition {
  caloriesKcal?: number
  sugarsG?: number
  saltG?: number
  sodiumMg?: number
  caffeineMg?: number
}

export interface StoredUserState {
  profile: Profile
  goal: number
  goalMode: 'auto' | 'custom'
  dayGoals?: Record<string, number>
  /** A one-time correction set by the bot owner. Null keeps the regular calculation. */
  manualStreak?: number | null
  manualStreakAnchorDateKey?: string | null
}

export interface Profile {
  name: string
  age: number
  gender: Gender
  height: number
  weight: number
  activity: ActivityLevel
  units: 'ml' | 'oz'
  language: 'ru' | 'en'
  skin: BodySkin
  reminders: ReminderSettings
}

export interface HydrationState {
  activeTab: 'home' | 'stats' | 'profile'
  goal: number
  goalMode: 'auto' | 'custom'
  intake: IntakeEntry[]
  dayGoals: Record<string, number>
  manualStreak: number | null
  manualStreakAnchorDateKey: string | null
  profile: Profile
  setActiveTab: (tab: HydrationState['activeTab']) => void
  addWater: (amount: number) => void
  addBeverage: (amount: number, beverage: BeverageEntryDetails) => void
  removeWater: (id: string) => void
  clearWater: () => void
  clearTodayWater: () => void
  setGoal: (goal: number) => void
  setAutomaticGoal: (goal: number) => void
  setManualStreak: (value: number | null, anchorDateKey: string | null) => void
  updateProfile: (profile: Partial<Profile>) => void
  restoreUserState: (state: Partial<StoredUserState>) => void
}
