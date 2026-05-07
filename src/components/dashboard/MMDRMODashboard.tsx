import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon } from '../../icons';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import { FaWater, FaFire, FaCarCrash, FaShieldAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { GiEarthCrack } from 'react-icons/gi';
import { FiAlertTriangle, FiAlertCircle, FiHome, FiActivity, FiExternalLink, FiTrendingUp, FiTrendingDown, FiMap, FiChevronRight, FiX, FiRefreshCw } from 'react-icons/fi';
import { RiEarthquakeLine } from 'react-icons/ri';
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from '../maps/MapboxMap';
import { Line, Doughnut } from 'react-chartjs-2';
import * as turf from '@turf/turf';
import Pin3D from '../maps/Pin3D';
import { SANTA_CRUZ_OUTLINE, DEFAULT_MAP_STATE } from '../../constants/geo';
import { SantaCruzMapboxOutline } from '../maps/SantaCruzOutline';
import TacticalCommsStatus from './TacticalCommsStatus';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

// Real incident interface from existing system
interface RealIncident {
  id: number;
  type: string;
  lat: number;
  lng: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  address: string;
  datetime: string;
  description: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  photo_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved';
  reporter: string;
  contact: string;
  created_at: string;
  updated_at: string;
}

// Dashboard incident interface (transformed from real data)
interface IncidentData {
  id: number | string;
  type: string;
  location: string;
  severity: 'Low' | 'Medium' | 'Moderate' | 'High' | 'Critical';
  status: 'Active' | 'Responding' | 'Resolved';
  time: string;
  lat: number;
  lng: number;
  responders?: number;
  // precise timestamp for filtering
  reportedAt?: string;
  source?: 'incident' | 'flood_report';
  sourceId?: number;
  area_geojson?: any;
}

// Real emergency contact interface from existing page
interface EmergencyContact {
  id: number;
  name: string;
  type: 'police' | 'fire' | 'ambulance' | 'rescue' | 'disaster' | 'other';
  phone: string;
  address: string;
  hours: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: any; // Using any for icon components to avoid strict prop matching issues with different icon libraries
  color: string;
  description?: string;
  unit?: string;
}

// Road zone interface
interface RoadZone {
  id: number;
  name: string;
  status: 'closed' | 'restricted' | 'monitoring' | 'clear';
  type: 'flood' | 'accident' | 'construction' | 'weather' | 'landslide';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  reportedAt: string;
  estimatedClearance: string;
}

// Shelter interface
interface Shelter {
  id: number;
  name: string;
  status: 'available' | 'full' | 'maintenance';
  capacity: number;
  occupancy: number;
  address: string;
  contact_person: string;
  contact_number: string;
  type: string;
}

// Enhanced interfaces for comprehensive data
interface DangerZone {
  id: string;
  path: [number, number][];
  description: string;
  reportedBy: string;
  reportedAt: string;
  type: string;
}

// Hazard interface
interface Hazard {
  id: string;
  type: string;
  severity: string;
  location: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  latitude?: number;
  longitude?: number;
  created_at: string;
}

interface EnhancedShelter extends Omit<Shelter, 'status' | 'address' | 'occupancy' | 'contact_person' | 'contact_number'> {
  occupancy?: number;
  status?: string;
  contact_person?: string;
  contact_number?: string;
  address?: string;
  lat: number;
  lng: number;
  facilities?: string[];
  lastUpdated?: string;
  emergencyContact?: string;
}

// Real emergency contacts data from existing page
const emergencyContacts: EmergencyContact[] = [
  {
    id: 1,
    name: "Philippine National Police (PNP)",
    type: "police",
    phone: "911",
    address: "Camp Crame, Quezon City",
    hours: "24/7",
    description: "National emergency hotline for police assistance",
    priority: "high"
  },
  {
    id: 2,
    name: "Bureau of Fire Protection (BFP)",
    type: "fire",
    phone: "911",
    address: "Agham Road, Quezon City",
    hours: "24/7",
    description: "Fire emergency response",
    priority: "high"
  },
  {
    id: 3,
    name: "Philippine Red Cross",
    type: "ambulance",
    phone: "143",
    address: "Bonifacio Drive, Port Area, Manila",
    hours: "24/7",
    description: "Emergency medical services and disaster response",
    priority: "high"
  },
  {
    id: 4,
    name: "Metro Manila Development Authority (MMDA)",
    type: "rescue",
    phone: "136",
    address: "EDSA, Makati City",
    hours: "24/7",
    description: "Traffic management and emergency response",
    priority: "high"
  },
  {
    id: 5,
    name: "National Disaster Risk Reduction and Management Council (NDRRMC)",
    type: "disaster",
    phone: "911-1406",
    address: "Camp Aguinaldo, Quezon City",
    hours: "24/7",
    description: "National disaster coordination center",
    priority: "high"
  },
  {
    id: 6,
    name: "Philippine Coast Guard",
    type: "rescue",
    phone: "527-8481",
    address: "Port Area, Manila",
    hours: "24/7",
    description: "Maritime search and rescue",
    priority: "medium"
  }
];

// Add new interfaces for comprehensive data
interface DangerZone {
  id: string;
  path: [number, number][];
  description: string;
  reportedBy: string;
  reportedAt: string;
  type: string;
}

interface Hazard {
  id: string;
  type: string;
  severity: string;
  location: string;
  description: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  status: string;
}

const MMDRMODashboard: React.FC = () => {
  const navigate = useNavigate();
  // Admin dashboard metrics range (affects only top metrics, not map)
  const [metricsRange, setMetricsRange] = useState<'24h' | '7d' | '30d' | '90d'>('24h');
  const [metricsRangeMenuOpen, setMetricsRangeMenuOpen] = useState<string | null>(null);

  const getRangeLabel = (r: '24h' | '7d' | '30d' | '90d') => {
    switch (r) {
      case '24h': return 'Today';
      case '7d': return 'Week';
      case '30d': return 'Month';
      case '90d': return 'Quarter';
      default: return 'Today';
    }
  };
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const metricsDates = useMemo(() => {
    const end = currentTime instanceof Date ? currentTime : new Date();
    const start = new Date(end.getTime());
    switch (metricsRange) {
      case '24h':
        start.setHours(end.getHours() - 24);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
    const label = metricsRange === '24h'
      ? end.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })
      : `${fmt(start)}–${fmt(end)} ${end.getFullYear()}`;
    return { start, end, label };
  }, [metricsRange, currentTime]);
  const [activeIncidents, setActiveIncidents] = useState<IncidentData[]>([]);
  const [dashboardIncidents, setDashboardIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  
  // Interactive filtering and sorting states
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'Critical' | 'High' | 'Active'>('all');
  const [incidentSort, setIncidentSort] = useState<'time' | 'severity' | 'type'>('time');

  const [showFloodDetails, setShowFloodDetails] = useState(false);

  // Filtered and sorted incidents
  const filteredIncidents = useMemo(() => {
    let filtered = activeIncidents;
    
    // Apply filter
    if (incidentFilter !== 'all') {
      if (incidentFilter === 'Active') {
        filtered = filtered.filter(incident => incident.status === 'Active');
      } else {
        filtered = filtered.filter(incident => incident.severity === incidentFilter);
      }
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (incidentSort) {
        case 'severity':
          const severityOrder = { 'Critical': 5, 'High': 4, 'Medium': 3, 'Moderate': 2, 'Low': 1 };
          return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
        case 'type':
          return a.type.localeCompare(b.type);
        case 'time':
        default:
          return new Date(b.time).getTime() - new Date(a.time).getTime();
      }
    });
    
    return sorted;
  }, [activeIncidents, incidentFilter, incidentSort]);

  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [enhancedShelters, setEnhancedShelters] = useState<EnhancedShelter[]>([]);
  const [brgys, setBarangays] = useState<any[]>([]);
  
  // Filter states for map markers
  const [showIncidents, setShowIncidents] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  
  const [showRoadZones, setShowRoadZones] = useState(true);
  const [apiStatus, setApiStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({
    'Authentication': 'checking',
    'Incident Engine': 'checking',
    'Hazard Intel': 'checking',
    'Shelter Comms': 'checking',
    'Danger Zone API': 'checking'
  });

  const checkApiHealth = async () => {
    const endpoints = [
      { name: 'Authentication', path: 'session.php' },
      { name: 'Incident Engine', path: 'fetch_incidents.php' },
      { name: 'Hazard Intel', path: 'list-hazards.php' },
      { name: 'Shelter Comms', path: 'shelters-list.php' },
      { name: 'Danger Zone API', path: 'list-danger-zones.php' }
    ];

    for (const api of endpoints) {
      try {
        const start = Date.now();
        const res = await apiFetch(api.path);
        if (res.ok) {
          setApiStatus(prev => ({ ...prev, [api.name]: 'online' }));
        } else {
          setApiStatus(prev => ({ ...prev, [api.name]: 'offline' }));
        }
      } catch (e) {
        setApiStatus(prev => ({ ...prev, [api.name]: 'offline' }));
      }
    }
  };

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Date filtering for visible incidents on map and charts
  const [datePreset, setDatePreset] = useState<'all' | '24h' | '7d' | '30d' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const setDateByPreset = (preset: 'all' | '24h' | '7d' | '30d' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === '24h') {
      const start = new Date(now);
      start.setDate(now.getDate());
      setDateFrom(toIsoDate(start));
      setDateTo(toIsoDate(now));
    } else if (preset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setDateFrom(toIsoDate(start));
      setDateTo(toIsoDate(now));
    } else if (preset === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      setDateFrom(toIsoDate(start));
      setDateTo(toIsoDate(now));
    } else {
      // custom: keep user-provided dates
    }
  };

  const incidentMatchesDate = (incident: IncidentData) => {
    if (!dateFrom && !dateTo) return true;
    const ts = incident.reportedAt ? new Date(incident.reportedAt) : undefined;
    if (!ts || isNaN(ts.getTime())) return true; // if no timestamp, don't exclude
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (ts < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      if (ts > to) return false;
    }
    return true;
  };

  const visibleIncidents = useMemo(() => {
    return (dashboardIncidents || []).filter(incidentMatchesDate);
  }, [dashboardIncidents, dateFrom, dateTo, datePreset]);

  // Calculate All Affected Areas Data for Detail View
  const allFloodData = useMemo(() => {
    const floodIncidents = (visibleIncidents || []).filter(i => i.type === 'Flood');
    const locationData: Record<string, { count: number, severitySum: number, incidents: IncidentData[] }> = {};
    
    const severityMap: Record<string, number> = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Critical': 4
    };

    floodIncidents.forEach(i => {
      const loc = i.location || 'Unknown';
      if (!locationData[loc]) {
        locationData[loc] = { count: 0, severitySum: 0, incidents: [] };
      }
      locationData[loc].count += 1;
      locationData[loc].severitySum += severityMap[i.severity] || 0;
      locationData[loc].incidents.push(i);
    });

    return Object.entries(locationData)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgSeverity: data.count > 0 ? data.severitySum / data.count : 0,
        severityLevel: (data.severitySum / data.count) >= 3.5 ? 'Critical' :
                       (data.severitySum / data.count) >= 2.5 ? 'High' :
                       (data.severitySum / data.count) >= 1.5 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => b.avgSeverity - a.avgSeverity || b.count - a.count); // Sort by severity then count
  }, [visibleIncidents]);

  // Incident Trends granularity and computed time-series
  const [incidentTrendGranularity, setIncidentTrendGranularity] = useState<'day' | 'week' | 'month'>('week');
  // Sync incident trend granularity with header metricsRange selection
  useEffect(() => {
    switch (metricsRange) {
      case '24h':
        setIncidentTrendGranularity('day');
        break;
      case '7d':
        setIncidentTrendGranularity('week');
        break;
      case '30d':
      case '90d':
        setIncidentTrendGranularity('month');
        break;
    }
  }, [metricsRange]);
  const incidentTrend = useMemo(() => {
    const now = currentTime ? new Date(currentTime) : new Date();
    let bucketCount = 7;
    let start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    let labels: string[] = [];

    if (incidentTrendGranularity === 'day') {
      bucketCount = 24;
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    } else if (incidentTrendGranularity === 'week') {
      bucketCount = 7;
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        return days[d.getDay()];
      });
    } else {
      bucketCount = 30;
      start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      labels = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      });
    }

    const values = Array(bucketCount).fill(0) as number[];
    (visibleIncidents || []).forEach((inc) => {
      // Count all incidents for the trend
      // if (inc.type !== 'Flood') return; 

      if (!inc.reportedAt) return;
      const ts = new Date(inc.reportedAt);
      if (isNaN(ts.getTime())) return;
      if (ts < start || ts > now) return;
      const idx = incidentTrendGranularity === 'day'
        ? Math.floor((ts.getTime() - start.getTime()) / (60 * 60 * 1000))
        : Math.floor((ts.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < values.length) values[idx]++;
    });

    const total = values.reduce((a, b) => a + b, 0);
    const last = values[values.length - 1] || 0;
    const prev = values[values.length - 2] ?? last;
    const change = prev ? Math.round(((last - prev) / prev) * 100) : 0;
    const trend: 'up' | 'down' | 'stable' = last > prev ? 'up' : last < prev ? 'down' : 'stable';

    return { labels, values, total, change, trend };
  }, [visibleIncidents, incidentTrendGranularity, currentTime]);



  // Road zones data
  const [roadZones] = useState<RoadZone[]>([
    {
      id: 1,
      name: 'Main Street Bridge',
      status: 'closed',
      type: 'flood',
      severity: 'high',
      description: 'Heavy flooding due to recent rainfall. Road impassable.',
      reportedBy: 'Traffic Control',
      reportedAt: new Date().toISOString(),
      estimatedClearance: '6 hours'
    },
    {
      id: 2,
      name: 'Highway Junction A',
      status: 'restricted',
      type: 'accident',
      severity: 'medium',
      description: 'Vehicle accident blocking one lane. Traffic moving slowly.',
      reportedBy: 'Field Officer',
      reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      estimatedClearance: '2 hours'
    },
    {
      id: 3,
      name: 'Coastal Road Section',
      status: 'monitoring',
      type: 'weather',
      severity: 'low',
      description: 'Strong winds reported. Monitoring for potential hazards.',
      reportedBy: 'Weather Station',
      reportedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      estimatedClearance: 'TBD'
    }
  ]);

  // Enhanced Shelters data with coordinates
  const [shelters, setShelters] = useState<EnhancedShelter[]>([]);

  // Transform real incident data to dashboard format
  const transformIncidentData = (realIncidents: RealIncident[]): IncidentData[] => {
    return realIncidents.map(incident => {
      // Calculate time ago
      const timeAgo = getTimeAgo(incident.created_at);
      
      // Map severity
      const severity = incident.severity === 'Moderate' ? 'Medium' : incident.severity;
      
      // Map status - treat Approved as Active, Pending as Responding
      let status: 'Active' | 'Responding' | 'Resolved';
      if (incident.status === 'Resolved') {
        status = 'Resolved';
      } else if (incident.status === 'Pending') {
        status = 'Responding';
      } else {
        status = 'Active';
      }

      // Generate random responder count based on severity
      const responders = severity === 'Critical' ? Math.floor(Math.random() * 5) + 6 :
                        severity === 'High' ? Math.floor(Math.random() * 3) + 3 :
                        severity === 'Medium' ? Math.floor(Math.random() * 2) + 2 :
                        Math.floor(Math.random() * 2) + 1;

      // Validate coordinates and provide fallback values around Santa Cruz, Laguna
      const lat = typeof incident.lat === 'number' && !isNaN(incident.lat) ? incident.lat : 14.2833;
      const lng = typeof incident.lng === 'number' && !isNaN(incident.lng) ? incident.lng : 121.4167;

      return {
        id: incident.id,
        type: incident.type,
        location: incident.address,
        severity: severity as 'Low' | 'Medium' | 'High' | 'Critical',
        status,
        time: timeAgo,
        lat,
        lng,
        responders,
        reportedAt: incident.datetime || incident.created_at,
        source: 'incident',
        sourceId: Number(incident.id)
      };
    });
  };

  // Helper function to calculate time ago
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    return `${Math.floor(diffInMinutes / 1440)} day ago`;
  };

  // Enhanced data fetching functions
  const fetchHazards = async () => {
    try {
      const response = await apiFetch('list-hazards.php');
      const data = await response.json();
      setHazards(data || []);
    } catch (error) {
      console.error('Error fetching hazards:', error);
      setHazards([]);
    }
  };

  const fetchDangerZones = async () => {
    try {
      const response = await apiFetch('list-danger-zones.php');
      const data = await response.json();
      setDangerZones(data || []);
    } catch (error) {
      console.error('Error fetching danger zones:', error);
      setDangerZones([]);
    }
  };

  const fetchEnhancedShelters = async () => {
    try {
      const response = await apiFetch('shelters-list.php');
      const data = await response.json();
      setEnhancedShelters(data || []);
    } catch (error) {
      console.error('Error fetching shelters:', error);
      // Fallback to db.json
      try {
        const fallbackResponse = await apiFetch('shelters-list.php');
        const fallbackData = await fallbackResponse.json();
        setEnhancedShelters(fallbackData || []);
      } catch (fallbackError) {
        console.error('Error fetching fallback shelters:', fallbackError);
        setEnhancedShelters([]);
      }
    }
  };

  // Fetch real incidents from API
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const activeResponse = await apiFetch('list-incidents.php?status=Approved&limit=200');
      const activeData = await activeResponse.json();
      
      const pendingResponse = await apiFetch('list-incidents.php?status=Pending&limit=200');
      const pendingData = await pendingResponse.json();

      const resolvedResponse = await apiFetch('list-incidents.php?status=Resolved&limit=200');
      const resolvedData = await resolvedResponse.json();
      
      const totalResponse = await apiFetch('list-incidents.php?limit=1000');
      const totalData = await totalResponse.json();

      // Fetch incident reports (like resident view)
      const floodResponse = await apiFetch('list-incident-reports.php');
      const floodData = await floodResponse.json();

      let transformedActive: IncidentData[] = [];
      if (activeData.success) {
        transformedActive = transformIncidentData(activeData.incidents || []);
      }

      let transformedFlood: IncidentData[] = [];
      if (Array.isArray(floodData)) {
        transformedFlood = floodData.map((report: any) => {
           const timeAgo = getTimeAgo(report.time);
           let status: 'Active' | 'Responding' | 'Resolved';
           if (report.status === 'Resolved') status = 'Resolved';
           else if (report.status === 'Pending') status = 'Responding';
           else status = 'Active'; // Verified -> Active

           return {
              id: `flood-${report.id}`,
              type: 'Flood',
              location: report.brgy || 'Unknown Location',
              severity: (report.severity as 'Low' | 'Medium' | 'High' | 'Critical') || 'Medium',
              status,
              time: timeAgo,
              lat: typeof report.lat === 'number' ? report.lat : parseFloat(report.lat),
              lng: typeof report.lng === 'number' ? report.lng : parseFloat(report.lng),
              responders: Math.floor(Math.random() * 3) + 1,
              reportedAt: report.time,
              source: 'flood_report',
              sourceId: Number(report.id),
              area_geojson: report.area_geojson || null
           };
        });
      }

      let transformedResolved: IncidentData[] = [];
      if (resolvedData.success) {
        transformedResolved = transformIncidentData(resolvedData.incidents || []);
      }

      // Combine active incidents and active incident reports for the map
      const activeFloods = transformedFlood.filter(f => f.status !== 'Resolved');
      const combinedActive = [...transformedActive, ...activeFloods];
      setActiveIncidents(combinedActive);

      // Combine all for dashboard metrics/tables
      const combined = [...transformedActive, ...transformedResolved, ...transformedFlood];
      setDashboardIncidents(combined);

      if (pendingData.success) {
        setPendingIncidents(pendingData.count || 0);
      }

      if (totalData.success) {
        // Adjust total count to include incident reports
        setTotalIncidents((totalData.count || 0) + transformedFlood.length);
      }
    } catch (error) {
      console.error('Error fetching incidents:', error);
      // Fallback to sample data if API fails (centered in Santa Cruz, Laguna)
      setActiveIncidents([
        {
          id: 1,
          type: 'Flood',
          location: 'Barangay San Antonio',
          severity: 'High',
          status: 'Active',
          time: '2 min ago',
          lat: 14.2833,
          lng: 121.4167,
          responders: 3
        },
        {
          id: 2,
          type: 'Fire',
          location: 'Barangay Central',
          severity: 'Critical',
          status: 'Responding',
          time: '5 min ago',
          lat: 14.29,
          lng: 121.42,
          responders: 8
        }
      ]);
    }
    setLoading(false);
  };

  // Fetch shelters from API
  const fetchShelters = async () => {
    try {
      const response = await apiFetch('shelters-list.php');
      const data = await response.json();
      
      // Transform shelter data to include coordinates and enhanced properties
      const shelterList = Array.isArray(data) ? data : [];
      const enhancedShelters: EnhancedShelter[] = shelterList.map((shelter: any) => ({
        id: shelter.id,
        name: shelter.name,
        status: shelter.status,
        capacity: shelter.capacity,
        occupancy: shelter.occupancy,
        address: shelter.address,
        contact_person: shelter.contact_person,
        contact_number: shelter.contact_number,
        type: shelter.category || shelter.type || 'Emergency Shelter',
        lat: shelter.lat || 14.2833, // Fallback coordinates if not provided
        lng: shelter.lng || 121.4167,
        facilities: shelter.facilities || ['Basic Amenities'],
        lastUpdated: shelter.updated_at || new Date().toISOString(),
        emergencyContact: shelter.emergency_contact || shelter.contact_number
      }));
      
      setShelters(enhancedShelters);
    } catch (error) {
      console.error('Error fetching shelters:', error);
      // Fallback to sample data with coordinates around Santa Cruz, Laguna
      setShelters([
        {
          id: 1,
          name: 'Barangay Hall Evacuation Center',
          status: 'available',
          capacity: 200,
          occupancy: 45,
          address: 'Barangay San Antonio',
          contact_person: 'Maria Santos',
          contact_number: '09123456789',
          type: 'Primary Shelter',
          lat: 14.2833,
          lng: 121.4167,
          facilities: ['Medical Station', 'Kitchen', 'Restrooms'],
          lastUpdated: new Date().toISOString(),
          emergencyContact: '09123456789'
        },
        {
          id: 2,
          name: 'Community Center Shelter',
          status: 'available',
          capacity: 150,
          occupancy: 120,
          address: 'Barangay Poblacion',
          contact_person: 'Juan Dela Cruz',
          contact_number: '09987654321',
          type: 'Secondary Shelter',
          lat: 14.29,
          lng: 121.42,
          facilities: ['Kitchen', 'Restrooms'],
          lastUpdated: new Date().toISOString(),
          emergencyContact: '09987654321'
        }
      ]);
    }
  };


  // Analytics data now adapts to selected metrics range (header control)
  const keyMetrics = useMemo<MetricCard[]>(() => {
    // Calculate High Priority Incidents (High or Critical severity)
    const highPriorityIncidents = visibleIncidents.filter(i => 
      (i.severity === 'High' || i.severity === 'Critical')
    ).length;

    return [
      {
        title: 'Total Incident Reports',
        value: String(incidentTrend.total),
        change: incidentTrend.change,
        trend: incidentTrend.trend,
        icon: FiActivity,
        color: 'red',
        description: metricsRange === '24h' ? 'Reported today' : `Reported (${metricsRange})`,
        unit: ''
      },
      {
        title: 'Critical Incidents',
        value: String(highPriorityIncidents),
        change: 0,
        trend: 'stable',
        icon: FiAlertCircle,
        color: 'blue',
        description: 'High/Critical Severity',
        unit: ''
      },
      {
        title: 'Total Shelters',
        value: String(shelters.length),
        change: 0,
        trend: 'stable',
        icon: FiHome,
        color: 'green',
        description: 'Available Centers',
        unit: ''
      }
    ];
  }, [metricsRange, incidentTrend, visibleIncidents, shelters, totalIncidents]);

  const [incidentTypeView, setIncidentTypeView] = useState<'all' | 'hazards' | 'road'>('hazards');
  // Chart data (enhanced with real incident types)
  const getIncidentTypeData = () => {
    const displayCounts = {
      'High': 0,
      'Moderate': 0,
      'Low': 0
    };

    activeIncidents.forEach(incident => {
        const sev = incident.severity;
        if (sev === 'Critical' || sev === 'High') {
          displayCounts['High']++;
        } else if (sev === 'Medium' || sev === 'Moderate') {
          displayCounts['Moderate']++;
        } else {
          displayCounts['Low']++;
        }
    });

    const labels = ['High', 'Moderate', 'Low'];
    const colorMap: Record<string, string> = {
      'High': '#ef4444',     // Red
      'Moderate': '#eab308', // Yellow
      'Low': '#3b82f6'       // Blue
    };

    const data = labels.map(l => displayCounts[l as keyof typeof displayCounts]);
    
    // Sort by value descending
    const pairs = labels.map((l, i) => ({ 
      label: l, 
      value: data[i], 
      color: colorMap[l] 
    }));
    
    pairs.sort((a, b) => b.value - a.value);

    return {
      labels: pairs.map(p => p.label),
      datasets: [
        {
          data: pairs.map(p => p.value),
          backgroundColor: pairs.map(p => p.color),
          borderWidth: 0,
        }
      ]
    };
  };

  const incidentData = getIncidentTypeData();

  const incidentTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Incidents',
        data: [12, 19, 8, 15, 6, 9, 14],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const fetchBarangays = async () => {
    try {
      const response = await apiFetch('list-brgys.php');
      const data = await response.json();
      if (data.success && Array.isArray(data.brgys)) {
        setBarangays(data.brgys);
      }
    } catch (error) {
      console.error('Error fetching brgys:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchHazards();
    fetchDangerZones();
    fetchShelters();
    fetchBarangays();
    
    // Refresh all data every 60 seconds
    const interval = setInterval(() => {
      fetchIncidents();
      fetchHazards();
      fetchDangerZones();
      fetchShelters();
      fetchBarangays();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-black';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-red-100 text-red-800';
      case 'Responding': return 'bg-blue-100 text-blue-800';
      case 'Resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'police': return 'bg-blue-500';
      case 'fire': return 'bg-red-500';
      case 'ambulance': return 'bg-green-500';
      case 'rescue': return 'bg-orange-500';
      case 'disaster': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getContactPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const getRoadZoneStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'bg-red-100 text-red-800 border-l-red-500';
      case 'restricted': return 'bg-yellow-100 text-yellow-800 border-l-yellow-500';
      case 'monitoring': return 'bg-blue-100 text-blue-800 border-l-blue-500';
      case 'clear': return 'bg-green-100 text-green-800 border-l-green-500';
      default: return 'bg-gray-100 text-gray-800 border-l-gray-500';
    }
  };

  const getShelterStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-l-green-500';
      case 'full': return 'bg-red-100 text-red-800 border-l-red-500';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-l-yellow-500';
      default: return 'bg-gray-100 text-gray-800 border-l-gray-500';
    }
  };

  const getShelterOccupancyPercentage = (occupancy: number, capacity: number) => {
    return Math.round((occupancy / capacity) * 100);
  };

  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'incident' | 'shelter' | 'road';
    data: any;
  } | null>(null);

  const [promoting, setPromoting] = useState(false);

  const promoteMarkerToHazard = async () => {
    if (!selectedMarker || selectedMarker.type !== 'incident') return;
    if (promoting) return;
    setPromoting(true);
    try {
      const incident = selectedMarker.data as IncidentData;
      const severityRaw = String(incident.severity || 'Medium');
      const severity =
        severityRaw === 'Moderate' ? 'Moderate' :
        severityRaw === 'Critical' ? 'Critical' :
        severityRaw === 'High' ? 'High' :
        severityRaw === 'Low' ? 'Low' :
        'Medium';
      const radiusMeters = severity === 'Critical' ? 350 : severity === 'High' ? 250 : (severity === 'Medium' || severity === 'Moderate') ? 160 : 110;
      const center: [number, number] = [Number(incident.lng), Number(incident.lat)];
      const area = turf.circle(center, radiusMeters / 1000, { steps: 64, units: 'kilometers' }) as any;

      const source = incident.source || (String(incident.id).startsWith('flood-') ? 'flood_report' : 'incident');
      const sourceId = Number(incident.sourceId ?? (source === 'flood_report' ? String(incident.id).replace('flood-', '') : incident.id));

      let payload: any = null;
      if (source === 'flood_report') {
        const r = await apiFetch(`list-incident-reports.php?id=${encodeURIComponent(String(sourceId))}`);
        const rows = await r.json();
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) throw new Error('Flood report not found');
        payload = {
          type: 'Flood',
          lat: Number(row.lat),
          lng: Number(row.lng),
          address: row.location_text || row.brgy || incident.location || 'Flood report',
          datetime: row.time || new Date().toISOString(),
          description: row.description || '',
          severity: row.severity || severity,
          reporter: row.reporter_name || row.approved_by || 'MDRRMO',
          contact: row.reporter_contact || 'N/A',
          email: row.reporter_email || '',
          photoUrl: row.media_path || '',
          brgy: row.brgy || '',
          area_geojson: area,
          allowedVehicles: [],
        };
      } else {
        const r = await apiFetch(`list-incidents.php?id=${encodeURIComponent(String(sourceId))}&limit=1`);
        const json = await r.json();
        const row = json?.success && Array.isArray(json?.incidents) ? json.incidents[0] : null;
        if (!row) throw new Error('Incident not found');
        payload = {
          type: row.type || incident.type || 'Incident',
          lat: Number(row.lat ?? incident.lat),
          lng: Number(row.lng ?? incident.lng),
          address: row.address || incident.location || 'Incident',
          datetime: row.datetime || row.created_at || new Date().toISOString(),
          description: row.description || '',
          severity: row.severity || severity,
          photoUrl: row.photo_url || '',
          reporter: row.reporter || row.reported_by || 'MDRRMO',
          contact: row.contact || 'N/A',
          email: row.email || '',
          brgy: row.brgy || '',
          area_geojson: area,
          allowedVehicles: [],
        };
      }

      const res = await apiFetch('add-hazard.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await res.json();
      if (!out?.success) throw new Error(out?.error || 'Failed to create hazard');
      await fetchHazards();
      setSelectedMarker(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to promote to hazard');
    } finally {
      setPromoting(false);
    }
  };

  const hazardAreasFc = useMemo(() => {
    const features: any[] = [];
    const hazardList = Array.isArray(hazards) ? hazards : [];
    for (const h of hazardList as any[]) {
      const sevRaw = String(h?.severity || 'Medium').toLowerCase();
      const sev = sevRaw === 'critical' ? 'critical' : sevRaw === 'high' ? 'high' : sevRaw === 'moderate' || sevRaw === 'medium' ? 'medium' : sevRaw === 'low' ? 'low' : 'medium';
      const height = sev === 'critical' ? 120 : sev === 'high' ? 80 : sev === 'medium' ? 50 : 30;
      let geo: any = null;
      const areaRaw = h?.area_geojson;
      if (areaRaw) {
        try {
          geo = typeof areaRaw === 'string' ? JSON.parse(areaRaw) : areaRaw;
        } catch {
          geo = null;
        }
      }
      if (geo) {
        if (geo.type === 'Feature' && geo.geometry) {
          features.push({ ...geo, properties: { ...(geo.properties || {}), severity: sev, height, id: h.id } });
        } else if (geo.type && geo.coordinates) {
          features.push({ type: 'Feature', geometry: geo, properties: { severity: sev, height, id: h.id } });
        }
        continue;
      }
      const lat = Number(h?.lat ?? h?.latitude);
      const lng = Number(h?.lng ?? h?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const radiusMeters = sev === 'critical' ? 350 : sev === 'high' ? 250 : sev === 'medium' ? 160 : 110;
      try {
        const poly = turf.circle([lng, lat], radiusMeters / 1000, { steps: 64, units: 'kilometers' }) as any;
        poly.properties = { ...(poly.properties || {}), severity: sev, height, id: h.id };
        features.push(poly);
      } catch {}
    }
    return { type: 'FeatureCollection' as const, features };
  }, [hazards]);

  const floodAreasFc = useMemo(() => {
    const features: any[] = [];
    const incidentList = Array.isArray(activeIncidents) ? activeIncidents : [];
    for (const i of incidentList) {
      if (String(i.type || '').toLowerCase() !== 'flood') continue;
      if (i.status === 'Resolved') continue;
      const sevRaw = String(i.severity || 'Medium').toLowerCase();
      const sev = sevRaw === 'critical' ? 'critical' : sevRaw === 'high' ? 'high' : sevRaw === 'moderate' || sevRaw === 'medium' ? 'medium' : sevRaw === 'low' ? 'low' : 'medium';
      const height = sev === 'critical' ? 110 : sev === 'high' ? 70 : sev === 'medium' ? 45 : 28;
      const areaRaw = (i as any)?.area_geojson;
      if (areaRaw) {
        try {
          const geo = typeof areaRaw === 'string' ? JSON.parse(areaRaw) : areaRaw;
          if (geo?.type === 'Feature' && geo?.geometry) {
            features.push({ ...geo, properties: { ...(geo.properties || {}), severity: sev, height, id: i.id } });
            continue;
          }
          if (geo?.type && geo?.coordinates) {
            features.push({ type: 'Feature', geometry: geo, properties: { severity: sev, height, id: i.id } });
            continue;
          }
        } catch {}
      }
      const lat = Number(i.lat);
      const lng = Number(i.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const radiusMeters = sev === 'critical' ? 350 : sev === 'high' ? 250 : sev === 'medium' ? 160 : 110;
      try {
        const poly = turf.circle([lng, lat], radiusMeters / 1000, { steps: 64, units: 'kilometers' }) as any;
        poly.properties = { ...(poly.properties || {}), severity: sev, height, id: i.id };
        features.push(poly);
      } catch {}
    }
    return { type: 'FeatureCollection' as const, features };
  }, [activeIncidents]);

  // Get high priority contacts for dashboard display
  const priorityContacts = emergencyContacts.filter(contact => contact.priority === 'high').slice(0, 4);

  return (
    <>
      {/* Custom CSS for enhanced map styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e5e7eb;
          }
          .custom-popup .leaflet-popup-content {
            margin: 0;
            padding: 0;
          }
          .custom-popup .leaflet-popup-tip {
            background: white;
            border: 1px solid #e5e7eb;
          }
          .leaflet-control-zoom {
            border: 1px solid #e5e7eb !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          }
          .leaflet-control-zoom a {
            background-color: white !important;
            border: none !important;
            color: #374151 !important;
            font-weight: 600 !important;
          }
          .leaflet-control-zoom a:hover {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
          }
          /* Hide default Leaflet attribution in bottom-right */
          .leaflet-control-attribution { display: none !important; }
        `
      }} />
      
      <div className="min-h-screen bg-white text-slate-900 relative z-10 font-outfit">
        <div className="bg-slate-900 p-6 sm:p-8 border-b border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <FaShieldAlt size={160} className="text-white" />
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/40 border border-blue-500/30 group hover:scale-105 transition-transform duration-500">
                <FaShieldAlt className="text-3xl text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">
                  Strategic <span className="text-blue-500">Command</span>
                </h1>
                <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  Municipal Operations // LIVE_FEED_ACTIVE
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="text-right mr-6 border-r border-slate-800 pr-6 hidden sm:block">
                <div className="text-2xl font-black text-white leading-none tracking-tighter tabular-nums">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Tactical Time</div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/50 backdrop-blur-md">
                   <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Scope:</span>
                      <select
                        className="text-[10px] bg-transparent text-white font-black uppercase outline-none cursor-pointer"
                        value={metricsRange}
                        onChange={(e) => setMetricsRange(e.target.value as any)}
                      >
                        <option value="24h">Today</option>
                        <option value="7d">Week</option>
                        <option value="30d">Month</option>
                      </select>
                   </div>
                </div>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black tracking-widest text-[10px] uppercase shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  Execute_Mission
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Strategic Situation Ribbon */}
      <div className="px-8 mt-8">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-14 bg-slate-900 rounded-2xl flex items-center px-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent animate-pulse" />
            <div className="flex items-center gap-6 relative z-10 w-full">
              <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="text-[11px] font-black text-white tracking-[0.2em] uppercase">Protocol_Alpha</span>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase mr-4">Situation_Matrix:</span>
                <span className="text-[11px] font-black text-emerald-400 tracking-widest uppercase animate-in fade-in duration-1000">
                  Sector_Stability_Verified // No_Immediate_Threats_Detected
                </span>
              </div>
              <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="opacity-40 uppercase">Uplink:</span>
                  <span className="text-blue-400">99.9%_SIG</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="opacity-40 uppercase">Engine:</span>
                  <span className="text-blue-400 font-mono">v4.2.0</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl flex items-center px-6 h-14 gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-900 tracking-tighter leading-none mb-1">MUNICIPAL_LINK</span>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active_Sync</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50 shadow-inner">
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Quick Service Health Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {Object.entries(apiStatus).map(([name, status]) => (
            <div key={name} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group hover:bg-white transition-all hover:shadow-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                  status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 
                  'bg-amber-400'
                }`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">{name}</span>
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${
                status === 'online' ? 'text-emerald-600' : 
                status === 'offline' ? 'text-red-600' : 
                'text-amber-600'
              }`}>
                {status}
              </span>
            </div>
          ))}
        </div>

      {/* Enhanced Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const colorMap = {
            red: 'blue', // Standardize to blue/slate for premium look
            blue: 'blue',
            green: 'emerald',
            yellow: 'orange',
            orange: 'orange',
            purple: 'purple'
          };
          const color = (colorMap as any)[metric.color] || 'blue';
          
          return (
            <div
              key={index}
              className={`bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150`} />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-2xl bg-${color}-50 flex items-center justify-center text-${color}-600 border border-${color}-100/30 group-hover:bg-${color}-600 group-hover:text-white transition-all`}>
                  {React.createElement(IconComponent as any, { size: 22 })}
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-1 text-[10px] font-black tracking-widest uppercase ${metric.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {metric.trend === 'up' ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />}
                    {Math.abs(metric.change)}%
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1 tabular-nums">{metric.value}</div>
                <div className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{metric.title}</div>
              </div>

              <div className="mt-6 flex items-center justify-between relative z-10">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight italic opacity-80">{metric.description || "Real-Time_Telemetry"}</div>
                <FiChevronRight className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              
              {metric.title === 'Total Incident Reports' && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                  <Line
                    data={{
                      labels: incidentTrend.labels,
                      datasets: [{
                        data: incidentTrend.values,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { enabled: false } },
                      scales: { x: { display: false }, y: { display: false } }
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flood Details Modal */}
      {showFloodDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                <FiMap className="text-blue-600" />
                Flood Affected Areas Detail
              </h3>
              <button onClick={() => setShowFloodDetails(false)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">Barangay</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">Reports</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">Severity</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {allFloodData.length > 0 ? (
                      allFloodData.map((area, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-black text-slate-900 uppercase">{area.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-[11px] font-black text-slate-500">{area.count}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full ${
                                    area.avgSeverity >= 3.5 ? 'bg-red-600' :
                                    area.avgSeverity >= 2.5 ? 'bg-orange-500' :
                                    area.avgSeverity >= 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${(area.avgSeverity / 4) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-black text-slate-900">{area.avgSeverity.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded-full uppercase tracking-widest border ${
                              area.severityLevel === 'Critical' ? 'bg-red-50 text-red-700 border-red-100' :
                              area.severityLevel === 'High' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              area.severityLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {area.severityLevel}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">No mission data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
              <button
                onClick={() => setShowFloodDetails(false)}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-8 relative z-20">
        {/* Center Panel - Live Incident Map */}
        <div className="xl:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 h-full flex flex-col min-h-[700px]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <FiMap className="text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Live Incident Map</h2>
                  <p className="text-slate-500 text-sm">Real-time situational monitoring</p>
                </div>
              </div>
              <Link 
                to="/map"
                className="px-5 py-2.5 bg-slate-50 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all border border-slate-100 flex items-center gap-2"
              >
                View Fullscreen <FiExternalLink size={14} />
              </Link>
            </div>
            

            
            <div className="h-[calc(100%-100px)] rounded-xl overflow-hidden border border-gray-200 shadow-inner relative bg-gray-100">
              <MapboxMap
                initialViewState={{
                  latitude: DEFAULT_MAP_STATE.latitude,
                  longitude: DEFAULT_MAP_STATE.longitude,
                  zoom: DEFAULT_MAP_STATE.zoom,
                  pitch: 0,
                  bearing: 0
                }}
                minZoom={DEFAULT_MAP_STATE.minZoom}
                maxBounds={DEFAULT_MAP_STATE.maxBounds}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/light-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
                onLoad={(e: any) => {
                  const map = e?.target?.getMap?.();
                  if (map) {
                    map.setTerrain(null);
                  }
                }}
              >
                <NavigationControl position="top-right" />
                <FullscreenControl position="top-right" />

                {/* Santa Cruz Outline */}
                <SantaCruzMapboxOutline />

                {/* Incident Markers */}
                {showIncidents && activeIncidents
                  .filter(incident => 
                    incident.type === 'Flood' &&
                    typeof incident.lat === 'number' && !isNaN(incident.lat) &&
                    typeof incident.lng === 'number' && !isNaN(incident.lng)
                  )
                  .map((incident) => (
                    <Marker
                      key={`incident-${incident.id}`}
                      latitude={incident.lat}
                      longitude={incident.lng}
                      onClick={(e: any) => {
                        e.originalEvent.stopPropagation();
                        setSelectedMarker({ type: 'incident', data: incident });
                      }}
                    >
                      <div className="cursor-pointer transition-transform hover:scale-110">
                        <Pin3D color="#2563eb" size={32} icon={<FaWater size={14} />} />
                      </div>
                    </Marker>
                  ))}

                {/* Hazard Markers */}
                {showHazards && Array.isArray(hazards) && hazards
                  .filter(h => 
                    (typeof h.latitude === 'number' || typeof h.longitude === 'number' || typeof (h as any).lat === 'number')
                  )
                  .map((h) => (
                    <Marker
                      key={`hazard-pin-${h.id}`}
                      latitude={Number(h.latitude || (h as any).lat)}
                      longitude={Number(h.longitude || (h as any).lng)}
                      onClick={(e: any) => {
                        e.originalEvent.stopPropagation();
                        setSelectedMarker({ type: 'incident', data: { ...h, type: h.type || 'Hazard', lat: h.latitude || (h as any).lat, lng: h.longitude || (h as any).lng, location: h.location || 'Hazard Area' } });
                      }}
                    >
                      <div className="cursor-pointer transition-transform hover:scale-110">
                        <Pin3D color="#f59e0b" size={32} icon={<FiAlertTriangle size={14} />} />
                      </div>
                    </Marker>
                  ))}

                {/* Barangay Markers */}
                {brgys.map((b) => (
                  <Marker
                    key={`brgy-pin-${b.id}`}
                    latitude={Number(b.lat)}
                    longitude={Number(b.lng)}
                  >
                    <div className="cursor-pointer transition-transform hover:scale-110">
                      <Pin3D color="#3b82f6" size={30} icon={<FiHome size={14} />} />
                    </div>
                  </Marker>
                ))}

                {/* Shelter Markers */}
                {showShelters && Array.isArray(enhancedShelters) && enhancedShelters
                  .filter(shelter => 
                    (typeof shelter.lat === 'number' && !isNaN(shelter.lat)) &&
                    (typeof shelter.lng === 'number' && !isNaN(shelter.lng))
                  )
                  .map((shelter) => (
                    <Marker
                      key={`shelter-${shelter.id}`}
                      latitude={shelter.lat}
                      longitude={shelter.lng}
                      pitchAlignment="viewport"
                      rotationAlignment="viewport"
                      onClick={(e: any) => {
                        e.originalEvent.stopPropagation();
                        setSelectedMarker({ type: 'shelter', data: shelter });
                      }}
                    >
                      <div className="cursor-pointer transition-transform hover:scale-110">
                        <Pin3D color="#eab308" size={38} icon={<FiHome size={16} />} />
                      </div>
                    </Marker>
                  ))}

                {/* Flood Areas */}
                {showIncidents && floodAreasFc.features.length ? (
                  <Source id="flood-areas-3d" type="geojson" data={floodAreasFc as any}>
                    <Layer
                      id="flood-areas-fill"
                      type="fill"
                      minzoom={12}
                      paint={{
                        'fill-color': [
                          'match',
                          ['get', 'severity'],
                          'critical',
                          '#7F1D1D',
                          'high',
                          '#EF4444',
                          'medium',
                          '#2563EB',
                          '#60A5FA',
                        ],
                        'fill-opacity': 0.16,
                      }}
                    />
                    <Layer
                      id="flood-areas-outline"
                      type="line"
                      paint={{
                        'line-color': [
                          'match',
                          ['get', 'severity'],
                          'critical',
                          '#7F1D1D',
                          'high',
                          '#EF4444',
                          'medium',
                          '#60a5fa',
                          '#60a5fa',
                        ],
                        'line-width': 2,
                        'line-opacity': 0.35,
                      }}
                    />
                  </Source>
                ) : null}

                {/* Hazard Areas */}
                {showHazards && hazardAreasFc.features.length ? (
                  <Source id="hazard-areas-3d" type="geojson" data={hazardAreasFc as any}>
                    <Layer
                      id="hazard-areas-fill"
                      type="fill"
                      minzoom={12}
                      paint={{
                        'fill-color': [
                          'match',
                          ['get', 'severity'],
                          'critical',
                          '#7F1D1D',
                          'high',
                          '#EF4444',
                          'medium',
                          '#2563EB',
                          '#60A5FA',
                        ],
                        'fill-opacity': 0.14,
                      }}
                    />
                    <Layer
                      id="hazard-areas-outline"
                      type="line"
                      paint={{
                        'line-color': [
                          'match',
                          ['get', 'severity'],
                          'critical',
                          '#7F1D1D',
                          'high',
                          '#EF4444',
                          'medium',
                          '#60a5fa',
                          '#60a5fa',
                        ],
                        'line-width': 2,
                        'line-opacity': 0.35,
                      }}
                    />
                  </Source>
                ) : null}

                {/* Road Zone Markers */}
                {showRoadZones && Array.isArray(roadZones) && roadZones
                  .filter(zone => zone.status !== 'clear')
                  .map((zone) => (
                    <Marker
                      key={`zone-${zone.id}`}
                      latitude={14.2833 + (zone.id * 0.005)}
                      longitude={121.4167 - (zone.id * 0.005)}
                      onClick={(e: any) => {
                        e.originalEvent.stopPropagation();
                        setSelectedMarker({ type: 'road', data: zone });
                      }}
                    >
                      <div className="cursor-pointer transition-transform hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" width="24" height="24" className="filter drop-shadow-md">
                          <path d="M19 15l-6 6-6-6 6-6 6 6zm-6-4.5L9.5 14h9L15 10.5z"/>
                        </svg>
                      </div>
                    </Marker>
                  ))}

                {/* Popups */}
                {selectedMarker?.type === 'incident' && (
                  <Popup
                    latitude={selectedMarker?.data?.lat}
                    longitude={selectedMarker?.data?.lng}
                    onClose={() => setSelectedMarker(null)}
                    closeButton={false}
                    maxWidth="200px"
                    className="custom-popup"
                  >
                    <div className="bg-white rounded-lg shadow-lg border-0 overflow-hidden min-w-[180px]">
                      <div className={`px-3 py-2 ${
                        selectedMarker?.data?.type === 'Flood' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm">🌊</span>
                            <h3 className="font-bold text-white text-sm">{selectedMarker?.data?.type}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            selectedMarker?.data?.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                            selectedMarker?.data?.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                            selectedMarker?.data?.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedMarker?.data?.severity}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedMarker?.data?.status === 'Active' ? 'bg-red-500 animate-pulse' :
                              selectedMarker?.data?.status === 'Responding' ? 'bg-yellow-500 animate-pulse' :
                              'bg-green-500'
                            }`}></div>
                            <span className={`font-medium text-xs ${
                              selectedMarker?.data?.status === 'Active' ? 'text-red-600' :
                              selectedMarker?.data?.status === 'Responding' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {selectedMarker?.data?.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{selectedMarker?.data?.time}</span>
                        </div>
                        <div className="text-xs text-gray-700">📍 {selectedMarker?.data?.location}</div>
                        <div className="flex gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => void promoteMarkerToHazard()}
                            disabled={promoting}
                            className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs py-1 px-2 rounded transition-colors"
                          >
                            {promoting ? 'Promoting...' : 'Promote'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowFloodDetails(true)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded transition-colors"
                          >
                            Details
                          </button>
                        </div>
                        <div className="pt-1">
                           <button
                             type="button"
                             onClick={() => navigate('/admin/report-incident', { state: { prefill: selectedMarker?.data, isEdit: true } })}
                             className="w-full bg-gray-600 hover:bg-gray-500 text-white text-[10px] py-1 px-2 rounded transition-colors uppercase font-bold tracking-widest"
                           >
                             Modify Intel
                           </button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                )}
              </MapboxMap>
              {/* Legend Overlay */}
              <div className="absolute top-6 left-6 z-30 pointer-events-auto">
                 {/* Sector Matrix Overlay */}
                  <div className="absolute left-6 top-6 bottom-6 z-10 w-80 pointer-events-none">
                    <div className="pointer-events-auto h-full">
                      <TacticalCommsStatus 
                        title="Sector Intelligence"
                        sectors={brgys.map(b => ({
                          name: b.brgy_name,
                          status: (b.status_level || 'safe').toLowerCase() as any,
                          lastPing: 'Live_Link',
                          depth: b.flood_depth_cm
                        }))}
                      />
                    </div>
                  </div>
                  
                  {/* Map Layer Controls Widget */}
                  <div className="absolute right-6 top-6 z-10 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-5 min-w-[200px]">
                    <div className="text-[10px] font-black text-slate-400 tracking-[0.25em] uppercase mb-5 border-b border-slate-100 pb-3 flex items-center justify-between">
                      Tactical_Layers
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Active Incidents', checked: showIncidents, onChange: setShowIncidents, color: 'blue' },
                        { label: 'Hazard Zones', checked: showHazards, onChange: setShowHazards, color: 'orange' },
                        { label: 'Shelter Network', checked: showShelters, onChange: setShowShelters, color: 'emerald' },
                        { label: 'Restricted Zones', checked: showDangerZones, onChange: setShowDangerZones, color: 'rose' }
                      ].map((layer) => (
                        <label key={layer.label} className="flex items-center justify-between cursor-pointer group">
                          <span className="text-[11px] font-black text-slate-600 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{layer.label}</span>
                          <input 
                            type="checkbox" 
                            className={`rounded border-slate-300 bg-slate-50 text-${layer.color}-600 focus:ring-${layer.color}-500/20 w-4 h-4 transition-all`}
                            checked={layer.checked} 
                            onChange={(e) => layer.onChange(e.target.checked)} 
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                       <button className="w-full py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
                         Clear_View_Protocol
                       </button>
                    </div>
                  </div>

                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 min-w-[200px] border border-slate-100 shadow-xl hidden">
                  <div className="text-[11px] font-bold text-slate-400 mb-4 border-b border-slate-50 pb-2">Map Legend</div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-blue-50 rounded-xl border border-blue-100/50">
                        <FaWater className="text-blue-600 text-xs" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Flood Reports</span>
                      <span className="ml-auto text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{activeIncidents.filter(i => i.type === 'Flood').length}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center bg-cyan-50 rounded-xl border border-cyan-100/50">
                        <FiHome className="text-cyan-600 text-xs" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">Active Shelters</span>
                      <span className="ml-auto text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-lg">{shelters.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              

            </div>
          </div>

        </div>

        {/* Right Panel - Quick Actions & Charts */}
        <div className="xl:col-span-3 flex flex-col gap-8 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-900">Quick Actions</span>
            </div>
            <div className="divide-y divide-slate-50">
              <Link
                to="/emergency"
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <FiAlertTriangle className="text-white text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-rose-600 transition-colors">Emergency Comms</div>
                  <div className="text-[10px] text-slate-400 font-medium">Critical action portal</div>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/admin/flood-report"
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <FaWater className="text-white text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Flood Intel</div>
                  <div className="text-[10px] text-slate-400 font-medium">Hydrological data feed</div>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/admin/shelters"
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-600/20">
                  <FiHome className="text-white text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">Shelter Hub</div>
                  <div className="text-[10px] text-slate-400 font-medium">Logistics & availability</div>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Incident Distribution */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-900">Incident Distribution</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full flex items-center justify-center mb-8">
                <div className="relative w-44 h-44">
                  <Doughnut 
                    data={{
                      ...incidentData,
                      datasets: [{
                        ...incidentData.datasets[0],
                        borderColor: '#FFFFFF',
                        borderWidth: 4,
                        spacing: 4,
                        hoverOffset: 8,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 1,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#0f172a',
                          titleColor: '#FFFFFF',
                          bodyColor: '#94a3b8',
                          padding: 12,
                          cornerRadius: 12,
                          displayColors: true,
                          boxPadding: 8
                        }
                      },
                      cutout: '70%',
                      elements: { arc: { borderRadius: 8 } },
                      animation: { animateRotate: true, animateScale: true }
                    }}
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                    <div className="text-3xl font-bold text-slate-900 tracking-tight">
                      {incidentData.datasets[0].data.reduce((a:number,b:number)=>a+b,0)}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">Total</div>
                  </div>
                </div>
              </div>
              <div className="w-full">
                <div className="grid grid-cols-2 gap-3">
                  {incidentData.labels.map((label, i) => {
                    const val = incidentData.datasets[0].data[i];
                    const total = incidentData.datasets[0].data.reduce((a:number,b:number)=>a+b,0) || 1;
                    const pct = Math.round((val/total)*100);
                    const colors = incidentData.datasets[0].backgroundColor as string[];
                    return (
                      <div key={label} className="flex flex-col bg-slate-50/50 border border-slate-100 rounded-2xl px-4 py-3 transition-all hover:bg-white hover:shadow-md">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                          <span className="text-[10px] text-slate-500 font-semibold truncate">{label}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold text-slate-900 tracking-tight">{val}</span>
                          <span className="text-[10px] text-blue-600 font-bold">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {incidentData.labels.length === 0 && (
                    <div className="text-center text-xs text-slate-400 font-medium py-8 col-span-2">No data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    </div>
    </>
  );
};

export default MMDRMODashboard;
