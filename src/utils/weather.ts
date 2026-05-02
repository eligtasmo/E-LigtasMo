// src/utils/weather.ts
// A resilient weather fetcher that prefers a custom API, then OpenWeather,
// and finally falls back to Open‑Meteo (no API key required).
// Normalizes output to a compact summary for the Home page.

export interface WeatherSummary {
  temp: number;
  feels_like?: number;
  desc: string;
  humidity?: number;
  wind?: number;
  uvi?: number;
  pop?: number; // precipitation probability (0-100)
  alerts?: any[];
  icon?: string;
}

type LatLon = { lat: number; lon: number };

// Try user-provided API first, then OpenWeather
export async function fetchWeatherPreferred(
  loc: LatLon,
  openWeatherApiKey?: string
): Promise<WeatherSummary | null> {
  // 1) Try custom API via env var
  const customUrl = import.meta.env.VITE_CUSTOM_WEATHER_API_URL as string | undefined;
  if (customUrl && customUrl.trim().length > 0) {
    try {
      const hasQuery = customUrl.includes('?');
      const url = `${customUrl}${hasQuery ? '&' : '?'}lat=${loc.lat}&lon=${loc.lon}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeCustomWeather(data);
        if (normalized) return normalized;
      }
    } catch (_) {}
  }

  // 1b) Try auto-detected local API endpoints if available
  try {
    const hostBase = `/api`;
    const candidates = [
      'weather-summary.php',
      'weather.php',
      'get-weather.php',
    ];
    for (const path of candidates) {
      const url = `${hostBase}/${path}?lat=${loc.lat}&lon=${loc.lon}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const normalized = normalizeCustomWeather(data);
        if (normalized) return normalized;
      }
    }
  } catch (_) {
    // ignore and proceed to public APIs
  }

  // 2) Fallback to OpenWeather One Call (2.5 - free-compatible)
  if (openWeatherApiKey && openWeatherApiKey !== 'your_openweathermap_api_key') {
    try {
      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${loc.lat}&lon=${loc.lon}&exclude=minutely,hourly&units=metric&appid=${openWeatherApiKey}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const w = await res.json();
      const current = w.current;
      const today = Array.isArray(w.daily) ? w.daily[0] : null;
      return {
        temp: Math.round(current?.temp ?? 0),
        feels_like: Math.round(current?.feels_like ?? 0),
        desc: current?.weather?.[0]?.description ?? '—',
        humidity: current?.humidity ?? 0,
        wind: current?.wind_speed ?? 0,
        uvi: current?.uvi ?? undefined,
        pop: typeof today?.pop === 'number' ? Math.round(today.pop * 100) : undefined,
        alerts: w.alerts || [],
        icon: current?.weather?.[0]?.icon ?? '02d',
      };
    } catch (_) {
      // continue to Open-Meteo fallback below
    }
  }

  // 3) Final fallback: Open‑Meteo (no key, free)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_mean&timezone=Asia%2FManila`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const m = await res.json();
    const c = m.current || {};
    const daily = Array.isArray(m.daily?.time) ? m.daily : null;
    const wc = Number(daily?.weathercode?.[0] ?? c.weathercode ?? 2);
    const iconInfo = mapOpenMeteoCode(wc);
    return {
      temp: (roundNum(c.temperature_2m) ?? 0),
      feels_like: (roundNum(c.apparent_temperature) ?? 0),
      desc: iconInfo.description,
      humidity: numOr(c.relative_humidity_2m),
      wind: numOr(c.wind_speed_10m),
      uvi: undefined,
      pop: typeof daily?.precipitation_probability_mean?.[0] === 'number' ? Math.round(daily.precipitation_probability_mean[0]) : undefined,
      alerts: [],
      icon: iconInfo.icon,
    };
  } catch (_) {
    return null;
  }
}

// Normalize various custom API response shapes to WeatherSummary
function normalizeCustomWeather(data: any): WeatherSummary | null {
  if (!data || typeof data !== 'object') return null;

  // Common shapes: { current: { temp, feels_like, humidity, wind_speed, weather:[{description, icon}]} , daily:[{pop}], alerts }
  if (data.current) {
    const c = data.current;
    const daily0 = Array.isArray(data.daily) ? data.daily[0] : null;
    return {
      temp: (roundNum(c.temp) ?? 0),
      feels_like: (roundNum(c.feels_like) ?? 0),
      desc: c.weather?.[0]?.description || c.description || data.desc || '—',
      humidity: numOr(c.humidity),
      wind: numOr(c.wind_speed ?? c.wind),
      uvi: numOr(c.uvi),
      pop: typeof daily0?.pop === 'number' ? Math.round(daily0.pop * 100) : numOr(data.pop),
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
      icon: c.weather?.[0]?.icon || data.icon,
    };
  }

  // Flat shapes: { temp, feels_like, humidity, wind, description, alerts }
  if ('temp' in data || 'temperature' in data) {
    return {
      temp: (roundNum(data.temp ?? data.temperature) ?? 0),
      feels_like: roundNum(data.feels_like ?? data.apparent_temperature),
      desc: data.description ?? data.desc ?? '—',
      humidity: numOr(data.humidity),
      wind: numOr(data.wind ?? data.wind_speed),
      uvi: numOr(data.uvi),
      pop: numOr(data.pop ?? data.precip_probability),
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
      icon: data.icon,
    };
  }

  return null;
}

function roundNum(v: any): number | undefined {
  return typeof v === 'number' ? Math.round(v) : undefined;
}

function numOr(v: any): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

// Map Open‑Meteo weather codes to a readable description and an OpenWeather-like icon code
function mapOpenMeteoCode(code: number): { main: string; description: string; icon: string } {
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
}
