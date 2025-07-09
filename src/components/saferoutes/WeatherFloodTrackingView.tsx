import { useEffect, useState } from "react";
import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const mockForecast = [
  { day: "Today", temp: 31, rain: 12, desc: "Thunderstorms" },
  { day: "Tomorrow", temp: 29, rain: 20, desc: "Heavy Rain" },
  { day: "Wed", temp: 30, rain: 5, desc: "Cloudy" },
];

const mockRainfallData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      label: "Rainfall (mm)",
      data: [5, 12, 20, 8, 15, 30, 25],
      fill: true,
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      borderColor: "#2563eb",
      tension: 0.4,
    },
  ],
};

const mockAdvisories = [
  {
    id: 1,
    title: "Flood Warning: Manila",
    time: "2024-06-10 14:00",
    details: "Heavy rainfall expected. Possible flooding in low-lying areas.",
  },
  {
    id: 2,
    title: "Thunderstorm Advisory: Quezon City",
    time: "2024-06-10 13:00",
    details: "Thunderstorms detected. Take necessary precautions.",
  },
  {
    id: 3,
    title: "Typhoon Alert: Typhoon Ambo",
    time: "2024-06-09 18:00",
    details: "Typhoon Ambo is within PAR. Monitor updates from PAGASA.",
  },
];

export default function WeatherFloodTrackingView() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo: Use OpenWeatherMap API for current weather in Manila
    async function fetchWeather() {
      setLoading(true);
      try {
        const resp = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Manila,PH&appid=demo&units=metric`
        );
        if (resp.ok) {
          const data = await resp.json();
          setWeather({
            temp: data.main.temp,
            desc: data.weather[0].description,
            icon: data.weather[0].icon,
            humidity: data.main.humidity,
            wind: data.wind.speed,
          });
        } else {
          setWeather(null);
        }
      } catch {
        setWeather(null);
      }
      setLoading(false);
    }
    fetchWeather();
  }, []);

  return (
    <div className="flex gap-4" style={{ height: "85vh" }}>
      {/* Sidebar */}
      <div className="w-1/3 flex flex-col p-2 bg-white rounded-lg shadow-md overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Weather & Flood Tracking</h2>
        <div className="mb-4">
          <h3 className="font-semibold text-md mb-1">Current Weather (Manila)</h3>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : weather ? (
            <div className="flex items-center gap-3">
              <img
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt="icon"
                className="w-12 h-12"
              />
              <div>
                <div className="text-2xl font-bold">{weather.temp}°C</div>
                <div className="capitalize text-gray-600">{weather.desc}</div>
                <div className="text-xs text-gray-500">Humidity: {weather.humidity}% | Wind: {weather.wind} m/s</div>
              </div>
            </div>
          ) : (
            <div className="text-red-400">Weather data unavailable.</div>
          )}
        </div>
        <div className="mb-4">
          <h3 className="font-semibold text-md mb-1">3-Day Forecast</h3>
          <div className="flex gap-2">
            {mockForecast.map((f) => (
              <div key={f.day} className="flex flex-col items-center bg-blue-50 rounded p-2 w-1/3">
                <div className="text-lg font-bold">{f.temp}°C</div>
                <div className="text-xs text-blue-700">{f.desc}</div>
                <div className="text-xs text-gray-500">Rain: {f.rain}mm</div>
                <div className="text-xs font-semibold mt-1">{f.day}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold text-md mb-1">Rainfall Trend (7 days)</h3>
          <div style={{ height: 120, width: "100%" }}>
            <Line
              data={mockRainfallData}
              options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-md mb-1">Flood/Weather Advisories</h3>
          <ul className="space-y-2">
            {mockAdvisories.map((adv) => (
              <li key={adv.id} className="p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <div className="font-semibold text-yellow-800">{adv.title}</div>
                <div className="text-xs text-gray-500">{adv.time}</div>
                <div className="text-xs text-gray-700">{adv.details}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Map with weather overlays */}
      <div className="w-2/3 h-full rounded-lg shadow-md overflow-hidden">
        <MapContainer 
          center={[14.28, 121.42]} 
          zoom={9} 
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {/* Rainfall overlay (PAGASA WMS demo, or OpenWeatherMap WMS if available) */}
          <WMSTileLayer
            url="https://ahocevar.com/geoserver/wms"
            layers="nasa:bluemarble"
            format="image/png"
            transparent={true}
            opacity={0.4}
          />
          {/* You can add more overlays for flood-prone areas, typhoon tracks, etc. */}
        </MapContainer>
      </div>
    </div>
  );
} 