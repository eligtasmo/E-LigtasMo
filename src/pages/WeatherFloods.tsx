import PageMeta from "../components/common/PageMeta";
import WeatherFloodTrackingView from '../components/saferoutes/WeatherFloodTrackingView';

const WeatherFloods: React.FC = () => {
  return (
    <>
      <PageMeta title="Weather & Floods" description="Monitor weather conditions and flood tracking systems." />
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Weather & Floods</h1>
            <p className="text-gray-600 dark:text-gray-300">Monitor weather conditions, flood levels, and environmental hazards</p>
          </div>
        </div>
        <div className="p-6">
          <WeatherFloodTrackingView />
        </div>
      </div>
    </>
  );
};

export default WeatherFloods;