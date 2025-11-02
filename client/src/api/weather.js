export const getCurrentWeather = async (city) => {
  const res = await fetch(`/api/weather/current?q=${city}`)
  if (!res.ok) throw new Error('Failed to fetch current weather')
  return res.json()
}

export const getForecast = async (city, days = 7) => {
  const res = await fetch(`/api/weather/forecast?q=${city}&days=${days}`)
  if (!res.ok) throw new Error('Failed to fetch forecast')
  return res.json()
}

export const getHistory = async (city, date) => {
  const res = await fetch(`/api/weather/history?q=${city}&date=${date}`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export const searchCities = async (query) => {
  const res = await fetch(`/api/weather/search?q=${query}`)
  if (!res.ok) throw new Error('Failed to fetch search results')
  return res.json()
}
