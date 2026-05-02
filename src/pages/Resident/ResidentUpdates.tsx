import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import WeatherFloodTrackingView from "../../components/saferoutes/WeatherFloodTrackingView";

type ViewTab = "hazards";

const ToggleButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md text-sm font-semibold transition border ${
      active
        ? "bg-blue-600 text-white border-blue-600 shadow"
        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

const ResidentUpdates: React.FC = () => {
  const location = useLocation();
  const initialTab: ViewTab = useMemo(() => {
    return "hazards";
  }, [location.pathname]);

  const [tab, setTab] = useState<ViewTab>(initialTab);

  return (
    <>
      <PageMeta title="Hazard Map" description="View local hazard map and overlays." />
      <div className="w-full h-full">
        <WeatherFloodTrackingView />
      </div>
    </>
  );
};

export default ResidentUpdates;