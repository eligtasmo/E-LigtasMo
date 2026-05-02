import React, { useState, useEffect } from 'react';
import PageMeta from "../components/common/PageMeta";
import { 
  FaCloudSun, 
  FaCloud, 
  FaSun, 
  FaCloudRain, 
  FaSnowflake, 
  FaBolt, 
  FaEye, 
  FaTint, 
  FaWind, 
  FaThermometerHalf, 
  FaLocationArrow, 
  FaExclamationTriangle,
  FaSyncAlt,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
  };
  daily: Array<{
    dt: number;
    temp: {
      min: number;
      max: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number; // Probability of precipitation
  }>;
  alerts?: Array<{
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
  }>;
}

interface LocationData {
  lat: number;
  lon: number;
  city: string;
  country: string;
}

const Weather: React.FC = () => {
  const { user } = useAuth();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // OpenWeatherMap API key from environment variables
  const API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;

  // Fixed location for Santa Cruz, Laguna (Philippines)
  const DEFAULT_LOCATION: LocationData = {
    lat: 14.281,
    lon: 121.416,
    city: 'Santa Cruz',
    country: 'Laguna, PH',
  };

  // Weather icon mapping
  const getWeatherIcon = (iconCode: string, size: string = "text-4xl") => {
    const iconMap: { [key: string]: React.ReactElement } = {
      '01d': <FaSun className={`${size} text-yellow-500`} />,
      '01n': <FaSun className={`${size} text-yellow-400`} />,
      '02d': <FaCloudSun className={`${size} text-yellow-500`} />,
      '02n': <FaCloudSun className={`${size} text-yellow-400`} />,
      '03d': <FaCloud className={`${size} text-gray-500`} />,
      '03n': <FaCloud className={`${size} text-gray-400`} />,
      '04d': <FaCloud className={`${size} text-gray-600`} />,
      '04n': <FaCloud className={`${size} text-gray-500`} />,
      '09d': <FaCloudRain className={`${size} text-blue-500`} />,
      '09n': <FaCloudRain className={`${size} text-blue-400`} />,
      '10d': <FaCloudRain className={`${size} text-blue-600`} />,
      '10n': <FaCloudRain className={`${size} text-blue-500`} />,
      '11d': <FaBolt className={`${size} text-purple-600`} />,
      '11n': <FaBolt className={`${size} text-purple-500`} />,
      '13d': <FaSnowflake className={`${size} text-blue-200`} />,
      '13n': <FaSnowflake className={`${size} text-blue-100`} />,
      '50d': <FaCloud className={`${size} text-gray-400`} />,
      '50n': <FaCloud className={`${size} text-gray-300`} />,
    };
    return iconMap[iconCode] || <FaCloudSun className={`${size} text-gray-500`} />;
  };

  // Use fixed Santa Cruz location (no geolocation prompt)
  const getDefaultLocation = async (): Promise<LocationData> => {
    return DEFAULT_LOCATION;
  };

  // Fetch weather data from OpenWeatherMap API with Open‑Meteo fallback
  const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
    // Try OpenWeather (One Call 2.5 - free-compatible)
    if (API_KEY && API_KEY !== 'your_openweathermap_api_key') {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&units=metric&appid=${API_KEY}`
      );
      if (response.ok) {
        return await response.json();
      }
      // If unauthorized or subscription error, fall through to Open‑Meteo
    }

    // Fallback: Open‑Meteo (no API key required)
    const meteo = await fetchOpenMeteoWeatherData(lat, lon);
    if (meteo) return meteo;
    throw new Error('Failed to fetch weather data (both OpenWeather and Open‑Meteo).');
  };

  // Open‑Meteo → WeatherData mapper
  const fetchOpenMeteoWeatherData = async (lat: number, lon: number): Promise<WeatherData | null> => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation&daily=weathercode,temperature_2m_max,temperature_2_m_min,precipitation_probability_mean&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const m = await res.json();
      const current = m.current || {};
      const daily = m.daily || {};
      const times: string[] = daily.time || [];
      const wcodes: number[] = daily.weathercode || [];
      const tmax: number[] = daily.temperature_2m_max || [];
      const tmin: number[] = daily.temperature_2_m_min || [];
      const pops: number[] = daily.precipitation_probability_mean || [];

      const iconInfo = mapOpenMeteoCode(Number(current.weathercode ?? wcodes?.[0] ?? 2));
      const weather: WeatherData = {
        current: {
          temp: Math.round(current.temperature_2m ?? 0),
          feels_like: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
          humidity: Number(current.relative_humidity_2m ?? 0),
          pressure: 1013,
          visibility: 10000,
          wind_speed: Number(current.wind_speed_10m ?? 0),
          wind_deg: 0,
          weather: [{ id: iconInfoCode(iconInfo.icon), main: iconInfo.main, description: iconInfo.description, icon: iconInfo.icon }],
        },
        daily: times.map((t, i) => ({
          dt: Math.floor(new Date(t).getTime() / 1000),
          temp: { min: Math.round(tmin[i] ?? 0), max: Math.round(tmax[i] ?? 0) },
          weather: [{ id: iconInfoCode(mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).icon), main: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).main, description: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).description, icon: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).icon }],
          pop: typeof pops[i] === 'number' ? (pops[i] / 100) : 0,
        })),
        alerts: [],
      };
      return weather;
    } catch {
      return null;
    }
  };

  // Helpers for icon mapping
  const iconInfoCode = (icon: string) => {
    const map: Record<string, number> = {
      '01d': 800, '02d': 801, '03d': 802, '04d': 804, '09d': 300, '10d': 500, '11d': 200, '13d': 600, '50d': 741,
      '01n': 800, '02n': 801, '03n': 802, '04n': 804, '09n': 300, '10n': 500, '11n': 200, '13n': 600, '50n': 741,
    };
    return map[icon] ?? 800;
  };

  const mapOpenMeteoCode = (code: number): { main: string; description: string; icon: string } => {
    const map: Record<number, { main: string; description: string; icon: string }> = {
      0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
      1: { main: 'Clear', description: 'Mainly clear', icon: '02d' },
      2: { main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
      3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
      45: { main: 'Fog', description: 'Fog', icon: '50d' },
      48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
      51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
      53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
      55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
      56: { main: 'Drizzle', description: 'Light freezing drizzle', icon: '09d' },
      57: { main: 'Drizzle', description: 'Dense freezing drizzle', icon: '09d' },
      61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
      63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
      65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
      66: { main: 'Rain', description: 'Light freezing rain', icon: '10d' },
      67: { main: 'Rain', description: 'Heavy freezing rain', icon: '10d' },
      71: { main: 'Snow', description: 'Slight snow', icon: '13d' },
      73: { main: 'Snow', description: 'Moderate snow', icon: '13d' },
      75: { main: 'Snow', description: 'Heavy snow', icon: '13d' },
      77: { main: 'Snow', description: 'Snow grains', icon: '13d' },
      80: { main: 'Rain', description: 'Rain showers', icon: '10d' },
      81: { main: 'Rain', description: 'Rain showers', icon: '10d' },
      82: { main: 'Rain', description: 'Violent rain showers', icon: '11d' },
      85: { main: 'Snow', description: 'Snow showers', icon: '13d' },
      86: { main: 'Snow', description: 'Snow showers', icon: '13d' },
      95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
      96: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
      99: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
    };
    return map[code] || { main: 'Clouds', description: 'Cloudy', icon: '03d' };
  };

  // Load weather data
  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const locationData = await getDefaultLocation();
      setLocation(locationData);
      
      const weather = await fetchWeatherData(locationData.lat, locationData.lon);
      setWeatherData(weather);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading weather data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh weather data
  const refreshWeather = () => {
    loadWeatherData();
  };

  // Load weather data on component mount
  useEffect(() => {
    loadWeatherData();
  }, []);

  // Format temperature
  const formatTemp = (temp: number) => Math.round(temp);

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get emergency weather recommendations
  const getEmergencyRecommendations = (weather: WeatherData) => {
    const recommendations: string[] = [];
    const currentWeather = weather.current.weather[0];
    
    if (currentWeather.main === 'Rain' || currentWeather.main === 'Thunderstorm') {
      recommendations.push('⚠️ Heavy rain expected - avoid flood-prone areas');
      recommendations.push('🌊 Monitor local flood warnings and evacuation routes');
    }
    
    if (currentWeather.main === 'Thunderstorm') {
      recommendations.push('⚡ Thunderstorm alert - stay indoors and avoid metal objects');
      recommendations.push('🏠 Unplug electrical devices to prevent damage');
    }
    
    if (weather.current.wind_speed > 10) {
      recommendations.push('💨 Strong winds - secure loose objects and avoid tall structures');
    }
    
    if (weather.current.temp > 35) {
      recommendations.push('🌡️ Extreme heat - stay hydrated and avoid prolonged sun exposure');
    }
    
    if (weather.current.temp < 10) {
      recommendations.push('🧥 Cold weather - dress warmly and check on elderly neighbors');
    }
    
    return recommendations;
  };

  if (!user) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <PageMeta
        title="Weather Forecast | E-LigtasMo"
        description="Current weather conditions and forecast for emergency preparedness"
      />
      
      <div className="w-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Weather Forecast</h1>
                <p className="text-sm text-gray-600 mt-1">Stay informed for emergency preparedness</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                <FaMapMarkerAlt className="text-blue-600" />
                Santa Cruz, Laguna
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-3 py-2 rounded-lg text-xs transition-colors">
                Last 24 Hours
              </button>
              <button
                onClick={refreshWeather}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-3 py-2 rounded-lg text-xs transition-colors"
              >
                <FaSyncAlt className={`text-xs ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500 text-lg" />
              <div>
                <h3 className="font-semibold text-red-800 text-sm">Unable to load weather data</h3>
                <p className="text-red-600 text-xs mt-1">{error}</p>
                <button
                  onClick={refreshWeather}
                  className="text-red-700 hover:text-red-800 font-medium text-xs mt-2 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weather Content */}
        {weatherData && location && !loading && (
          <div className="space-y-4">
            {/* Current Weather Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg text-white p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-200 text-sm" />
                  <div>
                    <h2 className="text-lg font-bold">{location.city}</h2>
                    <p className="text-blue-200 text-xs">{location.country}</p>
                  </div>
                </div>
                {lastUpdated && (
                  <div className="text-right text-blue-200 text-xs">
                    <p>Last updated</p>
                    <p>{lastUpdated.toLocaleTimeString()}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weatherData.current.weather[0].icon, "text-4xl")}
                  <div>
                    <div className="text-3xl font-bold mb-1">
                      {formatTemp(weatherData.current.temp)}°C
                    </div>
                    <div className="text-sm text-blue-100 capitalize">
                      {weatherData.current.weather[0].description}
                    </div>
                    <div className="text-blue-200 text-xs mt-1">
                      Feels like {formatTemp(weatherData.current.feels_like)}°C
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <FaTint className="text-blue-200 text-xs" />
                      <span className="text-blue-200 text-xs">Humidity</span>
                    </div>
                    <div className="text-lg font-bold">{weatherData.current.humidity}%</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <FaWind className="text-blue-200 text-xs" />
                      <span className="text-blue-200 text-xs">Wind Speed</span>
                    </div>
                    <div className="text-lg font-bold">{Math.round(weatherData.current.wind_speed)} m/s</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <FaThermometerHalf className="text-blue-200 text-xs" />
                      <span className="text-blue-200 text-xs">Pressure</span>
                    </div>
                    <div className="text-lg font-bold">{weatherData.current.pressure} hPa</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <FaEye className="text-blue-200 text-xs" />
                      <span className="text-blue-200 text-xs">Visibility</span>
                    </div>
                    <div className="text-lg font-bold">{Math.round(weatherData.current.visibility / 1000)} km</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Alerts */}
            {weatherData.alerts && weatherData.alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <FaExclamationTriangle className="text-red-500 text-lg" />
                  <h3 className="text-lg font-bold text-red-800">Weather Alerts</h3>
                </div>
                <div className="space-y-2">
                  {weatherData.alerts.map((alert, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-red-800 text-sm">{alert.event}</h4>
                        <span className="text-xs text-red-600">{alert.sender_name}</span>
                      </div>
                      <p className="text-red-700 text-xs mb-1">{alert.description}</p>
                      <div className="text-xs text-red-600">
                        {new Date(alert.start * 1000).toLocaleString()} - {new Date(alert.end * 1000).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Recommendations */}
            {(() => {
              const recommendations = getEmergencyRecommendations(weatherData);
              return recommendations.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-3">
                    <FaExclamationTriangle className="text-orange-500 text-lg" />
                    <h3 className="text-lg font-bold text-orange-800">Emergency Preparedness</h3>
                  </div>
                  <div className="space-y-1">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-orange-700">
                        <span className="text-xs mt-0.5">•</span>
                        <span className="text-xs">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 7-Day Forecast */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">7-Day Forecast</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {weatherData.daily.slice(0, 7).map((day, index) => (
                  <div key={index} className="text-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="font-semibold text-gray-700 mb-2 text-xs">
                      {index === 0 ? 'Today' : formatDate(day.dt)}
                    </div>
                    <div className="flex justify-center mb-2">
                      {getWeatherIcon(day.weather[0].icon, "text-2xl")}
                    </div>
                    <div className="text-xs text-gray-600 mb-2 capitalize">
                      {day.weather[0].description}
                    </div>
                    <div className="flex justify-center items-center gap-1 text-xs">
                      <span className="font-bold text-gray-900">{formatTemp(day.temp.max)}°</span>
                      <span className="text-gray-500">{formatTemp(day.temp.min)}°</span>
                    </div>
                    {day.pop > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {Math.round(day.pop * 100)}% rain
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Weather;
