import PageMeta from "../components/common/PageMeta";
import WeatherFloodTrackingView from '../components/saferoutes/WeatherFloodTrackingView';

const WeatherFloods: React.FC = () => {
  return (
    <>
      <PageMeta title="Weather & Floods" description="Monitor weather conditions and flood tracking systems." />
      <div className="bg-white rounded-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border border-gray-100 font-jetbrains overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-100/50">
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-2 h-8 bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
              Weather & Floods
            </h1>
            <p className="text-gray-500 font-bold mt-2 tracking-tight text-[10px]">Monitor weather conditions, flood levels, and environmental hazards</p>
          </div>
        </div>
        <div className="p-8">
          <WeatherFloodTrackingView />
        </div>
      </div>
    </>
  );
};

export default WeatherFloods;