import { useHydrationStore } from '@/entities/hydration/model/store'
import { useCallback } from 'react'

const copy = {
  ru: {
    home: 'Главная', stats: 'Статистика', profile: 'Профиль', navigation: 'Основная навигация',
    greeting: 'Привет', today: 'Сегодня', refresh: 'Обновляем', pullToRefresh: 'Потяните, чтобы обновить',
    notifications: 'Уведомления', progress: 'Прогресс за сегодня', todayBalance: 'Сегодняшний баланс',
    of: 'из', remaining: 'Осталось', goalReached: 'Цель достигнута', goal: 'Цель',
    addWater: 'Добавить воду', createEntry: 'Сделать запись', history: 'История выпитой воды',
    recentEntries: 'Последние записи', all: 'Все', firstEntry: 'Первая запись уже ждёт вас.',
    added: 'добавлено', delete: 'Удалить', entries: 'Записи воды', noEntries: 'Записей пока нет',
    noEntriesHint: 'Добавьте воду — первая запись появится здесь.', close: 'Закрыть', deleteAll: 'Удалить все',
    confirmDeleteAll: 'Удалить все записи?', confirmDeleteAllHint: 'Эту операцию нельзя отменить.', yes: 'Да', no: 'Нет',
    quickEntry: 'Быстрая запись', customAmount: 'Своё количество', personalGoal: 'Персональная норма',
    dailyGoal: 'Цель на день', goalHint: 'Рекомендуемая цель рассчитана по вашим параметрам и активности.',
    saveGoal: 'Сохранить цель', yourRhythm: 'Ваш ритм', average: 'в среднем', goalPercent: 'цели',
    streak: 'Серия', day: 'день', days: 'дней', personalRecord: 'Личный рекорд', trend: 'Тренд за 7 дней',
    waterBalance: 'Ваш водный баланс', bestWeekDay: 'Лучший день недели', dataUpdates: 'Данные обновляются после каждой записи',
    addFirstRecord: 'Добавьте первую запись воды', heatmap: 'Тепловая карта недели',
    personalSpace: 'Личное пространство', personalPlan: 'Персональный план', perDay: 'в день', recommendation: 'Рекомендация', personalPlanHint: 'Расчёт учитывает ваши данные и обновляется автоматически.',
    personalData: 'Личные данные', name: 'Имя', gender: 'Пол', age: 'Возраст', weight: 'Вес', height: 'Рост',
    male: 'Мужской', female: 'Женский', other: 'Другой', years: 'лет', goalAndActivity: 'Цель и активность',
    activity: 'Уровень активности', low: 'Низкий', moderate: 'Средний', high: 'Высокий', settings: 'Настройки',
    reminders: 'Напоминания', notificationFrequency: 'Частота уведомлений', every30Minutes: 'Каждые 30 минут', everyHour: 'Каждый час', every2Hours: 'Каждые 2 часа', every3Hours: 'Каждые 3 часа', darkTheme: 'Тёмная тема', enabled: 'Включена',
    disabled: 'Выключена', language: 'Язык', russian: 'Русский', privacy: 'Политика конфиденциальности', support: 'Поддержка',
    about: 'О приложении', version: 'версия', editProfile: 'Редактировать профиль', enterName: 'Введите имя',
    activityLevel: 'Уровень активности', saveChanges: 'Сохранить изменения', reload: 'Перезагрузить', errorTitle: 'Что-то пошло не так',
    errorHint: 'Попробуйте перезапустить приложение.', todayTab: 'Сегодня', week: 'Неделя', month: 'Месяц', year: 'Год'
  },
  en: {
    home: 'Home', stats: 'Insights', profile: 'Profile', navigation: 'Primary navigation',
    greeting: 'Hello', today: 'Today', refresh: 'Refreshing', pullToRefresh: 'Pull to refresh',
    notifications: 'Notifications', progress: 'Today’s progress', todayBalance: 'Today’s balance',
    of: 'of', remaining: 'Remaining', goalReached: 'Goal reached', goal: 'Goal',
    addWater: 'Add water', createEntry: 'Log intake', history: 'Water history',
    recentEntries: 'Recent entries', all: 'All', firstEntry: 'Your first entry is waiting.',
    added: 'added', delete: 'Delete', entries: 'Water entries', noEntries: 'No entries yet',
    noEntriesHint: 'Add water and your first entry will appear here.', close: 'Close', deleteAll: 'Delete all',
    confirmDeleteAll: 'Delete all entries?', confirmDeleteAllHint: 'This cannot be undone.', yes: 'Yes', no: 'No',
    quickEntry: 'Quick entry', customAmount: 'Custom amount', personalGoal: 'Personal target',
    dailyGoal: 'Daily goal', goalHint: 'Your recommended target is calculated from your profile and activity.',
    saveGoal: 'Save goal', yourRhythm: 'Your rhythm', average: 'average', goalPercent: 'of goal',
    streak: 'Streak', day: 'day', days: 'days', personalRecord: 'Personal record', trend: '7-day trend',
    waterBalance: 'Your water balance', bestWeekDay: 'Best day this week', dataUpdates: 'Data updates after every entry',
    addFirstRecord: 'Add your first water entry', heatmap: 'Weekly heat map',
    personalSpace: 'Personal space', personalPlan: 'Personal plan', perDay: 'per day', recommendation: 'Recommendation', personalPlanHint: 'Calculated from your profile and updates automatically.',
    personalData: 'Personal details', name: 'Name', gender: 'Gender', age: 'Age', weight: 'Weight', height: 'Height',
    male: 'Male', female: 'Female', other: 'Other', years: 'years', goalAndActivity: 'Goal & activity',
    activity: 'Activity level', low: 'Low', moderate: 'Moderate', high: 'High', settings: 'Settings',
    reminders: 'Reminders', notificationFrequency: 'Reminder frequency', every30Minutes: 'Every 30 minutes', everyHour: 'Every hour', every2Hours: 'Every 2 hours', every3Hours: 'Every 3 hours', darkTheme: 'Dark theme', enabled: 'On',
    disabled: 'Off', language: 'Language', russian: 'Russian', privacy: 'Privacy policy', support: 'Support',
    about: 'About the app', version: 'version', editProfile: 'Edit profile', enterName: 'Enter a name',
    activityLevel: 'Activity level', saveChanges: 'Save changes', reload: 'Reload', errorTitle: 'Something went wrong',
    errorHint: 'Try restarting the app.', todayTab: 'Today', week: 'Week', month: 'Month', year: 'Year'
  }
} as const

export type TranslationKey = keyof typeof copy.ru

type ReminderIntervalKey = 'every30Minutes' | 'everyHour' | 'every2Hours' | 'every3Hours'

export function reminderIntervalKey(value: string): ReminderIntervalKey {
  if (value === '30m' || value.includes('30')) return 'every30Minutes'
  if (value === '1h' || value.includes('Every hour') || value.includes('Каждый час')) return 'everyHour'
  if (value === '3h' || value.includes('3')) return 'every3Hours'
  return 'every2Hours'
}

export function useTranslation() {
  const language = useHydrationStore((state) => state.profile.language)
  const t = useCallback((key: TranslationKey) => copy[language][key], [language])
  return { language, t }
}
