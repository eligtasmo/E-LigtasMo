import React, { useState, useEffect } from 'react';
import { 
  FiActivity, FiMap, FiNavigation, FiHome, FiBarChart, 
  FiAlertTriangle, FiClock, FiUsers, FiTruck, FiPhone,
  FiMaximize2, FiMinimize2, FiRefreshCw, FiSettings
} from 'react-icons/fi';
import { 
  BiError, BiTime, BiShield, BiTrendingUp, BiMapPin,
  BiDirections, BiHome, BiWater, BiStats
} from 'react-icons/bi';

// Types for the unified dashboard
interface IncidentData {
  id: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  status: 'Active' | 'Responding' | 'Resolved';
  timestamp: string;
  coordinates: [number, number];
  description: string;
}

interface RouteData {
  id: string;
  name: string;
  type: 'Emergency' | 'Evacuation' | 'Supply';
  status: 'Active' | 'Blocked' | 'Clear';
  coordinates: [number, number][];
  estimatedTime: number;
  safetyScore: number;
}

interface ResourceData {
  id: string;
  type: 'Ambulance' | 'Fire Truck' | 'Police' | 'Rescue Team';
  status: 'Available' | 'Deployed' | 'Maintenance';
  location: [number, number];
  assignedIncident?: string;
}

const UnifiedEmergencyDashboard: React.FC = () => {
  // State management
  const [activePanel, setActivePanel] = useState<'incidents' | 'routes' | 'resources' | 'analytics'>('incidents');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Sample data
  useEffect(() => {
    const sampleIncidents: IncidentData[] = [
      {
        id: '1',
        type: 'Flood',
        severity: 'Critical',
        location: 'Barangay San Antonio',
        status: 'Active',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        coordinates: [14.5995, 120.9842],
        description: 'Heavy flooding due to continuous rainfall'
      },
      {
        id: '2',
        type: 'Fire',
        severity: 'High',
        location: 'Central Plaza',
        status: 'Responding',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        coordinates: [14.6042, 120.9822],
        description: 'Building fire at commercial complex'
      }
    ];

    const sampleRoutes: RouteData[] = [
      {
        id: '1',
        name: 'Emergency Route A',
        type: 'Emergency',
        status: 'Active',
        coordinates: [[14.5995, 120.9842], [14.6020, 120.9860], [14.6050, 120.9880]],
        estimatedTime: 8,
        safetyScore: 95
      }
    ];

    const sampleResources: ResourceData[] = [
      {
        id: '1',
        type: 'Ambulance',
        status: 'Deployed',
        location: [14.6000, 120.9850],
        assignedIncident: '1'
      },
      {
        id: '2',
        type: 'Fire Truck',
        status: 'Deployed',
        location: [14.6040, 120.9820],
        assignedIncident: '2'
      }
    ];

    setIncidents(sampleIncidents);
    setRoutes(sampleRoutes);
    setResources(sampleResources);

    // Update time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Metrics calculation
  const metrics = {
    activeIncidents: incidents.filter(i => i.status === 'Active').length,
    criticalIncidents: incidents.filter(i => i.severity === 'Critical').length,
    averageResponseTime: '4.2 min',
    resourcesDeployed: resources.filter(r => r.status === 'Deployed').length,
    totalResources: resources.length
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-red-600 bg-red-100';
      case 'Responding': return 'text-blue-600 bg-blue-100';
      case 'Resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <FiActivity className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Emergency Command Center</h1>
                <p className="text-sm text-gray-600">Unified disaster response coordination</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
                <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <FiRefreshCw className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <FiSettings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <BiError className="text-red-600 text-lg" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{metrics.activeIncidents}</p>
              <p className="text-xs text-gray-500">Active Incidents</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiAlertTriangle className="text-orange-600 text-lg" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{metrics.criticalIncidents}</p>
              <p className="text-xs text-gray-500">Critical</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <BiTime className="text-blue-600 text-lg" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{metrics.averageResponseTime}</p>
              <p className="text-xs text-gray-500">Avg Response</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <FiTruck className="text-green-600 text-lg" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{metrics.resourcesDeployed}/{metrics.totalResources}</p>
              <p className="text-xs text-gray-500">Resources</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <BiShield className="text-purple-600 text-lg" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">94.2%</p>
              <p className="text-xs text-gray-500">Safety Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Interactive Map */}
        <div className="w-full h-full relative">
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-2">
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isMapExpanded ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Map Placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
            <div className="text-center">
              <FiMap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Interactive Emergency Map</p>
              <p className="text-sm text-gray-500 mt-1">Real-time incidents, routes, and resources</p>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-2">
            <div className="flex flex-col gap-2">
              <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                <BiMapPin className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                <BiDirections className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
                <BiHome className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Contextual Panels */}
        {!isMapExpanded && (
          <div className="absolute top-4 right-4 bottom-4 z-20 w-96 bg-white flex flex-col rounded-xl shadow-2xl overflow-hidden">
            {/* Panel Navigation */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex gap-1">
                {[
                  { key: 'incidents', label: 'Incidents', icon: FiAlertTriangle },
                  { key: 'routes', label: 'Routes', icon: FiNavigation },
                  { key: 'resources', label: 'Resources', icon: FiTruck },
                  { key: 'analytics', label: 'Analytics', icon: FiBarChart }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActivePanel(key as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activePanel === key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activePanel === 'incidents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Live Incidents</h3>
                    <span className="text-sm text-gray-500">{incidents.length} active</span>
                  </div>
                  {incidents.map((incident) => (
                    <div key={incident.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                            {incident.severity}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(incident.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{incident.type}</h4>
                      <p className="text-sm text-gray-600 mb-2">{incident.location}</p>
                      <p className="text-xs text-gray-500">{incident.description}</p>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                          View Details
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                          Show on Map
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activePanel === 'routes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Emergency Routes</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-700">Plan New</button>
                  </div>
                  {routes.map((route) => (
                    <div key={route.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{route.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          route.status === 'Active' ? 'bg-green-100 text-green-700' :
                          route.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {route.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="ml-1 font-medium">{route.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">ETA:</span>
                          <span className="ml-1 font-medium">{route.estimatedTime} min</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Safety:</span>
                          <span className="ml-1 font-medium">{route.safetyScore}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                          Activate
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                          Modify
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activePanel === 'resources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Emergency Resources</h3>
                    <span className="text-sm text-gray-500">{metrics.resourcesDeployed}/{metrics.totalResources} deployed</span>
                  </div>
                  {resources.map((resource) => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{resource.type}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          resource.status === 'Available' ? 'bg-green-100 text-green-700' :
                          resource.status === 'Deployed' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {resource.status}
                        </span>
                      </div>
                      {resource.assignedIncident && (
                        <p className="text-sm text-gray-600 mb-2">
                          Assigned to Incident #{resource.assignedIncident}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                          Track
                        </button>
                        <button className="flex-1 bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activePanel === 'analytics' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Performance Analytics</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">Response Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Response Time:</span>
                          <span className="font-medium">4.2 min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolution Rate:</span>
                          <span className="font-medium">94.8%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resource Efficiency:</span>
                          <span className="font-medium">87.3%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-medium text-gray-900 mb-2">Today's Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Incidents:</span>
                          <span className="font-medium">12</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolved:</span>
                          <span className="font-medium text-green-600">10</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active:</span>
                          <span className="font-medium text-red-600">2</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedEmergencyDashboard;
