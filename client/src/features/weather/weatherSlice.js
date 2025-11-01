import { createSlice } from "@reduxjs/toolkit";
import { fetchWeather, fetchForecast } from "./weatherThunks";

const weatherSlice = createSlice({
  name: "weather",
  initialState: {
    cities: [],
    favorites: [],
    unit: "celsius",
    status: "idle",
    error: null,
  },
  reducers: {
    toggleUnit: (state) => {
      state.unit = state.unit === "celsius" ? "fahrenheit" : "celsius";
    },
    addFavorite: (state, action) => {
      if (!state.favorites.includes(action.payload))
        state.favorites.push(action.payload);
    },
    removeFavorite: (state, action) => {
      state.favorites = state.favorites.filter(
        (city) => city !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeather.pending, (state) => {
        state.state = "loading";
      })
      .addCase(fetchWeather.fulfilled, (state, action) => {
        state.status = "succeeded";
        const city = action.payload.location.name;
        const existing = state.cities.find((c) => c.name == city);
        if (existing) existing.data = action.payload;
        else state.cities.push({ name: city, data: action.payload });
      })
      .addCase(fetchWeather.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      });
  },
});

export const { toggleUnit, addFavorite, removeFavorite } = weatherSlice.actions;
export default weatherSlice.reducer;
