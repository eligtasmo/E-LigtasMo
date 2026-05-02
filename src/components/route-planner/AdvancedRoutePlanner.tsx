import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { 
  FaCar, 
  FaWalking, 
  FaBicycle, 
  FaMotorcycle, 
  FaBus,
  FaRoute,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaClock,
  FaRoad,
  FaGasPump,
  FaShieldAlt,
  FaEye,
  FaShare,
  FaSave,
  FaHistory,
  FaFilter,
  FaSearch,
  FaLocationArrow,
  FaSync,
  FaChartLine,
  FaStar,
  FaHeart
} from 'react-icons/fa';
import { 
  MdMyLocation, 
  MdSwapVert, 
  MdClear, 
  MdSettings,
  MdTune,
  MdTimeline,
  MdTraffic,
  MdWarning,
  MdNavigation
} from 'react-icons/md';

// Enhanced types for the advanced route planner
interface RoutePreferences {
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidFerries: boolean;
  prioritizeSafety: boolean;
  fuelEfficient: boolean;
  scenic: boolean;
}

interface TrafficData {
  level: 'light' | 'moderate' | 'heavy' | 'severe';
  delay: number;
  incidents: number;
}

interface RouteAnalytics {
  safetyScore: number;
  trafficScore: number;
  fuelEfficiency: number;
  scenicValue: number;
  popularityScore: number;
}

interface EnhancedRoute {
  id: string;
  coordinates: [number, number][];
  distance: number;
  duration: number;
  traffic: TrafficData;
  analytics: RouteAnalytics;
  waypoints: any[];
  instructions: any[];
  hazards: any[];
  tollCost?: number;
  fuelCost?: number;
}

interface SavedRoute {
  id: string;
  name: string;
  route: EnhancedRoute;
  createdAt: Date;
  isFavorite: boolean;
  tags: string[];
}

const transportModes = [
  { id: 'driving', icon: FaCar, label: 'Driving', color: 'blue' },
  { id: 'walking', icon: FaWalking, label: 'Walking', color: 'green' },
  { id: 'cycling', icon: FaBicycle, label: 'Cycling', color: 'orange' },
  { id: 'motorcycle', icon: FaMotorcycle, label: 'Motorcycle', color: 'red' },
  { id: 'transit', icon: FaBus, label: 'Transit', color: 'purple' }
];

