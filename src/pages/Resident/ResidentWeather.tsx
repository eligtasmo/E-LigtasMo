import React, { useState, useEffect } from 'react';
import PageMeta from "../../components/common/PageMeta";
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
import { useAuth } from '../../context/AuthContext';
import { fetchWeatherPreferred } from '../../utils/weather';

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

const ResidentWeather: React.FC = () => {
  const { user } = useAuth();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // OpenWeatherMap API key from environment variables (fallback)
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

  // Resolve location: prefer user's brgy, then geolocation, else default
  const resolveLocation = async (): Promise<LocationData> => {
    // Try brgy center
    if (user?.brgy_name) {
      try {
        const res = await fetch('/api/list-barangays.php');
        const data = await res.json();
        if (data.success && Array.isArray(data.barangays)) {
          const match = data.barangays.find((b: any) => (b.name || '').toLowerCase() === (user.brgy_name || '').toLowerCase());
          if (match && match.lat && match.lng) {
            return {
              lat: Number(match.lat),
              lon: Number(match.lng),
              city: match.name,
              country: `${user.city || 'City'}, ${user.province || 'PH'}`,
            };
          }
        }
      } catch {}
    }
    // Try geolocation
    const geoLoc = await new Promise<LocationData | null>((resolve) => {
      if (!('geolocation' in navigator)) return resolve(null);
      const t = setTimeout(() => resolve(null), 2500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(t);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, city: 'My Location', country: 'PH' });
        },
        () => { clearTimeout(t); resolve(null); },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60000 }
      );
    });
    if (geoLoc) return geoLoc;
    // Default
    return DEFAULT_LOCATION;
  };

  // Fetch weather data from preferred API, then OpenWeather, with Open‑Meteo final fallback
  const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
    // Try custom API first (normalized summary)
    const summary = await fetchWeatherPreferred({ lat, lon }, API_KEY);
    if (summary) {
      // If we only have summary, synthesize minimal WeatherData.current
      const current = {
        temp: summary.temp ?? 0,
        feels_like: summary.feels_like ?? summary.temp ?? 0,
        humidity: summary.humidity ?? 0,
        pressure: 0,
        visibility: 10000,
        wind_speed: summary.wind ?? 0,
        wind_deg: 0,
        weather: [{ id: 0, main: 'Weather', description: summary.desc || '—', icon: summary.icon || '02d' }],
      };
      const daily = [] as WeatherData['daily'];
      const alerts = Array.isArray(summary.alerts) ? summary.alerts.map((a: any) => ({
        sender_name: a.sender_name || 'N/A',
        event: a.event || 'Alert',
        start: a.start || Math.floor(Date.now() / 1000),
        end: a.end || Math.floor(Date.now() / 1000) + 3600,
        description: a.description || '',
      })) : undefined;
      return { current, daily, alerts } as WeatherData;
    }

    // Fallback to OpenWeather (2.5) if API key is present
    if (API_KEY && API_KEY !== 'your_openweathermap_api_key') {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&units=metric&appid=${API_KEY}`);
      if (response.ok) {
        return await response.json();
      }
      // if unauthorized or subscription error, fall through
    }

    // Final fallback: synthesize WeatherData from Open‑Meteo
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation&daily=weathercode,temperature_2m_max,temperature_2_m_min,precipitation_probability_mean&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch weather data');
      const m = await res.json();
      const c = m.current || {};
      const d = m.daily || {};
      const times: string[] = d.time || [];
      const tmax: number[] = d.temperature_2m_max || [];
      const tmin: number[] = d.temperature_2_m_min || [];
      const pops: number[] = d.precipitation_probability_mean || [];
      const wcodes: number[] = d.weathercode || [];

      const iconInfo = mapOpenMeteoCode(Number(c.weathercode ?? wcodes?.[0] ?? 2));
      const current: WeatherData['current'] = {
        temp: Math.round(c.temperature_2m ?? 0),
        feels_like: Math.round(c.apparent_temperature ?? c.temperature_2m ?? 0),
        humidity: Number(c.relative_humidity_2m ?? 0),
        pressure: 1013,
        visibility: 10000,
        wind_speed: Number(c.wind_speed_10m ?? 0),
        wind_deg: 0,
        weather: [{ id: 800, main: iconInfo.main, description: iconInfo.description, icon: iconInfo.icon }],
      };
      const daily: WeatherData['daily'] = times.map((t, i) => ({
        dt: Math.floor(new Date(t).getTime() / 1000),
        temp: { min: Math.round(tmin[i] ?? 0), max: Math.round(tmax[i] ?? 0) },
        weather: [{ id: 800, main: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).main, description: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).description, icon: mapOpenMeteoCode(wcodes[i] ?? wcodes[0]).icon }],
        pop: typeof pops[i] === 'number' ? (pops[i] / 100) : 0,
      }));
      return { current, daily, alerts: [] } as WeatherData;
    } catch (err) {
      throw new Error('Weather API unavailable. Configure VITE_OPENWEATHERMAP_API_KEY or set VITE_CUSTOM_WEATHER_API_URL.');
    }
  };

  // Map Open‑Meteo weather codes (local helper)
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
      
      const locationData = await resolveLocation();
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
  }, [user?.brgy_name]);

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
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Weather Forecast</h1>
              <p className="text-gray-600 mt-1">Stay informed for emergency preparedness</p>
            </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              <FaMapMarkerAlt className="text-blue-600" />
              {location ? `${location.city}, ${location.country}` : '—'}
            </span>
          </div>
          <button
            onClick={refreshWeather}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <FaSyncAlt className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-red-500 text-xl" />
              <div>
                <h3 className="font-semibold text-red-800">Unable to load weather data</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={refreshWeather}
                  className="text-red-700 hover:text-red-800 font-medium text-sm mt-2 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weather Content */}
        {weatherData && location && !loading && (
          <div className="space-y-6">
            {/* Current Weather Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg text-white p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-blue-200" />
                  <div>
                    <h2 className="text-2xl font-bold">{location.city}</h2>
                    <p className="text-blue-200">{location.country}</p>
                  </div>
                </div>
                {lastUpdated && (
                  <div className="text-right text-blue-200 text-sm">
                    <p>Last updated</p>
                    <p>{lastUpdated.toLocaleTimeString()}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center gap-6">
                  {getWeatherIcon(weatherData.current.weather[0].icon, "text-6xl")}
                  <div>
                    <div className="text-5xl font-bold mb-2">
                      {formatTemp(weatherData.current.temp)}°C
                    </div>
                    <div className="text-xl text-blue-100 capitalize">
                      {weatherData.current.weather[0].description}
                    </div>
                    <div className="text-blue-200 text-sm mt-1">
                      Feels like {formatTemp(weatherData.current.feels_like)}°C
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaTint className="text-blue-200" />
                      <span className="text-blue-200 text-sm">Humidity</span>
                    </div>
                    <div className="text-2xl font-bold">{weatherData.current.humidity}%</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaWind className="text-blue-200" />
                      <span className="text-blue-200 text-sm">Wind Speed</span>
                    </div>
                    <div className="text-2xl font-bold">{Math.round(weatherData.current.wind_speed)} m/s</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaThermometerHalf className="text-blue-200" />
                      <span className="text-blue-200 text-sm">Pressure</span>
                    </div>
                    <div className="text-2xl font-bold">{weatherData.current.pressure} hPa</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaEye className="text-blue-200" />
                      <span className="text-blue-200 text-sm">Visibility</span>
                    </div>
                    <div className="text-2xl font-bold">{Math.round(weatherData.current.visibility / 1000)} km</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Alerts */}
            {weatherData.alerts && weatherData.alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FaExclamationTriangle className="text-red-500 text-2xl" />
                  <h3 className="text-xl font-bold text-red-800">Weather Alerts</h3>
                </div>
                <div className="space-y-3">
                  {weatherData.alerts.map((alert, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-red-800">{alert.event}</h4>
                        <span className="text-sm text-red-600">{alert.sender_name}</span>
                      </div>
                      <p className="text-red-700 text-sm mb-2">{alert.description}</p>
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
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FaExclamationTriangle className="text-orange-500 text-2xl" />
                    <h3 className="text-xl font-bold text-orange-800">Emergency Preparedness</h3>
                  </div>
                  <div className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 text-orange-700">
                        <span className="text-sm mt-0.5">•</span>
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 7-Day Forecast (only when available) */}
            {weatherData.daily && weatherData.daily.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">7-Day Forecast</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                  {weatherData.daily.slice(0, 7).map((day, index) => (
                    <div key={index} className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="font-semibold text-gray-700 mb-2">
                        {index === 0 ? 'Today' : formatDate(day.dt)}
                      </div>
                      <div className="flex justify-center mb-3">
                        {getWeatherIcon(day.weather[0].icon, "text-3xl")}
                      </div>
                      <div className="text-sm text-gray-600 mb-2 capitalize">
                        {day.weather[0].description}
                      </div>
                      <div className="flex justify-center items-center gap-2 text-sm">
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
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ResidentWeather;
