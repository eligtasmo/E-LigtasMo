import PageMeta from "../components/common/PageMeta";
import WeatherFloodTrackingView from '../components/saferoutes/WeatherFloodTrackingView';

const WeatherFloods: React.FC = () => {
  return (
    <div className="tactical-page">
      <PageMeta title="Weather & Floods | E-LigtasMo" description="Monitor weather conditions and flood tracking systems." />
      
      <div className="tactical-container">
        <div className="tactical-header">
           <div className="tactical-status-pill mb-4">
             <div className="tactical-status-dot bg-blue-500 animate-pulse" />
             <span>MET_LINK: CONNECTED</span>
           </div>
           <h1 className="tactical-title">Weather & Floods</h1>
           <p className="tactical-subtitle">Monitor real-time meteorological parameters and sector flood elevations.</p>
        </div>

        <div className="tactical-card p-10">
          <WeatherFloodTrackingView />
        </div>
      </div>
    </div>
  );
};

export default WeatherFloods;