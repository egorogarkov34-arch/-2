# Aquora — Water Tracker

Готовый UI Telegram Mini App на React + TypeScript. Это не статичный макет: интерфейс содержит навигацию, сохранение состояния, добавление воды, смену цели, интерактивные графики и настройки профиля.

## Запуск

```bash
pnpm install
pnpm dev
```

Для production-сборки:

```bash
pnpm build
```

## Telegram

Приложение работает в браузере и автоматически активирует Telegram WebApp API, когда открыто внутри Telegram. Адаптер в `src/shared/lib/telegram.ts` включает `ready`, `expand`, fullscreen, safe-area через CSS, confirmation on close, haptics и синхронизацию записей с CloudStorage.

Для боевого запуска нужно разместить содержимое `dist/` на HTTPS-хостинге и указать URL в настройках вашего бота через BotFather.

## Структура

- `app` — запуск, Error Boundary и глобальные стили
- `pages` — лениво загружаемые Home, Statistics и Profile
- `widgets` — нижняя навигация
- `features` — bottom sheets добавления воды и изменения цели
- `entities/hydration` — типы, Zustand store, Progress Ring, SVG-силуэт
- `shared` — Telegram-адаптер, форматирование и общие UI-компоненты

## Примечания для backend-интеграции

Zustand Persist сейчас обеспечивает офлайн-first UX в `localStorage`, а новые записи также зеркалируются в Telegram CloudStorage. React Query уже обрабатывает асинхронный расчёт персональной рекомендации; по желанию задайте `VITE_WEATHER_API_URL` для эндпоинта, который возвращает `{ "temperature": 24 }`. Для серверной части валидируйте `initData` на backend и синхронизируйте журнал воды после авторизации.
