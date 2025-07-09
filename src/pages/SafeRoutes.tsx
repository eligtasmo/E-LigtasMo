import { useState } from 'react';
import PageMeta from "../components/common/PageMeta";
import RoutesView from '../components/saferoutes/RoutesView';
import ManageSheltersView from '../components/saferoutes/ManageSheltersView';
import IncidentReportingView from '../components/saferoutes/IncidentReportingView';
import WeatherFloodTrackingView from '../components/saferoutes/WeatherFloodTrackingView';

type Tab = 'routes' | 'shelters' | 'incident' | 'weather';

const SafeRoutes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('routes');
  const [showReceipt, setShowReceipt] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  return (
    <>
      <PageMeta title="Safety & Operations Center" description="Manage routes, shelters, and incidents." />
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-md">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 p-4" aria-label="Tabs">
            <button onClick={() => setActiveTab('routes')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'routes' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Manage Routes
            </button>
            <button onClick={() => setActiveTab('shelters')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'shelters' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Manage Shelters
            </button>
             <button onClick={() => setActiveTab('incident')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'incident' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Incident Reports
            </button>
             <button onClick={() => setActiveTab('weather')} className={`px-4 py-2 font-medium text-sm rounded-md ${activeTab === 'weather' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              Weather & Floods
            </button>
          </nav>
        </div>
        <div className="p-4">
          {activeTab === 'routes' && <RoutesView />}
          {activeTab === 'shelters' && <ManageSheltersView />}
          {activeTab === 'incident' && <IncidentReportingView showReceipt={showReceipt} setShowReceipt={setShowReceipt} referenceId={referenceId} setReferenceId={setReferenceId} />}
          {activeTab === 'weather' && <WeatherFloodTrackingView />}
        </div>
      </div>
    </>
  );
};

export default SafeRoutes;
