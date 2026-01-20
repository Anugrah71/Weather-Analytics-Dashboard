import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  getCurrentWeather,
  getForecast,
  searchCities,
  getHistory,
} from "../../api/weather";

export const fetchWeather = createAsyncThunk(
  "weather/fetchWeather",
  async (city) => {
    const data = await getCurrentWeather(city);
    return data;
  }
);
export const fetchForecast = createAsyncThunk(
  "weather/fetchForecast",
  async (city) => {
    const data = await getForecast(city);
    return data;
  }
);
export const fetchWeatherHistory = createAsyncThunk(
  "weather/fetchWeatherHistory",
  async (city) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const formatted = date.toISOString().split("T")[0];

      const data = await getHistory(city, formatted);
      const forecastDay = data?.forecast?.forecastday?.[0];

      if (forecastDay?.day) {
        days.push({
          date: formatted,
          max: forecastDay.day.maxtemp_c,
          min: forecastDay.day.mintemp_c,
        });
      }
    }
    return { city, history: days.reverse() };
  }
);

export const fetchSearchResults = createAsyncThunk(
  "weather/fetchSearchResults",
  async (citySearch) => {
    const res = await searchCities(citySearch);
    return res;
  }
);
