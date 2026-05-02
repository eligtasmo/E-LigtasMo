import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '../../icons';
import { apiFetch } from '../../utils/api';
import { Link } from 'react-router-dom';
import { FaWater, FaFire, FaCarCrash } from 'react-icons/fa';
import { GiEarthCrack } from 'react-icons/gi';
import { FiAlertTriangle, FiAlertCircle, FiHome, FiActivity, FiExternalLink, FiTrendingUp, FiTrendingDown, FiMap, FiChevronRight, FiX } from 'react-icons/fi';
import { RiEarthquakeLine } from 'react-icons/ri';
import MapboxMap, { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer } from '../maps/MapboxMap';
import { Line, Doughnut } from 'react-chartjs-2';
import * as turf from '@turf/turf';
import Pin3D from '../maps/Pin3D';

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
  icon: React.ComponentType;
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
  
  // Filter states for map markers
  const [showIncidents, setShowIncidents] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
  
  const [showRoadZones, setShowRoadZones] = useState(true);

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
    const floodIncidents = visibleIncidents.filter(i => i.type === 'Flood');
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

  // Calculate Most Affected Area and its Trend (Average Severity)
  const mostAffectedData = useMemo(() => {
    // 1. Find Most Affected Area
    const floodIncidents = visibleIncidents || []; // Include all types in area analysis
    const locationCounts: Record<string, number> = {};
    
    floodIncidents.forEach(i => {
      const loc = i.location || 'Unknown';
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    
    let mostAffected = 'None';
    let maxCount = 0;
    
    Object.entries(locationCounts).forEach(([loc, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostAffected = loc;
      }
    });

    // 2. Calculate Trend (Average Severity over time for this area)
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

    const severitySums = Array(bucketCount).fill(0);
    const incidentCounts = Array(bucketCount).fill(0);

    const severityMap: Record<string, number> = {
      'Low': 1,
      'Medium': 2,
      'High': 3,
      'Critical': 4
    };

    if (mostAffected !== 'None') {
      floodIncidents.forEach((inc) => {
        if (inc.location !== mostAffected) return;
        if (!inc.reportedAt) return;
        const ts = new Date(inc.reportedAt);
        if (isNaN(ts.getTime())) return;
        if (ts < start || ts > now) return;
        
        const idx = incidentTrendGranularity === 'day'
          ? Math.floor((ts.getTime() - start.getTime()) / (60 * 60 * 1000))
          : Math.floor((ts.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        
        if (idx >= 0 && idx < bucketCount) {
          severitySums[idx] += severityMap[inc.severity] || 0;
          incidentCounts[idx]++;
        }
      });
    }

    const avgSeverityValues = severitySums.map((sum, i) => 
      incidentCounts[i] > 0 ? Number((sum / incidentCounts[i]).toFixed(1)) : 0
    );

    return {
      name: mostAffected,
      count: maxCount,
      trendData: {
        labels,
        values: avgSeverityValues
      }
    };
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
              location: report.barangay || 'Unknown Location',
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
      const enhancedShelters: EnhancedShelter[] = data.map((shelter: any) => ({
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
      },
      {
        title: 'Most Affected Area',
        value: mostAffectedData.name,
        change: 0,
        trend: 'stable',
        icon: FiMap,
        color: 'orange',
        description: mostAffectedData.count > 0 ? `${mostAffectedData.count} Reports` : 'No reports found',
        unit: ''
      }
    ];
  }, [metricsRange, incidentTrend, visibleIncidents, shelters, totalIncidents, mostAffectedData]);

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
    
    // Refresh all data every 60 seconds
    const interval = setInterval(() => {
      fetchIncidents();
      fetchHazards();
      fetchDangerZones();
      fetchShelters();
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
          address: row.location_text || row.barangay || incident.location || 'Flood report',
          datetime: row.time || new Date().toISOString(),
          description: row.description || '',
          severity: row.severity || severity,
          reporter: row.reporter_name || row.approved_by || 'MDRRMO',
          contact: row.reporter_contact || 'N/A',
          email: row.reporter_email || '',
          photoUrl: row.media_path || '',
          barangay: row.barangay || '',
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
          barangay: row.barangay || '',
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
    for (const h of hazards as any[]) {
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
    for (const i of activeIncidents) {
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
      
      <div className="min-h-screen bg-gray-50 text-gray-900 p-2 sm:p-4 relative z-10">
      {/* Simplified Header */}
      <div className="mb-0">
        <div className="bg-gray-800 rounded-t-lg p-3 sm:p-4 border border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FiActivity className="text-lg sm:text-xl text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                  MMDRMO Emergency Operations Center
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm">Real-time disaster monitoring and emergency response</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              {/* System Status */}
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3 w-full sm:w-auto">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-300">API Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">Users:</span>
                    <span className="text-yellow-400 font-semibold">12</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">Refresh:</span>
                    <span className="text-blue-400 font-semibold">30s</span>
                  </div>
                </div>
              </div>
              {/* Metrics Range - affects Key Metrics only */}
              <div className="bg-gray-700 rounded-lg p-2 sm:p-3 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-xs sm:text-sm">Metrics Range:</span>
                  <select
                    className="text-xs sm:text-sm bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                    value={metricsRange}
                    onChange={(e) => setMetricsRange(e.target.value as '24h' | '7d' | '30d' | '90d')}
                  >
                    <option value="24h">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                    <option value="90d">90d</option>
                  </select>
                  <span className="text-gray-300 text-xs sm:text-sm">{metricsDates.label}</span>
                </div>
              </div>
              {/* Timer */}
              <div className="text-left sm:text-right bg-gray-700 rounded-lg p-2 sm:p-3 w-full sm:w-auto">
                <div className="text-lg sm:text-xl font-mono font-bold text-blue-400">{currentTime.toLocaleTimeString()}</div>
                <div className="text-gray-300 text-xs">{currentTime.toLocaleDateString()}</div>
                {loading && (
                  <div className="flex items-center justify-start sm:justify-end gap-1 text-xs text-blue-400 mt-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                    Updating...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {keyMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          const getCardColor = (color: string) => {
            switch(color) {
              case 'red': return 'border-red-200 bg-white';
              case 'blue': return 'border-blue-200 bg-white';
              case 'green': return 'border-green-200 bg-white';
              case 'yellow': return 'border-yellow-200 bg-white';
              case 'orange': return 'border-orange-200 bg-white';
              case 'purple': return 'border-purple-200 bg-white';
              default: return 'border-gray-200 bg-white';
            }
          };
          
          const getIconColor = (color: string) => {
            switch(color) {
              case 'red': return 'text-red-500';
              case 'blue': return 'text-blue-500';
              case 'green': return 'text-green-500';
              case 'yellow': return 'text-yellow-500';
              case 'orange': return 'text-orange-500';
              case 'purple': return 'text-purple-500';
              default: return 'text-gray-500';
            }
          };
          
          const getTrendColor = (trend: string) => {
            switch(trend) {
              case 'up': return 'text-green-600';
              case 'down': return 'text-red-600';
              default: return 'text-gray-600';
            }
          };
          
          return (
            <div
              key={index}
              className={`${getCardColor(metric.color)} rounded-lg p-2 sm:p-4 border hover:shadow-lg transition-all duration-200 flex flex-col min-h-[220px] sm:min-h-[240px] overflow-hidden`}
            >
              {(() => {
                const rangePill = (() => {
                  switch (metricsRange) {
                    case '24h': return 'Today';
                    case '7d': return 'Week';
                    case '30d': return 'Month';
                    case '90d': return 'Quarter';
                    default: return metricsRange;
                  }
                })();
                return (
                  <div className="flex items-center justify-between h-7 sm:h-8 mb-2 sm:mb-3">
                    {/* Title label on the left */}
                    <div className="text-[11px] sm:text-xs font-medium text-gray-700">
                      {metric.title}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* Pill-style range dropdown at top-right */}
                      <div className="relative">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white/80 px-2 py-1 text-[10px] sm:text-xs text-gray-700 shadow-sm hover:bg-white focus:outline-none"
                          onClick={() => setMetricsRangeMenuOpen(metricsRangeMenuOpen === metric.title ? null : metric.title)}
                          aria-haspopup="listbox"
                          aria-expanded={metricsRangeMenuOpen === metric.title}
                        >
                          {getRangeLabel(metricsRange)}
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>
                        {metricsRangeMenuOpen === metric.title && (
                          <div className="absolute right-0 z-10 mt-1 w-28 rounded-md border border-gray-200 bg-white shadow-lg">
                            {(['24h','7d','30d','90d'] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                className={`w-full px-3 py-1.5 text-left text-[11px] sm:text-xs hover:bg-gray-100 ${metricsRange === opt ? 'text-gray-900 font-medium' : 'text-gray-700'}`}
                                onClick={() => { setMetricsRange(opt); setMetricsRangeMenuOpen(null); }}
                              >
                                {getRangeLabel(opt)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Percent change below dropdown */}
                      <div className="flex items-center gap-1 text-xs leading-none h-3 sm:h-4">
                        {metric.trend === 'up' ? <FiTrendingUp className="text-green-500" /> : metric.trend === 'down' ? <FiTrendingDown className="text-red-500" /> : null}
                        {metric.change !== 0 && (
                          <span className={`font-semibold ${getTrendColor(metric.trend)}`}>
                            {Math.abs(metric.change)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-col justify-center h-[72px] sm:h-[84px]">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 leading-tight truncate">{metric.value}</div>
                {/* Keep a placeholder caption so heights are uniform */}
                <div className="text-xs text-gray-500 hidden sm:block mt-0 h-4 sm:h-5">
                  {metric.description ? metric.description : <span className="opacity-0 select-none">placeholder</span>}
                </div>
              </div>
              {metric.title === 'Total Incident Reports' && (
                <div className="mt-2 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 border-t border-gray-300 bg-gray-100 px-2 sm:px-4 py-2 flex-1">
                  <div className="h-full">
                    <Line
                      data={{
                        labels: incidentTrend.labels,
                        datasets: [
                          {
                            label: 'Incidents',
                            data: incidentTrend.values,
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            tension: 0.4,
                            pointRadius: 0,
                            borderWidth: 1.5,
                            fill: true,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true, intersect: false },
                        },
                        scales: {
                          x: {
                            display: true,
                            grid: { display: false },
                            ticks: { maxTicksLimit: 4, color: '#64748b', font: { size: 10 } },
                          },
                           y: {
                            display: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            beginAtZero: true,
                            ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 4, stepSize: 5 },
                            suggestedMax: Math.max(...incidentTrend.values, 15),
                           },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
              {metric.title === 'Most Affected Area' && (
                <div className="mt-2 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 border-t border-gray-300 bg-gray-100 px-2 sm:px-4 py-2 flex-1 relative group cursor-pointer" onClick={() => setShowFloodDetails(true)}>
                  <div className="absolute top-1 right-2 text-xs text-gray-500 group-hover:text-blue-600 flex items-center gap-1">
                    Expand <FiExternalLink />
                  </div>
                  <div className="h-full pt-4">
                    <Line
                      data={{
                        labels: mostAffectedData.trendData.labels,
                        datasets: [
                          {
                            label: 'Avg Severity',
                            data: mostAffectedData.trendData.values,
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            tension: 0.4,
                            pointRadius: 0,
                            borderWidth: 1.5,
                            fill: true,
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: { enabled: true, intersect: false },
                        },
                        scales: {
                          x: {
                            display: true,
                            grid: { display: false },
                            ticks: { maxTicksLimit: 4, color: '#64748b', font: { size: 10 } },
                          },
                           y: {
                            display: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            beginAtZero: true,
                            min: 0,
                            max: 4,
                            ticks: { 
                              color: '#94a3b8', 
                              font: { size: 10 }, 
                              stepSize: 1,
                              callback: function(value) {
                                if (value === 1) return 'L';
                                if (value === 2) return 'M';
                                if (value === 3) return 'H';
                                if (value === 4) return 'C';
                                return '';
                              }
                            },
                           },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
              {metric.title !== 'Total Incident Reports' && metric.title !== 'Most Affected Area' && (
                <div className="mt-2 -mx-2 sm:-mx-4 -mb-2 sm:-mb-4 border-t border-gray-300 bg-gray-100 px-2 sm:px-4 py-2 flex-1">
                  <div className="h-full flex items-center">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`${metric.trend === 'up' ? 'bg-green-500' : metric.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'} h-2`}
                        style={{ width: `${Math.min(100, Math.max(0, Math.abs(Number(metric.change) || 0)))}%` }}
                      />
                    </div>
                    <div className="ml-3 flex items-center gap-1 text-[11px] sm:text-xs text-gray-700">
                      {metric.trend === 'up' ? <FiTrendingUp className="text-green-600" /> : metric.trend === 'down' ? <FiTrendingDown className="text-red-600" /> : null}
                      <span className={`${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'} font-medium`}>{typeof metric.change === 'number' ? `${Math.abs(metric.change)}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flood Details Modal */}
      {showFloodDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiMap className="text-blue-600" />
                Flood Affected Areas Detail
              </h3>
              <button onClick={() => setShowFloodDetails(false)} className="text-gray-500 hover:text-gray-700">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barangay</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flood Incidents</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allFloodData.length > 0 ? (
                      allFloodData.map((area, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{area.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area.count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    area.avgSeverity >= 3.5 ? 'bg-red-600' :
                                    area.avgSeverity >= 2.5 ? 'bg-orange-500' :
                                    area.avgSeverity >= 1.5 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${(area.avgSeverity / 4) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold">{area.avgSeverity.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              area.severityLevel === 'Critical' ? 'bg-red-100 text-red-800' :
                              area.severityLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                              area.severityLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {area.severityLevel}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No flood incidents reported.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowFloodDetails(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid - Map-Focused Layout (70% Map, 30% Sidebar) */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-2 sm:gap-4 relative z-20">
        {/* Center Panel - Live Incident Map (Takes 70% of Space) */}
        <div className="xl:col-span-7">
          {/* Interactive Map */}
          <div className="bg-white rounded-lg p-3 sm:p-4 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] relative border border-gray-200 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <FiMap className="text-blue-600 text-xs sm:text-sm" />
                </div>
                <span className="text-gray-900">
                  Live Incident Map
                </span>
              </h2>
              {/* Removed date filter from map header per user preference */}
              <Link 
                to="/map"
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm flex items-center gap-1 font-medium transition-colors border border-gray-300"
              >
                Full Map <FiExternalLink className="text-xs" />
              </Link>
            </div>
            

            
            <div className="h-[calc(100%-100px)] rounded-xl overflow-hidden border border-gray-200 shadow-inner relative bg-gray-100">
              <MapboxMap
                initialViewState={{
                  latitude: 14.2833,
                  longitude: 121.4167,
                  zoom: 13,
                  pitch: 35,
                  bearing: -8
                }}
                maxPitch={85}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
                onLoad={(e: any) => {
                  try {
                    const map = e?.target?.getMap?.();
                    if (!map) return;
                    if (!map.getSource('mapbox-dem')) {
                      map.addSource('mapbox-dem', {
                        type: 'raster-dem',
                        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                        tileSize: 512,
                        maxzoom: 14,
                      } as any);
                    }
                    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 } as any);
                  } catch {}
                }}
              >
                <NavigationControl position="top-right" />
                <FullscreenControl position="top-right" />

                <Layer
                  id="sky"
                  type="sky"
                  paint={{
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 0.0],
                    'sky-atmosphere-sun-intensity': 10,
                  }}
                />
                <Layer
                  id="3d-buildings"
                  source="composite"
                  source-layer="building"
                  filter={['==', 'extrude', 'true']}
                  type="fill-extrusion"
                  minzoom={14}
                  paint={{
                    'fill-extrusion-color': '#cbd5e1',
                    'fill-extrusion-height': ['coalesce', ['get', 'height'], 6],
                    'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
                    'fill-extrusion-opacity': 0.55,
                  }}
                />

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

                {/* Shelter Markers */}
                {showShelters && shelters
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
                {showRoadZones && roadZones
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
                    latitude={selectedMarker.data.lat}
                    longitude={selectedMarker.data.lng}
                    onClose={() => setSelectedMarker(null)}
                    closeButton={false}
                    maxWidth="200px"
                    className="custom-popup"
                  >
                    <div className="bg-white rounded-lg shadow-lg border-0 overflow-hidden min-w-[180px]">
                      <div className={`px-3 py-2 ${
                        selectedMarker.data.type === 'Flood' ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm">🌊</span>
                            <h3 className="font-bold text-white text-sm">{selectedMarker.data.type}</h3>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            selectedMarker.data.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                            selectedMarker.data.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                            selectedMarker.data.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {selectedMarker.data.severity}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedMarker.data.status === 'Active' ? 'bg-red-500 animate-pulse' :
                              selectedMarker.data.status === 'Responding' ? 'bg-yellow-500 animate-pulse' :
                              'bg-green-500'
                            }`}></div>
                            <span className={`font-medium text-xs ${
                              selectedMarker.data.status === 'Active' ? 'text-red-600' :
                              selectedMarker.data.status === 'Responding' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {selectedMarker.data.status}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{selectedMarker.data.time}</span>
                        </div>
                        <div className="text-xs text-gray-700">📍 {selectedMarker.data.location}</div>
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
                      </div>
                    </div>
                  </Popup>
                )}

                {selectedMarker?.type === 'shelter' && (
                  <Popup
                    latitude={selectedMarker.data.lat}
                    longitude={selectedMarker.data.lng}
                    onClose={() => setSelectedMarker(null)}
                    closeButton={false}
                    maxWidth="200px"
                    className="custom-popup"
                  >
                    <div className="p-2 min-w-[180px]">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="font-bold text-blue-600 text-xs">{selectedMarker.data.name}</h3>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{selectedMarker.data.address}</p>
                      <div className="flex justify-between text-xs mb-1">
                        <span>👥 {selectedMarker.data.occupancy || 0}/{selectedMarker.data.capacity}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          selectedMarker.data.status === 'available' ? 'bg-green-600 text-white' :
                          selectedMarker.data.status === 'full' ? 'bg-red-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {selectedMarker.data.status || 'available'}
                        </span>
                      </div>
                    </div>
                  </Popup>
                )}

                {selectedMarker?.type === 'road' && (
                  <Popup
                    latitude={14.2833 + (selectedMarker.data.id * 0.005)}
                    longitude={121.4167 - (selectedMarker.data.id * 0.005)}
                    onClose={() => setSelectedMarker(null)}
                    closeButton={false}
                    maxWidth="200px"
                    className="custom-popup"
                  >
                    <div className="p-2 min-w-[180px]">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <h3 className="font-bold text-yellow-600 text-xs">{selectedMarker.data.name}</h3>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{selectedMarker.data.description}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">⏱️ {selectedMarker.data.estimatedClearance}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          selectedMarker.data.status === 'closed' ? 'bg-red-600 text-white' :
                          selectedMarker.data.status === 'restricted' ? 'bg-yellow-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {selectedMarker.data.status}
                        </span>
                      </div>
                    </div>
                  </Popup>
                )}
              </MapboxMap>
              {/* Legend Overlay */}
              <div className="absolute top-3 left-3 z-30 pointer-events-auto">
                <div className="bg-white/95 backdrop-blur rounded-md shadow p-3 text-xs min-w-[180px] border border-gray-200">
                  <div className="font-semibold text-gray-800 mb-2">Legend</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                          <defs>
                            <linearGradient id="leg_floodGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                          </defs>
                          <path d="M12 2C9 6 6 8.8 6 12.5A6 6 0 0018 12.5C18 8.8 15 6 12 2z" fill="url(#leg_floodGradient)"/>
                          <circle cx="12" cy="12.5" r="5" fill="rgba(255,255,255,0.12)"/>
                          <path d="M4 19c1 .7 2 .9 3 .9s2-.2 3-.9c1 .7 2 .9 3 .9s2-.2 3-.9c1 .7 2 .9 3 .9" fill="none" stroke="#0ea5e9" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="text-gray-700">Flood</span>
                      <span className="ml-auto text-gray-500">{activeIncidents.filter(i => i.type === 'Flood').length}</span>
                    </div>

                    <div className="border-t border-gray-100 my-1"></div>

                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="20" height="20">
                          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                        </svg>
                      </div>
                      <span className="text-gray-700">Shelter</span>
                      <span className="ml-auto text-gray-500">{shelters.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              

            </div>
          </div>

        </div>

        {/* Right Panel - Compact Emergency Resources (Takes 30% of Space) */}
        <div className="xl:col-span-3 flex flex-col gap-3 sm:gap-4 h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          {/* Emergency Resources - Professional List */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-semibold text-gray-800">Emergency Resources</h2>
            </div>
            {/* Neutral list style with right chevrons */}
            <div className="divide-y divide-gray-100">
              <Link
                to="/emergency"
                className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <FiAlertTriangle className="text-red-600 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">Emergency</div>
                  <div className="text-[11px] text-gray-500 truncate">Quick access to emergency actions</div>
                </div>
                <FiChevronRight className="text-gray-400" />
              </Link>

              <Link
                to="/admin/flood-report"
                className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <FaWater className="text-blue-600 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">Flood</div>
                  <div className="text-[11px] text-gray-500 truncate">Flood reports and status</div>
                </div>
                <FiChevronRight className="text-gray-400" />
              </Link>

              <Link
                to="/admin/shelters"
                className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <FiHome className="text-green-600 text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">Shelters</div>
                  <div className="text-[11px] text-gray-500 truncate">Shelter availability and details</div>
                </div>
                <FiChevronRight className="text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Incident Types - Chart left, counts right */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm flex-1 min-h-0 flex flex-col">
            <h2 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-2">Flood Levels</h2>
            <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch justify-between">
              {/* Chart (left) with center label */}
              <div className="sm:w-1/2 w-full flex items-center justify-center">
                <div className="relative w-44 h-44 sm:w-56 sm:h-56">
                  <Doughnut 
                  data={{
                    ...incidentData,
                    datasets: [{
                      ...incidentData.datasets[0],
                      borderColor: '#FFFFFF',
                      borderWidth: 2,
                      spacing: 3,
                      hoverBorderWidth: 3,
                      hoverBorderColor: '#374151',
                      hoverOffset: 6,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#FFFFFF',
                        titleColor: '#374151',
                        bodyColor: '#6B7280',
                        borderColor: '#D1D5DB',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        boxPadding: 6
                      }
                    },
                    cutout: '55%',
                    elements: { arc: { borderRadius: 6 } },
                    animation: { animateRotate: true, animateScale: true }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center">
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-gray-900">
                        {incidentData.datasets[0].data.reduce((a:number,b:number)=>a+b,0)}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-gray-500">Reports</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Counts (right) with color dots and percentage */}
              <div className="sm:w-1/2 w-full flex h-full items-center">
                <div className="w-full grid grid-cols-1 gap-3">
                  {incidentData.labels.map((label, i) => {
                    const val = incidentData.datasets[0].data[i];
                    const total = incidentData.datasets[0].data.reduce((a:number,b:number)=>a+b,0) || 1;
                    const pct = Math.round((val/total)*100);
                    const colors = incidentData.datasets[0].backgroundColor as string[];
                    return (
                      <div key={label} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-2 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
                          <span className="text-[11px] sm:text-xs text-gray-700 font-medium truncate">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-900 font-semibold">{val}</span>
                          <span className="text-[10px] text-gray-600">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  {incidentData.labels.length === 0 && (
                    <div className="text-center text-xs text-gray-500">No reports</div>
                  )}
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
