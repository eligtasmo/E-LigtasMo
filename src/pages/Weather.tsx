import React, { useState, useEffect } from 'react';
import { FiCloud, FiDroplet, FiWind, FiSun, FiMap, FiActivity, FiSearch, FiRefreshCw, FiAlertTriangle, FiNavigation, FiZap } from 'react-icons/fi';
import PageMeta from "../components/common/PageMeta";
import MapboxMap, { NavigationControl } from "../components/maps/MapboxMap";
import { toast } from 'react-hot-toast';
import { DEFAULT_MAP_STATE } from '../constants/geo';

const Weather: React.FC = () => {
    const [weatherData, setWeatherData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState('Santa Cruz, Laguna');

    const fetchWeather = async () => {
        setLoading(true);
        try {
            const API_KEY = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=metric&appid=${API_KEY}`);
            const data = await res.json();
            if (data.cod === 200) {
                setWeatherData(data);
            } else {
                toast.error("Location not found");
            }
        } catch (e) {
            toast.error("Weather service unavailable");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
    }, []);

    return (
    <div className="tactical-page !h-screen flex flex-col">
      <PageMeta title="Weather Intelligence | E-LigtasMo" description="Real-time meteorological monitoring and hazard assessment." />
      
      {/* Control Header */}
      <div className="bg-white border-b border-slate-200 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 z-10 shadow-sm">
        <div>
          <div className="tactical-status-pill mb-3">
            <div className="tactical-status-dot bg-blue-500 animate-pulse" />
            <span>MET_INTEL: LIVE</span>
          </div>
          <h1 className="tactical-title text-2xl">Weather Intelligence</h1>
          <p className="tactical-subtitle mt-1">Real-time environmental monitoring & forecasting</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="tactical-search-group mb-0 p-1.5 h-12 flex items-center">
            <FiSearch className="ml-4 text-slate-400" />
            <input
              type="text"
              placeholder="Enter sector ID or location..."
              className="tactical-input !border-none !bg-transparent h-full w-64 pl-3"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchWeather()}
            />
          </div>
          <button 
            onClick={fetchWeather}
            className="tactical-button-accent h-12 px-8 shadow-2xl"
          >
            {loading ? <FiRefreshCw className="animate-spin" /> : <FiCloud />}
            SYNC_DATA
          </button>
        </div>
      </div>

      {/* Main Interactive Map View */}
      <div className="flex-grow relative overflow-hidden flex flex-col lg:flex-row">
        
        {/* Visual Map Area */}
        <div className="flex-grow h-full relative z-0">
          <MapboxMap
            initialViewState={{
              latitude: weatherData?.coord?.lat || DEFAULT_MAP_STATE.latitude,
              longitude: weatherData?.coord?.lon || DEFAULT_MAP_STATE.longitude,
              zoom: DEFAULT_MAP_STATE.zoom
            }}
            mapStyle="mapbox://styles/mapbox/light-v11"
          >
            <NavigationControl />
          </MapboxMap>

          {/* Floating Weather Summary Card */}
          {weatherData && !loading && (
            <div className="absolute top-8 left-8 w-80 bg-white/90 backdrop-blur-md rounded-[40px] p-10 border border-slate-200/50 shadow-2xl animate-in slide-in-from-left duration-500">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">{weatherData.name}</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{weatherData.weather[0].description}</p>
                </div>
                <div className="text-4xl text-blue-600">
                  <FiSun />
                </div>
              </div>

              <div className="text-6xl font-black text-slate-900 tracking-tighter mb-10 tabular-nums">
                {Math.round(weatherData.main.temp)}°<span className="text-slate-300 font-medium">C</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                  <label className="tactical-label !text-[8px] mb-2">Humidity</label>
                  <div className="flex items-center gap-2">
                    <FiDroplet className="text-blue-500" />
                    <span className="text-xl font-black text-slate-900">{weatherData.main.humidity}%</span>
                  </div>
                </div>
                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                  <label className="tactical-label !text-[8px] mb-2">Wind_Spd</label>
                  <div className="flex items-center gap-2">
                    <FiWind className="text-cyan-500" />
                    <span className="text-xl font-black text-slate-900">{weatherData.wind.speed}m/s</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tactical Forecast Panel */}
        <div className="w-full lg:w-[480px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-10 flex flex-col gap-10 overflow-y-auto shrink-0 z-10 shadow-2xl">
          
          <div className="flex items-center gap-4">
            <div className="tactical-icon-container w-14 h-14 bg-blue-50 text-blue-600 border-blue-100 shadow-xl shadow-blue-600/5">
              <FiActivity size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">Atmospheric Analysis</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Station: SCT_DELTA_LAGUNA</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="tactical-card p-8 border-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-3 mb-4">
                <FiAlertTriangle className="text-amber-500" />
                <label className="tactical-label !text-amber-600 mb-0">Hazard_Assessment</label>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-bold italic">
                "Environmental parameters indicate stable atmospheric conditions. No immediate thermal or flood hazards detected in primary sector."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Visibility', value: '10km', icon: <FiNavigation />, color: 'text-blue-500' },
                { label: 'Pressure', value: '1012hPa', icon: <FiZap />, color: 'text-cyan-500' },
                { label: 'Min_Temp', value: '24°C', icon: <FiCloud />, color: 'text-slate-400' },
                { label: 'Max_Temp', value: '31°C', icon: <FiSun />, color: 'text-amber-500' }
              ].map((stat, i) => (
                <div key={i} className="tactical-card p-6 flex flex-col gap-4 group hover:border-blue-200 transition-all">
                  <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${stat.color} border border-slate-100 shadow-sm group-hover:bg-white`}>
                    {stat.icon}
                  </div>
                  <div>
                    <label className="tactical-label !text-[8px] mb-1">{stat.label}</label>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <label className="tactical-label !text-white/60 mb-3">Operational_Notice</label>
                <p className="text-sm leading-relaxed font-bold italic">
                  "Maintain hydration support missions for peak thermal window [12:00-15:00] across central sectors."
                </p>
              </div>
              <FiActivity className="absolute -right-12 -bottom-12 w-48 h-48 opacity-[0.05] group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>

          <div className="mt-auto pt-8 border-t border-slate-100 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
            <span>LINKED_OPENWEATHER_API</span>
            <span>INTEL_v2.1.4</span>
          </div>
        </div>
      </div>
    </div>
    );
};

export default Weather;
