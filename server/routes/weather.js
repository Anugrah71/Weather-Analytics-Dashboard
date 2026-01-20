const express = require("express");
const { getCache, setCache } = require("../utils/cache");
const axios = require("axios");
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
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "Missing city name" });
  const cacheKey = `current_${city.toLocaleLowerCase()}`;

  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log(`current cache hit: ${city}`);
      return res.json(cachedData);
    }
    console.log("Current weather Chache miss: Fetching form weatherapi");
    console.log(city);
    const geolocationData = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search`,
      { params: { name: city, count: 1 } },
    );
    // console.log(geolocationData.data)
    if (!geolocationData.data.results)
      return res.status(404).json({ error: "City not found" });
    const { latitude, longitude, name, country } =
      geolocationData.data.results[0];
    // console.log("resule are here", latitude, longitude, country, name);
    const responseData = await axios.get(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          current:
            "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,pressure_msl,visibility",
          timezone: "auto",
        },
      },
    );
    const data = responseData.data;

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
    // console.log("formattedData",formattedData);

    await setCache(cacheKey, formattedData);
    res.json({ source: "api", ...formattedData });
  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//  Forecast (7 days + hourly)
router.get("/forecast", async (req, res) => {
  try {
    const { city, days = 7 } = req.query;
    const cacheKey = `forecast_${city.toLowerCase()}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      console.log(`Forecast cache hit:${city}`);
      return res.json(cachedData);
    }
    console.log(`Forecast cache miss: Fetching ${city}`);
    const geolocationData = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search`,
      { params: { name: city, count: 1 } },
    );
    const forecastData = geolocationData.data;

    if (!forecastData.results) {
      return res.status(404).json({ error: "City not found" });
    }
    const { latitude, longitude, name, country } = forecastData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,sunrise,sunset,precipitation_probability_max,uv_index_max&hourly=temperature_2m,precipitation_probability,weather_code&forecast_days=${days}&timezone=auto`;
    const weatherRes = await axios.get(weatherUrl);
    const data = weatherRes.data;

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
    await setCache(cacheKey, formattedData);
    res.json({ source: "api", ...formattedData });
  } catch (err) {
    console.error("Forecast Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//  Historical Data
router.get("/history", async (req, res) => {
  try {
    const { city, date } = req.query;
    if (!city || !date)
      return res.status(400).json({ error: "Missing city name or date" });

    const cacheKey = `history_${city.toLocaleLowerCase()}`;
    const cached = await getCache(cacheKey);
    // console.log("hisote",cached)
    if (cached) {
      console.log(`History cache hit: ${city}`);
      return res.json({ source: "cache", ...cached });
    }
    console.log(`History cache miss: fetching from weatherapi`);

    const apiKey = process.env.WEATHER_API_KEY;

    const weatherRes = await axios.get(
      `https://api.weatherapi.com/v1/history.json`,
      {
        params: {
          key: apiKey,
          q: city,
          dt: date,
        },
      },
    );
    const data = weatherRes.data;

    await setCache(cacheKey, data);
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
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "Missing query" });

    const cacheKey = `search_${city.toLocaleLowerCase().trim()}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Search Cache Hit: ${city}`);
      return res.json({ source: "cache", results: cached });
    }
    console.log(`Search Cache Miss: Fetching`);
    const apiKey = process.env.WEATHER_API_KEY;
    const searchRes = await axios.get(
      `https://api.weatherapi.com/v1/search.json`,
      {
        params: { key: apiKey, q: city },
      },
    );
    const data = await searchRes.data;

    await setCache(cacheKey, data, 86400);
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
