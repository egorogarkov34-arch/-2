export interface WeatherSnapshot { temperatureC: number | null }

/**
 * Optional adapter: set VITE_WEATHER_API_URL to an endpoint returning
 * `{ "temperature": 24 }`. Absence or failure never blocks water tracking.
 */
export async function getLocalWeather(): Promise<WeatherSnapshot> {
  const endpoint = import.meta.env.VITE_WEATHER_API_URL as string | undefined
  if (!endpoint) return { temperatureC: null }
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } })
    if (!response.ok) return { temperatureC: null }
    const payload: unknown = await response.json()
    if (!isTemperatureResponse(payload)) return { temperatureC: null }
    return { temperatureC: payload.temperature }
  } catch {
    return { temperatureC: null }
  }
}

function isTemperatureResponse(value: unknown): value is { temperature: number } {
  if (typeof value !== 'object' || value === null || !('temperature' in value)) return false
  return typeof value.temperature === 'number' && Number.isFinite(value.temperature)
}
