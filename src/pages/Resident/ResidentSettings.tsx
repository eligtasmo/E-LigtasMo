import React, { useEffect, useState } from 'react';
import PageMeta from "../../components/common/PageMeta";

const ResidentSettings: React.FC = () => {
  const [homeMode, setHomeMode] = useState<string>(() => localStorage.getItem('resident_home_mode') || 'action-first');
  const [weatherPref, setWeatherPref] = useState<string>(() => localStorage.getItem('resident_weather_loc_pref') || 'brgy');
  const [showEmergency, setShowEmergency] = useState<string>(() => localStorage.getItem('resident_show_emergency_button') || 'true');

  useEffect(() => { localStorage.setItem('resident_home_mode', homeMode); }, [homeMode]);
  useEffect(() => { localStorage.setItem('resident_weather_loc_pref', weatherPref); }, [weatherPref]);
  useEffect(() => { localStorage.setItem('resident_show_emergency_button', showEmergency); }, [showEmergency]);

  return (
    <>
      <PageMeta title="Settings | E-LigtasMo" description="Customize your resident experience" />
      <div className="w-full space-y-10 px-4 py-8 max-w-4xl mx-auto">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-black tracking-tight">Settings</h1>
          <p className="text-gray-500 font-medium">Personalize your dashboard and experience.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bento-card p-8 space-y-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Home Layout</h2>
            <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem]">
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${homeMode === 'action-first' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setHomeMode('action-first')}
              >Actions</button>
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${homeMode === 'map-first' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setHomeMode('map-first')}
              >Map</button>
            </div>
          </div>

          <div className="bento-card p-8 space-y-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Location Mode</h2>
            <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem]">
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${weatherPref === 'brgy' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setWeatherPref('brgy')}
              >Barangay</button>
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${weatherPref === 'geolocation' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setWeatherPref('geolocation')}
              >Device GPS</button>
            </div>
          </div>

          <div className="bento-card p-8 space-y-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Safety Assist</h2>
            <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem]">
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${showEmergency === 'true' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setShowEmergency('true')}
              >Enabled</button>
              <button
                className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-bold transition-all ${showEmergency === 'false' ? "bg-black text-white shadow-lg" : "text-gray-500"}`}
                onClick={() => setShowEmergency('false')}
              >Disabled</button>
            </div>
          </div>

          <div className="bento-card p-8 space-y-6">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Danger Zone</h2>
            <button
              className="w-full py-4 rounded-[1.5rem] bg-red-50 text-red-600 text-sm font-bold border border-red-100 shadow-sm hover:bg-red-100 transition-colors"
              onClick={() => {
                localStorage.removeItem('resident_home_mode');
                localStorage.removeItem('resident_weather_loc_pref');
                localStorage.removeItem('resident_show_emergency_button');
                setHomeMode('action-first');
                setWeatherPref('brgy');
                setShowEmergency('true');
              }}
            >Reset All Preferences</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResidentSettings;
