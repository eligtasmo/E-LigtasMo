# Weather API Setup Instructions

## Getting Your Free OpenWeatherMap API Key

The weather section prefers OpenWeatherMap with your API key, but now also includes a built‑in fallback to Open‑Meteo (no key required). Follow these steps to get your free OpenWeatherMap API key for full features:

### Step 1: Create an Account
1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Click "Sign Up" to create a free account
3. Fill in your details and verify your email

### Step 2: Get Your API Key
1. After logging in, go to [API Keys section](https://home.openweathermap.org/api_keys)
2. You'll see a default API key already generated
3. Copy this API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### Step 3: Configure Your Application
1. Open the `.env` file in your project root
2. Replace `your_openweathermap_api_key` with your actual API key:
   ```
   VITE_OPENWEATHERMAP_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
3. Save the file

### Step 4: Restart Your Development Server
1. Stop your current development server (Ctrl+C)
2. Start it again with `npm run dev`
3. The weather section should now work! If no API key is configured, a basic weather feed will still work via Open‑Meteo.

## Free Tier Limits
- 1,000 API calls per day
- Current weather data
- 5-day/3-hour forecast
- Weather alerts
- No credit card required

## Troubleshooting
- **"API key not configured"**: The app will automatically fall back to Open‑Meteo. To enable alerts and full OpenWeather features, add the key to `.env` and restart the server.
- **"Invalid API key"**: Double-check that you copied the key correctly. The app will still show basic weather via Open‑Meteo.
- **"Failed to fetch"**: Check your internet connection. If OpenWeather is down or rate‑limited, the app tries Open‑Meteo automatically.

## API Features Used
- Current weather conditions
- 7‑day forecast
- Weather alerts (OpenWeather; may be unavailable in Open‑Meteo fallback)
- Geolocation‑based weather
- Emergency weather recommendations

## Optional: Custom Aggregator
You can set `VITE_CUSTOM_WEATHER_API_URL` to point to your own weather aggregator endpoint. The app will try it first, then OpenWeather (if a key is set), and finally Open‑Meteo.