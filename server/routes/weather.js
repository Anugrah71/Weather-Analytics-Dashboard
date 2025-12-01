const express = require("express");
const { getCache, setCache } = require("../utils/cache");

const router = express.Router();

const getWeatherCondition = (code) => {
  const map = {
    0: { text: "Clear sky", icon: "113.png" },
    1: { text: "Mainly clear", icon: "116.png" },
    2: { text: "Partly cloudy", icon: "116.png" },
    3: { text: "Overcast", icon: "122.png" },
    45: { text: "Fog", icon: "143.png" },
    48: { text: "Depositing rime fog", icon: "143.png" },
    51: { text: "Light drizzle", icon: "266.png" },
    53: { text: "Moderate drizzle", icon: "266.png" },
    55: { text: "Dense drizzle", icon: "266.png" },
    61: { text: "Slight rain", icon: "296.png" },
    63: { text: "Moderate rain", icon: "302.png" },
    65: { text: "Heavy rain", icon: "308.png" },
    71: { text: "Slight snow", icon: "326.png" },
    73: { text: "Moderate snow", icon: "332.png" },
    75: { text: "Heavy snow", icon: "338.png" },
    95: { text: "Thunderstorm", icon: "386.png" },
  };

  const condition = map[code] || { text: "Weather", icon: "116.png" };

  return {
    text: condition.text,
    icon: `//cdn.weatherapi.com/weather/64x64/day/${condition.icon}`,
  };
};
//  Current weather
router.get("/current", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing city name" });

    const cacheKey = `current_${q}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ source: "cache", ...cached });

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    if (!geoData.results)
      return res.status(404).json({ error: "City not found" });
    const { latitude, longitude, name, country } = geoData.results[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl,visibility&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    const formattedData = {
      location: { name, country },
      current: {
        temp_c: data.current.temperature_2m,
        condition: getWeatherCondition(data.current.weather_code),
        wind_kph: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        pressure_mb: data.current.pressure_msl,
        vis_km: data.current.visibility / 1000,
      },
    };

    setCache(cacheKey, formattedData);
    res.json({ source: "api", ...formattedData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Forecast (7 days + hourly)
router.get("/forecast", async (req, res) => {
  try {
    const { q, days = 7 } = req.query;

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }
    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,sunrise,sunset,precipitation_probability_max,uv_index_max&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=${days}&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    const data = await weatherRes.json();

    if (data.error) {
      throw new Error(`Open-Meteo API Error: ${data.reason}`);
    }

    const formattedData = {
      location: { name, country },
      current: {
        temp_c: data.current.temperature_2m,
        condition: getWeatherCondition(data.current.weather_code),
        wind_kph: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        pressure_mb: data.current.pressure_msl,
        vis_km: data.current.visibility / 1000,
        feelslike_c: data.current.temperature_2m,
        uv: data.daily.uv_index_max[0],
      },
      forecast: {
        forecastday: data.daily.time.map((date, i) => ({
          date: date,
          day: {
            maxtemp_c: data.daily.temperature_2m_max[i],
            mintemp_c: data.daily.temperature_2m_min[i],
            maxwind_kph: data.daily.wind_speed_10m_max[i],
            condition: getWeatherCondition(data.daily.weather_code[i]),
            daily_chance_of_rain:
              data.daily.precipitation_probability_max[i] || 0,
          },
          astro: {
            sunrise: data.daily.sunrise[i].split("T")[1],
            sunset: data.daily.sunset[i].split("T")[1],
          },
          hour: data.hourly.time
            .map((time, hIndex) => ({
              time: time.replace("T", " "),
              temp_c: data.hourly.temperature_2m[hIndex],
              chance_of_rain: data.hourly.precipitation_probability[hIndex],
              condition: getWeatherCondition(data.hourly.weather_code[hIndex]),
            }))
            .filter((h) => h.time.startsWith(date)),
        })),
      },
    };

    res.json({ source: "api", ...formattedData });
  } catch (err) {
    console.error("Forecast Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//  Historical Data
router.get("/history", async (req, res) => {
  try {
    const { q, date } = req.query;
    if (!q || !date)
      return res.status(400).json({ error: "Missing city name or date" });

    const cacheKey = `history_${q}_${date}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ source: "cache", ...cached });

    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${q}&dt=${date}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    setCache(cacheKey, data);
    res.json({ source: "api", ...data });
  } catch (err) {
    console.error("History error:", err);
    res
      .status(500)
      .json({ error: "Server error fetching history", details: err.message });
  }
});

// Search / Autocomplete
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing query" });

    const cacheKey = `search_${q}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ source: "cache", ...cached });

    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${q}`;
    console.log("Fetching search:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    setCache(cacheKey, data);
    res.json({ source: "api", results: data });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      error: "Server error fetching search results",
      details: err.message,
    });
  }
});

module.exports = router;
