export const formatMl = (value: number, language: 'ru' | 'en' = 'ru') => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU').format(value)

export const formatLitres = (value: number, language: 'ru' | 'en' = 'ru') => {
  const litres = value / 1000
  return `${litres.toLocaleString(language === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 })} ${language === 'en' ? 'L' : 'Л'}`
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const todayKey = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}
