export type AdminRole = 'owner' | 'admin'

export type UserActivity = 'low' | 'moderate' | 'high'
export type UserGender = 'male' | 'female' | 'other'

export interface DashboardUser {
  id: number
  name: string
  language: 'ru' | 'en'
  activity: UserActivity
  goal: number
  todayAmount: number
  progress: number
  remindersEnabled: boolean
  blocked: boolean
  updatedAt: number
  joinedAt: number
  lastReminderAt: number | null
}

export interface UserProfileSnapshot {
  name: string
  age: number
  gender: UserGender
  height: number
  weight: number
  activity: UserActivity
}

export interface DailyHydrationPoint {
  dateKey: string
  amount: number
  goal: number
}

export interface UserDetails extends DashboardUser {
  manualStreak: number | null
  profile: UserProfileSnapshot | null
  reminders: { enabled: boolean; intervalMinutes: number; timeZone: string } | null
  stats: {
    totalAmount: number
    averageDailyAmount: number
    activeDays: number
    goalDays: number
    bestAmount: number
    bestDateKey: string | null
    lastActiveDateKey: string | null
    dailyHistory: DailyHydrationPoint[]
  }
}

export interface DashboardAdmin { id: number; role: AdminRole; name: string }
export interface AllowedUser { id: number; name: string; addedAt: number }
export interface PremiumEmoji { id: string; addedAt: number }

export interface DashboardData {
  ok: true
  role: AdminRole
  generatedAt: number
  metrics: {
    totalUsers: number
    activeToday: number
    activeWeek: number
    remindersEnabled: number
    goalsReachedToday: number
    totalTodayAmount: number
    averageTodayAmount: number
    averageGoal: number
    trackedTotalAmount: number
    trackedDays: number
    goalCompletionRate: number
    blockedUsers: number
  }
  users: DashboardUser[]
  admins: DashboardAdmin[]
  premiumEmojis: PremiumEmoji[]
  access: {
    mode: 'open' | 'private'
    allowedUsers: AllowedUser[]
  }
}
