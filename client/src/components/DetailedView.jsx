import { X, Sunrise, Sunset, Droplets, Wind, Gauge, Eye } from "lucide-react";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import HourlyForcast from "./Charts/HourlyForcast";
import Forecast from "./Forcast";
import TempTrendChart from "./Charts/TembTrendChart";
import WindTrendChart from "./Charts/WindTrendChart";
// import { getTemperatureTrends } from "../utils/WeatherFormate";

const convertTemp = (temp, unit) =>
  unit === "fahrenheit" ? (temp * 9) / 5 + 32 : temp;

const DetailedView = ({ city, onClose, forecastdays, current, history }) => {
  const { unit } = useSelector((state) => state.weather);

  const icon = current?.condition?.icon;
  console.log("current ", current);
  const condition = current?.condition?.text;

  if (!forecastdays?.forecastday || !current) {
    console.log("Missing forecast or current data for:", city);
    return <div className="p-6 text-center text-gray-600">Loading data...</div>;
  }
  console.log("DetailedView forecastdays:", forecastdays);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen p-2 sm:p-4 flex items-center justify-center">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-2xl w-full max-w-6xl p-4 sm:p-6 md:p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-600 hover:text-gray-800"
          >
            <X size={24} />
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center mb-6 gap-2 sm:gap-4 text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {city}
            </h2>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 mb-6 shadow-lg">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center text-black">
              Current Weather
            </h2>
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start">
                <img
                  src={icon}
                  alt={condition}
                  className="w-12 h-12 sm:w-16 sm:h-16"
                />
                <div className="ml-4 sm:ml-6 text-center sm:text-left">
                  <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800">
                    {convertTemp(current.temp_c, unit).toFixed(1)}°
                    {unit === "celsius" ? "C" : "F"}
                  </div>
                  <div className="text-lg sm:text-xl text-gray-600">
                    {current.condition.text}
                  </div>
                  <div className="text-gray-500 text-sm sm:text-base">
                    Feels like {convertTemp(current.feelslike_c, unit)}°
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-black">
                <div className="text-center">
                  <Sunrise className="mx-auto mb-2 text-orange-500" />
                  <div className="text-xs sm:text-sm text-gray-600">
                    Sunrise
                  </div>
                  <div className="font-semibold text-sm sm:text-base">
                    {forecastdays.forecastday[0].astro.sunrise}
                  </div>
                </div>
                <div className="text-center">
                  <Sunset className="mx-auto mb-2 text-orange-600" />
                  <div className="text-xs sm:text-sm text-gray-600">Sunset</div>
                  <div className="font-semibold text-sm sm:text-base">
                    {forecastdays.forecastday[0].astro.sunset}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 text-black gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <Droplets className="mx-auto mb-2 text-blue-500" />
                <div className="text-xs sm:text-sm text-gray-600">Humidity</div>
                <div className="font-semibold text-sm sm:text-base">
                  {current?.humidity}%
                </div>
              </div>
              <div className="text-center">
                <Wind className="mx-auto mb-2 text-gray-500" />
                <div className="text-xs sm:text-sm text-gray-600">Wind</div>
                <div className="font-semibold text-sm sm:text-base">
                  {current.wind_kph} km/h
                </div>
              </div>
              <div className="text-center">
                <img src="/uv.png" alt="" className="mx-auto mb-2 w-6 h-6" />{" "}
                <div className="text-xs sm:text-sm text-gray-600">Wind</div>
                <div className="font-semibold text-sm sm:text-base">
                  {current.wind_kph} km/h
                </div>
              </div>
              <div className="text-center">
                <img src="/air-quality.png" alt="" className="mx-auto mb-2 w-6 h-6" />{" "}
                <div className="text-xs sm:text-sm text-gray-600">Wind</div>
                <div className="font-semibold text-sm sm:text-base">
                  {current.wind_kph} km/h
                </div>
              </div>
              <div className="text-center">
                <Gauge className="mx-auto mb-2 text-purple-500" />
                <div className="text-xs sm:text-sm text-gray-600">Pressure</div>
                <div className="font-semibold text-sm sm:text-base">
                  {current.pressure_mb} hPa
                </div>
              </div>
              <div className="text-center">
                <Eye className="mx-auto mb-2 text-teal-500" />
                <div className="text-xs sm:text-sm text-gray-600">
                  Visibility
                </div>
                <div className="font-semibold text-sm sm:text-base">
                  {current.vis_km} km
                </div>
              </div>
            </div>
          </div>
          {/*  7-Day Forecast */}
          <Forecast forecastdays={forecastdays} unit={unit} />

          <div className="mt-6">
            <HourlyForcast forecastdays={forecastdays} unit={unit} />
          </div>
          {/*  WindTrendChart  */}
          <div className="mt-6">
            <WindTrendChart forecastdays={forecastdays} unit={unit} />
          </div>
          {/*  Temperature Trends */}
          <div className="mt-6">
            <TempTrendChart historyData={historyData} unit={unit} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedView;