const AdvancedRoutePlanner: React.FC = () => {
  // State management
  const [startLocation, setStartLocation] = useState<[number, number] | null>(null);
  const [endLocation, setEndLocation] = useState<[number, number] | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [transportMode, setTransportMode] = useState('driving');
  const [routes, setRoutes] = useState<EnhancedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<EnhancedRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<RoutePreferences>({
    avoidTolls: false,
    avoidHighways: false,
    avoidFerries: false,
    prioritizeSafety: true,
    fuelEfficient: false,
    scenic: false
  });
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const mapRef = useRef<L.Map | null>(null);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    setIsTrackingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCurrentLocation(coords);
        setIsTrackingLocation(false);
        if (mapRef.current) {
          mapRef.current.setView(coords, 15);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsTrackingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Mock route calculation with enhanced features
  const calculateRoutes = useCallback(async () => {
    if (!startLocation || !endLocation) return;

    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock enhanced routes
    const mockRoutes: EnhancedRoute[] = [
      {
        id: '1',
        coordinates: [startLocation, endLocation],
        distance: 15.2,
        duration: 22,
        traffic: { level: 'moderate', delay: 5, incidents: 1 },
        analytics: {
          safetyScore: 85,
          trafficScore: 70,
          fuelEfficiency: 80,
          scenicValue: 60,
          popularityScore: 90
        },
        waypoints: [],
        instructions: [],
        hazards: [],
        tollCost: 45,
        fuelCost: 120
      },
      {
        id: '2',
        coordinates: [startLocation, endLocation],
        distance: 18.7,
        duration: 19,
        traffic: { level: 'light', delay: 2, incidents: 0 },
        analytics: {
          safetyScore: 95,
          trafficScore: 90,
          fuelEfficiency: 75,
          scenicValue: 85,
          popularityScore: 75
        },
        waypoints: [],
        instructions: [],
        hazards: [],
        tollCost: 0,
        fuelCost: 140
      },
      {
        id: '3',
        coordinates: [startLocation, endLocation],
        distance: 12.8,
        duration: 28,
        traffic: { level: 'heavy', delay: 12, incidents: 3 },
        analytics: {
          safetyScore: 60,
          trafficScore: 40,
          fuelEfficiency: 85,
          scenicValue: 40,
          popularityScore: 95
        },
        waypoints: [],
        instructions: [],
        hazards: [],
        tollCost: 25,
        fuelCost: 95
      }
    ];

    setRoutes(mockRoutes);
    setSelectedRoute(mockRoutes[0]);
    setIsLoading(false);
  }, [startLocation, endLocation]);

  // Save route functionality
  const saveRoute = useCallback((route: EnhancedRoute, name: string) => {
    const savedRoute: SavedRoute = {
      id: Date.now().toString(),
      name,
      route,
      createdAt: new Date(),
      isFavorite: false,
      tags: [transportMode]
    };
    setSavedRoutes(prev => [...prev, savedRoute]);
  }, [transportMode]);

  // Swap locations
  const swapLocations = useCallback(() => {
    setStartLocation(endLocation);
    setEndLocation(startLocation);
    setStartQuery(endQuery);
    setEndQuery(startQuery);
  }, [startLocation, endLocation, startQuery, endQuery]);

  // Clear all
  const clearAll = useCallback(() => {
    setStartLocation(null);
    setEndLocation(null);
    setStartQuery('');
    setEndQuery('');
    setRoutes([]);
    setSelectedRoute(null);
  }, []);

  return (
    <div className="h-screen bg-[#fcfcfd] flex overflow-hidden">
      {/* Left Panel - Modern Navigation & Controls */}
      <div className="w-80 h-full flex flex-col p-6 gap-6 overflow-y-auto no-scrollbar border-r border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
              <FaRoute className="text-white text-lg" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-black font-jetbrains uppercase">Planner</h1>
          </div>
          <button onClick={clearAll} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <MdClear size={20} />
          </button>
        </div>

        {/* Transport Mode Selection */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 font-jetbrains">Transport Mode</label>
          <div className="grid grid-cols-5 gap-2">
            {transportModes.map((mode) => {
              const IconComponent = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setTransportMode(mode.id)}
                  title={mode.label}
                  className={`flex items-center justify-center w-full aspect-square rounded-2xl transition-all duration-300 ${
                    transportMode === mode.id
                      ? 'bg-black text-white shadow-xl shadow-black/20 scale-105'
                      : 'bg-white text-gray-400 hover:text-black border border-gray-100 hover:border-black/10'
                  }`}
                >
                  <IconComponent size={18} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Location Inputs */}
        <div className="space-y-4">
          <div className="relative space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 font-jetbrains">From</label>
            <div className="relative group">
              <input
                type="text"
                value={startQuery}
                onChange={(e) => setStartQuery(e.target.value)}
                placeholder="Search starting point..."
                className="premium-input w-full pl-12"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              <button
                onClick={() => {
                  setStartLocation(currentLocation);
                  setStartQuery('Current Location');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-black hover:text-white transition-all duration-300"
              >
                <MdMyLocation size={16} />
              </button>
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <button
              onClick={swapLocations}
              className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-black hover:scale-110 shadow-sm transition-all"
            >
              <MdSwapVert size={20} />
            </button>
          </div>

          <div className="relative space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 font-jetbrains">To</label>
            <div className="relative group">
              <input
                type="text"
                value={endQuery}
                onChange={(e) => setEndQuery(e.target.value)}
                placeholder="Search destination..."
                className="premium-input w-full pl-12"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-black hover:text-white transition-all duration-300">
                <FaSearch size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={calculateRoutes}
          disabled={!startLocation || !endLocation || isLoading}
          className="btn-primary w-full flex items-center justify-center gap-3 py-4 shadow-xl shadow-black/10 group active:scale-[0.98]"
        >
          {isLoading ? (
            <FaSync className="animate-spin" />
          ) : (
            <>
              <FaRoute className="group-hover:translate-x-1 transition-transform" />
              <span className="font-bold tracking-tight">Calculate Best Route</span>
            </>
          )}
        </button>

        {/* Preferences Toggle */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={getCurrentLocation}
            disabled={isTrackingLocation}
            className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-600 hover:border-black/10 hover:text-black transition-all"
          >
            <FaLocationArrow className={isTrackingLocation ? 'animate-pulse' : ''} />
            My Location
          </button>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-[11px] font-bold transition-all ${
              showPreferences ? 'bg-black text-white' : 'bg-white border border-gray-100 text-gray-600 hover:border-black/10 hover:text-black'
            }`}
          >
            <MdTune size={16} />
            Options
          </button>
        </div>

        {/* Route Results */}
        {routes.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 font-jetbrains">Available Routes</label>
            <div className="space-y-3">
              {routes.map((route, index) => (
                <div
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`bento-card p-4 cursor-pointer relative overflow-hidden group ${
                    selectedRoute?.id === route.id
                      ? 'ring-2 ring-black bg-white shadow-2xl'
                      : 'border-gray-100 bg-white/50 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-black font-jetbrains">Route {index + 1}</span>
                    </div>
                    {index === 0 && (
                      <span className="capsule-chip bg-emerald-50 text-emerald-600 text-[10px]">RECOMMENDED</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <FaRoad size={12} />
                      <span className="text-xs font-bold font-jetbrains">{route.distance} km</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <FaClock size={12} />
                      <span className="text-xs font-bold font-jetbrains">{route.duration} min</span>
                    </div>
                  </div>
                  
                  {route.traffic.level === 'heavy' && (
                    <div className="mt-3 p-3 bg-red-50 rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                        <MdWarning />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-red-700 uppercase">Heavy Traffic</span>
                        <span className="text-[10px] text-red-600">+{route.traffic.delay} min delay ahead</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[14.5995, 120.9842]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {/* Start Marker */}
          {startLocation && (
            <Marker
              position={startLocation}
              icon={L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
                shadowSize: [41, 41]
              })}
            >
              <Popup>Starting Point</Popup>
            </Marker>
          )}

          {/* End Marker */}
          {endLocation && (
            <Marker
              position={endLocation}
              icon={L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.4/images/marker-shadow.png',
                shadowSize: [41, 41]
              })}
            >
              <Popup>Destination</Popup>
            </Marker>
          )}

          {/* Current Location */}
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
              })}
            >
              <Popup>Your Current Location</Popup>
            </Marker>
          )}

          {/* Route Polylines */}
          {routes.map((route, index) => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              color={selectedRoute?.id === route.id ? '#3b82f6' : '#94a3b8'}
              weight={selectedRoute?.id === route.id ? 6 : 3}
              opacity={selectedRoute?.id === route.id ? 0.8 : 0.5}
            />
          ))}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={getCurrentLocation}
            className="p-2 bg-white rounded shadow border text-gray-600 hover:bg-gray-50"
          >
            <MdNavigation />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedRoutePlanner;