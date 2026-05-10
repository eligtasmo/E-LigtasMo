
// Open-Meteo API Service
// Free Weather API for non-commercial use
// Docs: https://open-meteo.com/

import AsyncStorage from '@react-native-async-storage/async-storage';
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export const fetchWeatherForecast = async (latitude, longitude) => {
  try {
    const params = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,surface_pressure,visibility',
      hourly: 'temperature_2m,precipitation_probability,weather_code',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max',
      forecast_days: 10,
      timezone: 'auto'
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) throw new Error('Weather data fetch failed');
    const weatherData = await response.json();

    // Fetch Air Quality in parallel
    const aqParams = new URLSearchParams({
      latitude: latitude,
      longitude: longitude,
      current: 'us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
      timezone: 'auto'
    });
    
    let aqData = null;
    try {
      const aqRes = await fetch(`${AIR_QUALITY_URL}?${aqParams.toString()}`);
      if (aqRes.ok) aqData = await aqRes.json();
    } catch (e) {}

    const combinedData = { ...weatherData, air_quality: aqData };
    const key = `weather:${latitude},${longitude}`;
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ data: combinedData, timestamp: Date.now() }));
    } catch {}
    return combinedData;
  } catch (error) {
    const key = `weather:${latitude},${longitude}`;
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.data;
      }
    } catch {}
    return null;
  }
};

export const getWeatherDescription = (code) => {
  // WMO Weather interpretation codes (WW)
  const codes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light Drizzle',
    53: 'Moderate Drizzle',
    55: 'Dense Drizzle',
    61: 'Slight Rain',
    63: 'Moderate Rain',
    65: 'Heavy Rain',
    80: 'Slight Rain Showers',
    81: 'Moderate Rain Showers',
    82: 'Violent Rain Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return codes[code] || 'Unknown';
};
