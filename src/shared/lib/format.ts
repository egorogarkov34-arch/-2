export const formatMl = (value: number) => new Intl.NumberFormat('ru-RU').format(value)

export const formatLitres = (value: number) => {
  const litres = value / 1000
  return `${litres.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} л`
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const todayKey = () => new Date().toISOString().slice(0, 10)
