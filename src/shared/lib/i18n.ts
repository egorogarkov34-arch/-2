import { useHydrationStore } from '@/entities/hydration/model/store'
import { useCallback } from 'react'

const copy = {
  ru: {
    wardrobe: '\u0413\u0430\u0440\u0434\u0435\u0440\u043e\u0431', chooseSkin: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0438\u043b\u0443\u044d\u0442', maleClassic: '\u041c\u0443\u0436\u0441\u043a\u043e\u0439 \u00b7 \u043a\u043b\u0430\u0441\u0441\u0438\u043a\u0430', femaleClassic: '\u0416\u0435\u043d\u0441\u043a\u0438\u0439 \u00b7 \u043a\u043b\u0430\u0441\u0441\u0438\u043a\u0430', maleAthlete: '\u041c\u0443\u0436\u0441\u043a\u043e\u0439 \u00b7 \u0430\u0442\u043b\u0435\u0442', moodSad: '\u041c\u043d\u0435 \u0433\u0440\u0443\u0441\u0442\u043d\u043e \u0431\u0435\u0437 \u0432\u043e\u0434\u044b', moodCalm: '\u041f\u0430\u0440\u0430 \u0433\u043b\u043e\u0442\u043a\u043e\u0432 \u2014 \u0438 \u0441\u0442\u0430\u043d\u0435\u0442 \u043b\u0443\u0447\u0448\u0435', moodHappy: '\u041c\u043d\u0435 \u0443\u0436\u0435 \u0445\u043e\u0440\u043e\u0448\u043e!', moodJoy: '\u042f \u0432 \u043e\u0442\u043b\u0438\u0447\u043d\u043e\u0439 \u0444\u043e\u0440\u043c\u0435!',
    home: 'Главная', stats: 'Статистика', profile: 'Профиль', navigation: 'Основная навигация',
    greeting: 'Привет', today: 'Сегодня', refresh: 'Обновляем', pullToRefresh: 'Потяните, чтобы обновить',
    notifications: 'Уведомления', progress: 'Прогресс за сегодня', todayBalance: 'Сегодняшний баланс',
    of: 'из', remaining: 'Осталось', goalReached: 'Цель достигнута', goal: 'Цель',
    addWater: 'Добавить воду', createEntry: 'Сделать запись', history: 'История выпитой воды',
    recentEntries: 'Последние записи', all: 'Все', firstEntry: 'Первая запись уже ждёт вас.',
    added: 'добавлено', delete: 'Удалить', entries: 'Записи воды', noEntries: 'Записей пока нет',
    noEntriesHint: 'Добавьте воду — первая запись появится здесь.', close: 'Закрыть', millilitres: 'мл', litres: 'Л', deleteAll: 'Удалить все',
    confirmDeleteAll: 'Удалить все записи?', confirmDeleteAllHint: 'Эту операцию нельзя отменить.', yes: 'Да', no: 'Нет',
    quickEntry: 'Быстрая запись', customAmount: 'Своё количество', personalGoal: 'Персональная норма',
    dailyGoal: 'Цель на день', goalHint: 'Рекомендуемая цель рассчитана по вашим параметрам и активности.',
    saveGoal: 'Сохранить цель', yourRhythm: 'Ваш ритм', average: 'в среднем', goalPercent: 'цели',
    streak: 'Серия', day: 'день', days: 'дней', personalRecord: 'Личный рекорд', trend: 'Тренд за 7 дней',
    waterBalance: 'Ваш водный баланс', bestWeekDay: 'Лучший день недели', dataUpdates: 'Данные обновляются после каждой записи',
    addFirstRecord: 'Добавьте первую запись воды', heatmap: 'Тепловая карта недели',
    personalSpace: 'Личное пространство', personalPlan: 'Персональный план', perDay: 'в день', recommendation: 'Рекомендация', personalPlanHint: 'Расчёт учитывает ваши данные и обновляется автоматически.', goalSummaryHint: 'Количество рассчитывается автоматически. Изменить это значение можно с помощью кнопки «Цель» ниже.',
    personalData: 'Личные данные', name: 'Имя', gender: 'Пол', age: 'Возраст', weight: 'Вес', height: 'Рост',
    male: 'Мужской', female: 'Женский', other: 'Другой', years: 'лет', goalAndActivity: 'Цель и активность',
    activity: 'Уровень активности', low: 'Низкий', moderate: 'Средний', high: 'Высокий', settings: 'Настройки',
    darkTheme: 'Тёмная тема', enabled: 'Включена',
    disabled: 'Выключена', language: 'Язык', russian: 'Русский', privacy: 'Политика конфиденциальности', support: 'Поддержка',
    about: 'О приложении', version: 'версия', editProfile: 'Редактировать профиль', enterName: 'Введите имя',
    activityLevel: 'Уровень активности', saveChanges: 'Сохранить изменения', reload: 'Перезагрузить', errorTitle: 'Что-то пошло не так',
    errorHint: 'Попробуйте перезапустить приложение.', todayTab: 'Сегодня', week: 'Неделя', month: 'Месяц', year: 'Год'
  },
  en: {
    wardrobe: 'Wardrobe', chooseSkin: 'Choose a silhouette', maleClassic: 'Male · classic', femaleClassic: 'Female · classic', maleAthlete: 'Male · athlete', moodSad: 'I feel sad without water', moodCalm: 'A few sips will help', moodHappy: 'I feel good already!', moodJoy: 'I feel amazing!',
    home: 'Home', stats: 'Insights', profile: 'Profile', navigation: 'Primary navigation',
    greeting: 'Hello', today: 'Today', refresh: 'Refreshing', pullToRefresh: 'Pull to refresh',
    notifications: 'Notifications', progress: 'Today’s progress', todayBalance: 'Today’s balance',
    of: 'of', remaining: 'Remaining', goalReached: 'Goal reached', goal: 'Goal',
    addWater: 'Add water', createEntry: 'Log intake', history: 'Water history',
    recentEntries: 'Recent entries', all: 'All', firstEntry: 'Your first entry is waiting.',
    added: 'added', delete: 'Delete', entries: 'Water entries', noEntries: 'No entries yet',
    noEntriesHint: 'Add water and your first entry will appear here.', close: 'Close', millilitres: 'ml', litres: 'L', deleteAll: 'Delete all',
    confirmDeleteAll: 'Delete all entries?', confirmDeleteAllHint: 'This cannot be undone.', yes: 'Yes', no: 'No',
    quickEntry: 'Quick entry', customAmount: 'Custom amount', personalGoal: 'Personal target',
    dailyGoal: 'Daily goal', goalHint: 'Your recommended target is calculated from your profile and activity.',
    saveGoal: 'Save goal', yourRhythm: 'Your rhythm', average: 'average', goalPercent: 'of goal',
    streak: 'Streak', day: 'day', days: 'days', personalRecord: 'Personal record', trend: '7-day trend',
    waterBalance: 'Your water balance', bestWeekDay: 'Best day this week', dataUpdates: 'Data updates after every entry',
    addFirstRecord: 'Add your first water entry', heatmap: 'Weekly heat map',
    personalSpace: 'Personal space', personalPlan: 'Personal plan', perDay: 'per day', recommendation: 'Recommendation', personalPlanHint: 'Calculated from your profile and updates automatically.', goalSummaryHint: 'Your target is calculated automatically. You can change it with the Goal button below.',
    personalData: 'Personal details', name: 'Name', gender: 'Gender', age: 'Age', weight: 'Weight', height: 'Height',
    male: 'Male', female: 'Female', other: 'Other', years: 'years', goalAndActivity: 'Goal & activity',
    activity: 'Activity level', low: 'Low', moderate: 'Moderate', high: 'High', settings: 'Settings',
    darkTheme: 'Dark theme', enabled: 'On',
    disabled: 'Off', language: 'Language', russian: 'Russian', privacy: 'Privacy policy', support: 'Support',
    about: 'About the app', version: 'version', editProfile: 'Edit profile', enterName: 'Enter a name',
    activityLevel: 'Activity level', saveChanges: 'Save changes', reload: 'Reload', errorTitle: 'Something went wrong',
    errorHint: 'Try restarting the app.', todayTab: 'Today', week: 'Week', month: 'Month', year: 'Year'
  }
} as const

export type TranslationKey = keyof typeof copy.ru

export function useTranslation() {
  const language = useHydrationStore((state) => state.profile.language)
  const t = useCallback((key: TranslationKey) => copy[language][key], [language])
  return { language, t }
}
