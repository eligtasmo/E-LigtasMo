import React, { useState, useEffect, useMemo } from 'react';
import { BiShield, BiTime, BiError, BiSearch, BiFilter, BiRefresh } from 'react-icons/bi';
import { FiMapPin, FiClock, FiUsers, FiAlertTriangle, FiExternalLink, FiChevronRight, FiMap, FiRefreshCw, FiFilter, FiSearch, FiTruck } from 'react-icons/fi';
import { FaCheck, FaTimes, FaClock, FaWater, FaFire, FaCarCrash, FaFirstAid } from 'react-icons/fa';
import { RiEarthquakeLine } from 'react-icons/ri';
import { CheckCircleIcon } from '../icons';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

import DuplicateIncidentManager from '../components/saferoutes/DuplicateIncidentManager';
import { apiFetch } from '../utils/api';

// Enhanced incident interface for real-time data
interface IncidentData {
  id: number;
  type: string;
  location: string;
  address: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved' | 'Active' | 'Responding';
  datetime: string;
  description: string;
  lat: number;
  lng: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  reporter: string;
  contact: string;
  photo_url?: string;
  responders?: number;
  response_time?: string;
  flood_level_cm?: number; // Added optional flood level (cm) for Flood incidents
  allowed_vehicles?: string; // PH-specific allowed vehicles derived from flood level
  source?: 'incident' | 'flood_report';
  barangay?: string;
}

// Sample alert data for the live feed
const recentAlerts = [
  {
    type: "High Priority Alert",
    message: "Multiple incidents reported in downtown area",
    time: "2 min ago",
    priority: "high"
  },
  {
    type: "Weather Warning",
    message: "Heavy rainfall expected in next 2 hours",
    time: "15 min ago",
    priority: "medium"
  },
  {
    type: "System Update",
    message: "Emergency response protocols updated",
    time: "1 hr ago",
    priority: "low"
  }
];





const AlertCard = ({ type, message, time, priority }: {
  type: string;
  message: string;
  time: string;
  priority: string;
}) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-red-500">
    <div className="flex items-center gap-3">
      <BiError className={`text-lg ${
        priority === 'high' ? 'text-red-600' :
        priority === 'medium' ? 'text-yellow-600' :
        'text-blue-600'
      }`} />
      <div>
        <p className="text-sm font-medium text-gray-900">{type}</p>
        <p className="text-xs text-gray-600">{message}</p>
      </div>
    </div>
    <span className="text-xs text-gray-500 font-medium">{time}</span>
  </div>
);

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return 'bg-red-500 text-white';
    case 'High': return 'bg-orange-500 text-white';
    case 'Moderate': return 'bg-yellow-500 text-white';
    case 'Low': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-red-100 text-red-800 border-red-200';
    case 'Responding': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
    case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatTime = (datetime: string) => {
  const date = new Date(datetime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
  return date.toLocaleDateString();
};

// Hidden map snapshot generator for Details modal
const MapSnapshot = ({ incident, onSnapshot }: { incident: IncidentData; onSnapshot: (url: string) => void }) => {
  const [routePositions, setRoutePositions] = React.useState<[number, number][] | null>(null);

  const hasStart = incident.start_lat !== undefined && incident.start_lng !== undefined;
  const hasEnd = incident.end_lat !== undefined && incident.end_lng !== undefined;

  // Fetch actual route geometry from server proxy (ORS/OSRM)
  React.useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      if (!(hasStart && hasEnd)) {
        setRoutePositions(null);
        return;
      }
      try {
        const body = {
          profile: 'driving-car',
          coordinates: [
            [incident.start_lng as number, incident.start_lat as number],
            [incident.end_lng as number, incident.end_lat as number]
          ]
        };
        const res = await apiFetch('ors-directions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const json = await res.json();
        const coords = (json as any)?.features?.[0]?.geometry?.coordinates || [];
        if (Array.isArray(coords)) {
          const positions: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
          if (!cancelled) setRoutePositions(positions);
        } else {
          if (!cancelled)
            setRoutePositions([
              [incident.start_lat as number, incident.start_lng as number],
              [incident.end_lat as number, incident.end_lng as number]
            ]);
        }
      } catch (err) {
        console.warn('Route fetch failed, using direct segment.', err);
        if (!cancelled)
          setRoutePositions([
            [incident.start_lat as number, incident.start_lng as number],
            [incident.end_lat as number, incident.end_lng as number]
          ]);
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [incident.id]);

  // Generate an SVG snapshot with basemap background via server proxy, overlaying glow route
  React.useEffect(() => {
    const width = 520;
    const height = 320;
    const padding = 18;

    const encodeSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    // WebMercator helpers
    const worldSize = (zoom: number) => 256 * Math.pow(2, zoom);
    const project = (lat: number, lng: number, zoom: number) => {
      const siny = Math.sin((lat * Math.PI) / 180);
      const clamped = Math.min(Math.max(siny, -0.9999), 0.9999);
      const size = worldSize(zoom);
      const x = ((lng + 180) / 360) * size;
      const y = (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * size;
      return [x, y] as [number, number];
    };
    const mercNormY = (lat: number) => {
      const siny = Math.sin((lat * Math.PI) / 180);
      const clamped = Math.min(Math.max(siny, -0.9999), 0.9999);
      return (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * 256;
    };

    const renderNoRoute = () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <rect x="0" y="0" width="${width}" height="${height}" fill="#f1f5f9"/>
          <text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" fill="#475569" font-size="14">No route available</text>
        </svg>
      `;
      onSnapshot(encodeSvg(svg));
    };

    const renderWithBasemap = async () => {
      if (!(hasStart && hasEnd && routePositions && routePositions.length >= 2)) {
        renderNoRoute();
        return;
      }

      const lats = routePositions.map(p => p[0]);
      const lngs = routePositions.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;

      const lngSpan = Math.max(maxLng - minLng, 1e-6);
      const yNormMax = mercNormY(maxLat);
      const yNormMin = mercNormY(minLat);
      const yNormSpan = Math.max(Math.abs(yNormMax - yNormMin), 1e-6);

      // Compute zoom to fit width/height with padding
      const zoomX = Math.log2(((width - padding * 2) / 256) * (360 / lngSpan));
      const zoomY = Math.log2((height - padding * 2) / yNormSpan);
      let zoom = Math.floor(Math.min(zoomX, zoomY));
      zoom = Math.max(3, Math.min(zoom, 17));

      // Fetch basemap image via server proxy
      let baseImageUrl: string | null = null;
      try {
        const resp = await apiFetch('static-map.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ center_lat: centerLat, center_lng: centerLng, zoom, width, height })
        });
        const json = await resp.json();
        if (json && typeof json.data_url === 'string') {
          baseImageUrl = json.data_url as string;
        }
      } catch (e) {
        baseImageUrl = null;
      }

      // Project points to pixels relative to center at computed zoom
      const [cx, cy] = project(centerLat, centerLng, zoom);
      const toPixel = (lat: number, lng: number) => {
        const [wx, wy] = project(lat, lng, zoom);
        const x = width / 2 + (wx - cx);
        const y = height / 2 + (wy - cy);
        return [x, y] as [number, number];
      };

      const points = routePositions.map(([lat, lng]) => toPixel(lat, lng)).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

      const bgLayer = baseImageUrl
        ? `<image x="0" y="0" width="${width}" height="${height}" href="${baseImageUrl}" preserveAspectRatio="xMidYMid slice" />`
        : `<rect x="0" y="0" width="${width}" height="${height}" fill="#f1f5f9"/>`;

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          ${bgLayer}
          <polyline points="${points}" fill="none" stroke="#fecaca" stroke-width="26" opacity="0.12" stroke-linecap="round" stroke-linejoin="round" />
          <polyline points="${points}" fill="none" stroke="#fca5a5" stroke-width="20" opacity="0.18" stroke-linecap="round" stroke-linejoin="round" />
          <polyline points="${points}" fill="none" stroke="#ef4444" stroke-width="14" opacity="0.35" stroke-linecap="round" stroke-linejoin="round" />
          <polyline points="${points}" fill="none" stroke="#b91c1c" stroke-width="8" opacity="0.9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
      onSnapshot(encodeSvg(svg));
    };

    renderWithBasemap();
  }, [routePositions]);

  return null;
};

// Visible Leaflet map in Details modal, auto-zooming to show the full route
const DetailsMapPreview = ({ incident }: { incident: IncidentData }) => {
  const [routePositions, setRoutePositions] = React.useState<[number, number][] | null>(null);

  const hasStart = incident.start_lat !== undefined && incident.start_lng !== undefined;
  const hasEnd = incident.end_lat !== undefined && incident.end_lng !== undefined;

  React.useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      if (!(hasStart && hasEnd)) {
        setRoutePositions(null);
        return;
      }
      try {
        const body = {
          profile: 'driving-car',
          coordinates: [
            [incident.start_lng as number, incident.start_lat as number],
            [incident.end_lng as number, incident.end_lat as number]
          ]
        };
        const res = await apiFetch('ors-directions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const json = await res.json();
        const coords = json?.features?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords)) {
          const positions: [number, number][] = coords.map((c: [number, number]) => [c[1], c[0]]);
          if (!cancelled) setRoutePositions(positions);
        } else {
          if (!cancelled)
            setRoutePositions([
              [incident.start_lat as number, incident.start_lng as number],
              [incident.end_lat as number, incident.end_lng as number]
            ]);
        }
      } catch (err) {
        console.warn('Route fetch failed, using direct segment.', err);
        if (!cancelled)
          setRoutePositions([
            [incident.start_lat as number, incident.start_lng as number],
            [incident.end_lat as number, incident.end_lng as number]
          ]);
      }
    };
    fetchRoute();
    return () => { cancelled = true; };
  }, [incident.id]);

  const FitToRoute = ({ positions }: { positions: [number, number][] }) => {
    const map = useMap();
    React.useEffect(() => {
      if (!positions || positions.length < 2) return;
      const bounds = (window as any).L?.latLngBounds
        ? (window as any).L.latLngBounds(positions.map(p => [(p[0] as number), (p[1] as number)]))
        : null;
      if (bounds) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
      } else {
        // Manual bounds calc
        const lats = positions.map(p => p[0]);
        const lngs = positions.map(p => p[1]);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const center: [number, number] = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
        map.setView(center, 13);
      }
    }, [positions, map]);
    return null;
  };

  const FitToPoint = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    React.useEffect(() => {
      map.setView([lat, lng], 15);
    }, [lat, lng, map]);
    return null;
  };

  const initialCenter: [number, number] = hasStart && hasEnd
    ? [((incident.start_lat as number) + (incident.end_lat as number)) / 2, ((incident.start_lng as number) + (incident.end_lng as number)) / 2]
    : [incident.lat, incident.lng];

  return (
    <MapContainer center={initialCenter} zoom={14} style={{ width: '100%', height: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {hasStart && hasEnd && routePositions && routePositions.length >= 2 ? (
        <>
          {/* Heatmap-style red glow using layered, rounded strokes */}
          <Polyline positions={routePositions} color="#fecaca" weight={26} opacity={0.12} pathOptions={{ className: 'heat-route', lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={routePositions} color="#fca5a5" weight={20} opacity={0.18} pathOptions={{ className: 'heat-route', lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={routePositions} color="#ef4444" weight={14} opacity={0.35} pathOptions={{ className: 'heat-route', lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={routePositions} color="#b91c1c" weight={8} opacity={0.9} pathOptions={{ lineCap: 'round', lineJoin: 'round' }} />
          <FitToRoute positions={routePositions} />
        </>
      ) : (
        <>
          {/* No pinpoint for single-location incidents; only fit view to location */}
          <FitToPoint lat={incident.lat} lng={incident.lng} />
        </>
      )}
    </MapContainer>
  );
};
// Enhanced Incident Card Component
  const EnhancedIncidentCard = ({ incident, onClick, onApprove, onReject, onMarkAsResolved, onReopen, onShowMap, onShowAudit, onShowDetails, showStatusPill = true }: {
  incident: IncidentData;
  onClick?: (incident: IncidentData) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onMarkAsResolved?: (id: number) => void;
  onReopen?: (id: number) => void;
  onShowMap?: (incident: IncidentData) => void;
  onShowAudit?: (incident: IncidentData) => void;
  onShowDetails?: (incident: IncidentData) => void;
  showStatusPill?: boolean;
}) => {
  const getIncidentIcon = (type: string) => {
    const size = 'text-xl';
    switch (type.toLowerCase()) {
      case 'flood': return <FaWater className={`${size} text-blue-600`} />;
      case 'fire': return <FaFire className={`${size} text-orange-600`} />;
      case 'earthquake': return <RiEarthquakeLine className={`${size} text-gray-700`} />;
      case 'accident': return <FaCarCrash className={`${size} text-red-600`} />;
      case 'medical': return <FaFirstAid className={`${size} text-green-600`} />;
      default: return <FiAlertTriangle className={`${size} text-yellow-600`} />;
    }
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hr ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-colors cursor-pointer h-full flex flex-col min-h-[320px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      role="button"
      tabIndex={0}
      title="View details"
      aria-label={`View incident ${incident.type} at ${incident.location}, severity ${incident.severity}, status ${incident.status}`}
      onClick={() => onClick?.(incident)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(incident);
        }
      }}
    >
      {/* Header with Type and Severity */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-xl">{getIncidentIcon(incident.type)}</div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">{incident.type}</h3>
              <p className="text-xs text-gray-600">ID: #{incident.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>
              {incident.severity}
            </span>
            {showStatusPill && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getStatusColor(incident.status)}`}>
                {incident.status}
              </span>
            )}
            <button
              type="button"
              className="px-2 py-1 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md flex items-center gap-1"
              title="View details"
              aria-label="View details"
              onClick={(e) => { e.stopPropagation(); onClick?.(incident); }}
            >
              <span>View</span>
              <FiChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Content - compact summary */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        {/* Location only (compact) */}
        <div className="flex items-center gap-2">
          <FiMapPin className="text-blue-500 text-xs" />
          <p className="text-sm font-medium text-gray-900 truncate">{incident.location}</p>
        </div>

        {/* Bottom summary: Reported • Responding */}
        <div className="flex items-center justify-between text-xs text-gray-700 mt-auto">
          <div className="flex items-center gap-1">
            <FiClock className="text-green-500 w-3 h-3" />
            <span>{formatTime(incident.datetime)}</span>
            <span className="text-gray-400">•</span>
            <span>Reported</span>
          </div>
          <div className="flex items-center gap-1">
            
          </div>
        </div>
      </div>

      {/* Actions Footer – primary actions only */}
      <div className="p-3 border-t border-gray-100 mt-auto">
        <div className={`grid grid-cols-2 ${incident.status === 'Pending' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2`}>

          

          {/* Third/Fourth columns based on status */}
          {incident.status === 'Pending' ? (
            <>
              <button
                className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove?.(incident.id);
                }}
                aria-label="Approve"
              >
                <CheckCircleIcon className="shrink-0 w-[18px] h-[18px]" />
                <span className="hidden sm:inline">Approve</span>
              </button>
              <button
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 px-4 h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject?.(incident.id);
                }}
                aria-label="Reject"
              >
                <FaTimes size={18} className="shrink-0" />
                <span className="hidden sm:inline">Reject</span>
              </button>
            </>
          ) : (incident.status === 'Approved' || incident.status === 'Active') ? (
            <button
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsResolved?.(incident.id);
              }}
              aria-label="Mark as Done"
            >
              <CheckCircleIcon className="shrink-0 w-[18px] h-[18px]" />
              <span className="hidden sm:inline">Mark as Done</span>
            </button>
          ) : (
            <button
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                onReopen?.(incident.id);
              }}
            >
              <BiRefresh size={18} className="shrink-0" />
              Reopen
            </button>
          )}

          {/* Resolved/Rejected: Reopen */}
          {(incident.status === 'Resolved' || incident.status === 'Rejected') && (
            <button
              className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 h-9 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onReopen?.(incident.id);
              }}
            >
              <FaClock size={18} className="shrink-0" />
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Vertical Row layout for incidents
const EnhancedIncidentRow = ({ incident, onClick, onApprove, onReject, onMarkAsResolved, onReopen, onShowMap, onShowAudit, onShowDetails, showStatusPill = true }: {
  incident: IncidentData;
  onClick?: (incident: IncidentData) => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onMarkAsResolved?: (id: number) => void;
  onReopen?: (id: number) => void;
  onShowMap?: (incident: IncidentData) => void;
  onShowAudit?: (incident: IncidentData) => void;
  onShowDetails?: (incident: IncidentData) => void;
  showStatusPill?: boolean;
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Moderate': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-red-100 text-red-800 border-red-200';
      case 'Responding': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getIncidentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flood': return '🌊';
      case 'fire': return '🔥';
      case 'earthquake': return '🌍';
      case 'accident': return '🚗';
      case 'medical': return '🏥';
      default: return '⚠️';
    }
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-colors cursor-pointer px-3 py-2 flex flex-col sm:flex-row sm:items-center items-start gap-2 sm:gap-4"
      role="button"
      tabIndex={0}
      title="View details"
      aria-label={`View incident ${incident.type} at ${incident.location}, severity ${incident.severity}, status ${incident.status}`}
      onClick={() => onClick?.(incident)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(incident);
        }
      }}
    >
      {/* Left: type and severity */}
      <div className="flex items-center gap-3 shrink-0 sm:w-48 w-full">
        <div className="text-xl">{getIncidentIcon(incident.type)}</div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-sm">{incident.type}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getSeverityColor(incident.severity)}`}>{incident.severity}</span>
          </div>
          <p className="text-[11px] text-gray-600">ID: #{incident.id}</p>
        </div>
      </div>

      {/* Middle: location and time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FiMapPin className="text-blue-500 text-xs" />
          <p className="text-sm font-medium text-gray-900 truncate">{incident.location}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700 mt-1">
          <FiClock className="text-green-500 w-3 h-3" />
          <span>{formatTime(incident.datetime)}</span>
          <span className="text-gray-400">•</span>
          <span>Reported</span>
        </div>
      </div>

      {/* Status and responders */}
      <div className="flex items-center gap-3 shrink-0 sm:w-56 w-full">
        {showStatusPill && (
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getStatusColor(incident.status)}`}>{incident.status}</span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto sm:flex-nowrap sm:justify-end">
        <button
          type="button"
          className="px-2 py-1 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md flex items-center gap-1"
          title="View details"
          aria-label="View details"
          onClick={(e) => { e.stopPropagation(); onShowDetails?.(incident); }}
        >
          <span>View</span>
          <FiChevronRight className="w-3 h-3" />
        </button>
        

        {incident.status === 'Pending' ? (
          <>
            <button
              className="px-2 py-1 text-[11px] bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-md flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); onApprove?.(incident.id); }}
              aria-label="Approve"
            >
              <CheckCircleIcon className="w-3 h-3" />
              Approve
            </button>
            <button
              className="px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); onReject?.(incident.id); }}
              aria-label="Reject"
            >
              <FaTimes className="w-3 h-3" />
              Reject
            </button>
          </>
        ) : (incident.status === 'Approved' || incident.status === 'Active') ? (
          <button
            className="px-2 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md flex items-center gap-1"
            onClick={(e) => { e.stopPropagation(); onMarkAsResolved?.(incident.id); }}
            aria-label="Mark as Done"
          >
            <CheckCircleIcon className="w-3 h-3" />
            Mark as Done
          </button>
        ) : (
          <button
            className="px-2 py-1 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md flex items-center gap-1"
            onClick={(e) => { e.stopPropagation(); onReopen?.(incident.id); }}
          >
            <BiRefresh className="w-3 h-3" />
            Reopen
          </button>
        )}

        {(incident.status === 'Resolved' || incident.status === 'Rejected') && (
          <button
            className="px-2 py-1 text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-md flex items-center gap-1"
            onClick={(e) => { e.stopPropagation(); onReopen?.(incident.id); }}
          >
            <FaClock className="w-3 h-3" />
            Reopen
          </button>
        )}
      </div>
    </div>
  );
};

const IncidentReports = () => {
  // State management
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('datetime');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [activeTab, setActiveTab] = useState('Approved');
  const [tabLoading, setTabLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedIncidentForMap, setSelectedIncidentForMap] = useState<IncidentData | null>(null);
  // Resolve confirmation state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveIncidentId, setResolveIncidentId] = useState<number | null>(null);

  // Audit modal state
  

  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState<IncidentData | null>(null);

  // Date range filtering state
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const setDateByPreset = (preset: 'all' | 'today' | '7d' | '30d' | 'custom') => {
    setDatePreset(preset);
    const today = new Date();
    const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'today') {
      const d = toIsoDate(today);
      setDateFrom(d);
      setDateTo(d);
    } else if (preset === '7d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setDateFrom(toIsoDate(start));
      setDateTo(toIsoDate(today));
    } else if (preset === '30d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setDateFrom(toIsoDate(start));
      setDateTo(toIsoDate(today));
    } else {
      // custom – keep current dateFrom/dateTo
    }
  };

  // Helper to construct full photo URL
  const getFullPhotoUrl = (path: string | undefined | null) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('api/')) return `http://localhost/eligtasmo/${path}`;
    return `/api/${path}`;
  };

  // Clean address formatting by removing "From:" and "To:" prefixes
  const cleanAddress = (address: string): string => {
    if (!address) return 'Address not provided';
    
    // Remove "From:" and "To:" prefixes and clean up the formatting
    let cleaned = address
      .replace(/^From:\s*/i, '')
      .replace(/\s+To:\s*/i, ' → ')
      .trim();
    
    // If it still contains coordinates pattern, extract meaningful location
    if (cleaned.includes('→') && cleaned.match(/\d+\.\d+,\s*\d+\.\d+/)) {
      const parts = cleaned.split('→');
      if (parts.length === 2) {
        const fromPart = parts[0].trim();
        const toPart = parts[1].trim();
        
        // Extract location names before coordinates if they exist
        const fromLocation = fromPart.split(/\d+\.\d+/)[0].trim().replace(/,$/, '');
        const toLocation = toPart.split(/\d+\.\d+/)[0].trim().replace(/,$/, '');
        
        if (fromLocation && toLocation && fromLocation !== toLocation) {
          return `${fromLocation} → ${toLocation}`;
        } else if (fromLocation) {
          return fromLocation;
        }
      }
    }
    
    // Remove coordinate patterns at the end
    cleaned = cleaned.replace(/\s*\d+\.\d+,\s*\d+\.\d+\s*$/, '').trim();
    
    return cleaned || 'Location not specified';
  };

  // Transform API data to match our interface
  const transformIncidentData = (apiIncidents: any[]): IncidentData[] => {
    return apiIncidents.map(incident => ({
      id: incident.id,
      type: incident.type || 'Unknown',
      location: incident.address?.split(',')[0] || 'Unknown Location',
      address: cleanAddress(incident.address),
      severity: incident.severity || 'Moderate',
      status: incident.status || 'Pending',
      datetime: incident.datetime || incident.created_at,
      description: incident.description || 'No description provided',
      lat: parseFloat(incident.lat) || 0,
      lng: parseFloat(incident.lng) || 0,
      start_lat: (incident.start_lat !== null && incident.start_lat !== undefined) ? Number(incident.start_lat) : undefined,
      start_lng: (incident.start_lng !== null && incident.start_lng !== undefined) ? Number(incident.start_lng) : undefined,
      end_lat: (incident.end_lat !== null && incident.end_lat !== undefined) ? Number(incident.end_lat) : undefined,
      end_lng: (incident.end_lng !== null && incident.end_lng !== undefined) ? Number(incident.end_lng) : undefined,
      reporter: incident.reporter || 'Anonymous',
      contact: incident.contact || 'No contact provided',
      photo_url: getFullPhotoUrl(incident.photo_url),
      responders: Math.floor(Math.random() * 5) + 1, // Mock responder count
      response_time: `${Math.floor(Math.random() * 10) + 1} min`,
      flood_level_cm: (incident.flood_level_cm !== null && incident.flood_level_cm !== undefined)
        ? Number(incident.flood_level_cm)
        : undefined,
      source: 'incident'
    }));
  };

  // Transform Incident Report API data
  const transformFloodReportData = (apiReports: any[]): IncidentData[] => {
    return apiReports.map(report => ({
      id: Number(report.id) + 1000000, // Offset ID to avoid collision with incidents
      type: 'Flood',
      location: report.location_text || report.barangay || 'Unknown Location',
      address: report.location_text || (report.barangay ? `Barangay ${report.barangay}` : 'Location not specified'),
      severity: report.severity || 'Moderate',
      status: report.status === 'Verified' ? 'Approved' : (report.status || 'Pending'),
      datetime: report.time || report.created_at,
      description: report.description || 'No description provided',
      lat: parseFloat(report.lat) || 0,
      lng: parseFloat(report.lng) || 0,
      reporter: report.reporter_name || 'Anonymous',
      contact: report.reporter_contact || 'No contact provided',
      photo_url: getFullPhotoUrl(report.media_path),
      responders: 0,
      response_time: 'N/A',
      source: 'flood_report',
      barangay: report.barangay ? `Barangay ${report.barangay}` : undefined
    }));
  };

  // Fetch real incidents from API
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // Fetch both incidents and incident reports
      const [incidentsRes, floodReportsRes] = await Promise.all([
        fetch('/api/list-incidents.php?limit=100'),
        fetch('/api/list-incident-reports.php?limit=1000&all_time=true&_t=' + Date.now())
      ]);

      const incidentsData = await incidentsRes.json();
      const floodReportsData = await floodReportsRes.json();
      
      let allIncidents: IncidentData[] = [];

      if (incidentsData.success && incidentsData.incidents) {
        allIncidents = [...allIncidents, ...transformIncidentData(incidentsData.incidents)];
      }

      if (Array.isArray(floodReportsData)) {
        allIncidents = [...allIncidents, ...transformFloodReportData(floodReportsData)];
      }

      const filteredIncidents = allIncidents.filter(i => !(i.type === 'Emergency Call' && i.reporter === 'System'));
      setIncidents(filteredIncidents);
        

      
    } catch (error) {
      console.error('Error fetching incidents:', error);
      // Fallback to sample data if API fails
        const sampleIncidents: IncidentData[] = [
          {
            id: 1,
            type: 'Flood',
            location: 'Barangay San Antonio',
            address: 'San Antonio Street, Laguna, Philippines',
            severity: 'High',
            status: 'Active',
            datetime: new Date(Date.now() - 120000).toISOString(),
            description: 'Heavy flooding reported in residential area due to continuous rainfall',
            lat: 14.5995,
            lng: 120.9842,
            reporter: 'Maria Santos',
            contact: '+63 912 345 6789',
            responders: 3,
            response_time: '2 min',
            source: 'incident'
          }
        ];
        setIncidents(sampleIncidents);

    } finally {
      setLoading(false);
    }
  };

  // Approval functions
  const handleApprove = async (id: number) => {
    try {
      const incident = incidents.find(i => i.id === id);
      if (incident?.source === 'flood_report') {
        const realId = id - 1000000;
        const response = await fetch('/api/approve-incident-report.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: realId, approved_by: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
          await fetchIncidents();
          alert('Flood report verified successfully!');
        } else {
          alert(data.error || 'Failed to verify incident report');
        }
        return;
      }

      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: 'Approved'
        }),
      });

      if (response.ok) {
        await fetchIncidents();
        alert('Incident approved successfully!');
      } else {
        alert('Failed to approve incident');
      }
    } catch (error) {
      console.error('Error approving incident:', error);
      alert('Error approving incident');
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      const incident = incidents.find(i => i.id === id);
      if (incident?.source === 'flood_report') {
        const realId = id - 1000000;
        const response = await fetch('/api/reject-incident-report.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: realId, rejected_by: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
          await fetchIncidents();
          setShowRejectModal(false);
          setRejectionReason('');
          setSelectedIncidentId(null);
          alert('Flood report rejected successfully!');
        } else {
          alert(data.error || 'Failed to reject incident report');
        }
        return;
      }

      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: 'Rejected',
          rejection_reason: reason
        }),
      });

      if (response.ok) {
        await fetchIncidents();
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedIncidentId(null);
        alert('Incident rejected successfully!');
      } else {
        alert('Failed to reject incident');
      }
    } catch (error) {
      console.error('Error rejecting incident:', error);
      alert('Error rejecting incident');
    }
  };

  const handleMarkAsResolved = async (id: number) => {
    try {
      const incident = incidents.find(i => i.id === id);
      if (incident?.source === 'flood_report') {
        const realId = id - 1000000;
        const response = await fetch('/api/resolve-incident-report.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: realId, resolved_by: 'Admin' })
        });
        const data = await response.json();
        if (data.success) {
          await fetchIncidents();
          alert('Flood report resolved successfully!');
        } else {
          alert(data.error || 'Failed to resolve incident report');
        }
        return;
      }

      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: 'Resolved'
        }),
      });

      const data = await response.json().catch(() => ({ success: response.ok }));

      if (data && data.success) {
        await fetchIncidents();
        alert('Incident marked as resolved!');
      } else {
        const errorMsg = (data && data.error) ? data.error : 'Failed to mark incident as resolved';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Error marking incident as resolved:', error);
      alert('Error marking incident as resolved');
    }
  };

  const handleReopen = async (id: number) => {
    try {
      const response = await fetch('/api/update-incident-status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: 'Approved'
        }),
      });

      if (response.ok) {
        await fetchIncidents();
        alert('Incident reopened successfully!');
      } else {
        alert('Failed to reopen incident');
      }
    } catch (error) {
      console.error('Error reopening incident:', error);
      alert('Error reopening incident');
    }
  };

  const openRejectModal = (id: number) => {
    setSelectedIncidentId(id);
    setShowRejectModal(true);
  };

  // Filter and sort incidents
  const filteredAndSortedIncidents = useMemo(() => {
    let filtered = incidents.filter(incident => {
      const matchesSearch = incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           incident.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = filterSeverity === 'all' || incident.severity.toLowerCase() === filterSeverity.toLowerCase();
      const matchesStatus = filterStatus === 'all' || incident.status.toLowerCase() === filterStatus.toLowerCase();

      // Date range match
      const incidentDate = new Date(incident.datetime);
      let matchesDate = true;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (incidentDate < from) matchesDate = false;
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        if (incidentDate > to) matchesDate = false;
      }
      
      // Filter by active tab
      let matchesTab = false;
      switch (activeTab) {
        case 'Pending':
          matchesTab = incident.status === 'Pending';
          break;
        case 'Approved':
          matchesTab = incident.status === 'Approved' || incident.status === 'Active';
          break;
        case 'Resolved':
          matchesTab = incident.status === 'Resolved';
          break;
        case 'Rejected':
          matchesTab = incident.status === 'Rejected';
          break;
        default:
          matchesTab = true;
      }
      
      return matchesSearch && matchesSeverity && matchesStatus && matchesTab && matchesDate;
    });

    // Sort incidents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'datetime':
          return new Date(b.datetime).getTime() - new Date(a.datetime).getTime();
        case 'severity':
          const severityOrder = { 'Critical': 4, 'High': 3, 'Moderate': 2, 'Low': 1 };
          return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
                 (severityOrder[a.severity as keyof typeof severityOrder] || 0);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'location':
          return a.location.localeCompare(b.location);
        default:
          return 0;
      }
    });

    return filtered;
  }, [incidents, searchTerm, filterSeverity, filterStatus, sortBy, dateFrom, dateTo, datePreset, activeTab]);





  // Effects
  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh incidents every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh data when active tab changes
  useEffect(() => {
    const refreshDataForTab = async () => {
      setTabLoading(true);
      await fetchIncidents();
      setTabLoading(false);
    };
    
    refreshDataForTab();
  }, [activeTab]);

  const handleIncidentClick = (incident: IncidentData) => {
    // Here you could open a modal or navigate to a detailed view
  };

  const handleRefresh = () => {
    fetchIncidents();
  };

  const handleShowMap = (incident: IncidentData) => {
    setSelectedIncidentForMap(incident);
    setShowMapModal(true);
  };

  const openResolveModal = (id: number) => {
    setResolveIncidentId(id);
    setShowResolveModal(true);
  };

  

  const openDetailsModal = (incident: IncidentData) => {
    setSelectedIncidentForDetails(incident);
    setShowDetailsModal(true);
  };

  // Static map snapshot URL for the Details modal (using OpenStreetMap static service)
  const staticMapUrlForDetails = useMemo(() => {
    if (!selectedIncidentForDetails) return '';
    const inc = selectedIncidentForDetails;
    const hasStart = inc.start_lat !== undefined && inc.start_lng !== undefined;
    const hasEnd = inc.end_lat !== undefined && inc.end_lng !== undefined;

    const centerLat = hasStart && hasEnd ? ((inc.start_lat as number) + (inc.end_lat as number)) / 2 : inc.lat;
    const centerLng = hasStart && hasEnd ? ((inc.start_lng as number) + (inc.end_lng as number)) / 2 : inc.lng;

    const markers: string[] = [];
    if (hasStart) markers.push(`${inc.start_lat},${inc.start_lng},lightblue1`);
    if (hasEnd) markers.push(`${inc.end_lat},${inc.end_lng},red`);
    if (!hasStart && !hasEnd) markers.push(`${inc.lat},${inc.lng},red`);

    const size = '520x320';
    const zoom = 14;
    const markerParam = encodeURIComponent(markers.join('|'));
    const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLng}&zoom=${zoom}&size=${size}&maptype=mapnik&markers=${markerParam}`;
    return url;
  }, [selectedIncidentForDetails]);

  const [detailsSnapshotUrl, setDetailsSnapshotUrl] = useState<string | null>(null);
  useEffect(() => {
    // Reset snapshot when a different incident is viewed
    setDetailsSnapshotUrl(null);
  }, [selectedIncidentForDetails]);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="w-full mx-auto py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BiShield className="text-blue-600" />
                Incident Reports
              </h1>
              <p className="text-gray-600 mt-1">Real-time incident monitoring and emergency response coordination</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BiTime />
                <span className="hidden sm:inline">Last updated:</span>
                <span className="font-medium">{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">Live</span>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <BiRefresh className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full mx-auto py-6">





        {/* Unified Incidents Panel: Search + Tabs + Active Incidents */}
        <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow mb-6">
          {/* Search and Filter Controls */}
          <div className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search incidents by type, location, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Responding">Responding</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>

                {/* Date Preset */}
                <select
                  value={datePreset}
                  onChange={(e) => setDateByPreset(e.target.value as 'all' | 'today' | '7d' | '30d' | 'custom')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>

                {/* Custom date inputs */}
                {datePreset === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="datetime">Sort by Time</option>
                  <option value="severity">Sort by Severity</option>
                  <option value="type">Sort by Type</option>
                  <option value="location">Sort by Location</option>
                </select>
              </div>
            </div>
          </div>

          {/* Incident Management Tabs */}
          <div className="border-t border-gray-200">
            <nav className="flex space-x-6 px-4 overflow-x-auto whitespace-nowrap" aria-label="Tabs">
              {['Pending', 'Approved', 'Resolved', 'Rejected'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  disabled={tabLoading}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${tabLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tabLoading && activeTab === tab && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  )}
                  {tab} ({incidents.filter(incident => {
                    switch (tab) {
                      case 'Pending': return incident.status === 'Pending';
                      case 'Approved': return incident.status === 'Approved' || incident.status === 'Active';
                      case 'Resolved': return incident.status === 'Resolved';
                      case 'Rejected': return incident.status === 'Rejected';
                      default: return false;
                    }
                  }).length})
                </button>
              ))}
            </nav>
          </div>

          {/* Active Incidents Grid */}
          <div className="border-t border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center items-start gap-2 sm:justify-between">
                <div className="flex items-center gap-2">
                  <BiError className="text-red-600 text-lg" />
                  <h2 className="text-lg font-semibold text-gray-900">Active Incidents</h2>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {filteredAndSortedIncidents.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FiRefreshCw className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                  <span>Auto-refresh: 30s</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading incidents...</span>
                </div>
              ) : filteredAndSortedIncidents.length === 0 ? (
                <div className="text-center py-12">
                  <BiError className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents found</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedIncidents.map((incident) => (
                    <EnhancedIncidentRow
                      key={incident.id}
                      incident={incident}
                      onClick={(inc) => openDetailsModal(inc)}
                      onApprove={handleApprove}
                      onReject={openRejectModal}
                      onMarkAsResolved={openResolveModal}
                      onReopen={handleReopen}
                      onShowMap={handleShowMap}
                      onShowDetails={(inc) => openDetailsModal(inc)}
                      showStatusPill={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Incident Reporting Interface removed for admin view */}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Incident</h3>
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this incident:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Enter rejection reason..."
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedIncidentId(null);
                  }}
                  className="flex-1 px-4 py-2 text-black bg-[#f59e0b] hover:bg-[#f59e0b]/90 rounded-lg font-bold tracking-wider uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedIncidentId && rejectionReason.trim()) {
                      handleReject(selectedIncidentId, rejectionReason);
                    }
                  }}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-[#f59e0b] hover:bg-[#f59e0b]/90 disabled:opacity-50 text-black rounded-lg font-bold tracking-wider uppercase transition-all"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        

        {/* Details Modal */}
        {showDetailsModal && selectedIncidentForDetails && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-white/95 to-blue-50/95 backdrop-blur-md border border-white/20 shadow-xl rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="bg-white/50 px-6 py-4 border-b border-gray-200/60 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Incident Details</h3>
                  <p className="text-sm text-gray-500 mt-0.5">ID: #{selectedIncidentForDetails.id}</p>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                      <span className="font-medium text-gray-700">Type:</span>
                      <span className="text-gray-900">{selectedIncidentForDetails.type}</span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <span className="font-medium text-gray-700">Severity:</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedIncidentForDetails.severity)}`}>
                        {selectedIncidentForDetails.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedIncidentForDetails.status)}`}>
                        {selectedIncidentForDetails.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                      <span className="font-medium text-gray-700">Location:</span>
                      <span className="text-gray-900">{cleanAddress(selectedIncidentForDetails.location)}</span>
                    </div>

                    {selectedIncidentForDetails.barangay && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                        <span className="font-medium text-gray-700">Barangay:</span>
                        <span className="text-gray-900">{selectedIncidentForDetails.barangay}</span>
                      </div>
                    )}

                    {selectedIncidentForDetails.description && (
                      <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                        <span className="font-medium text-gray-700">Description:</span>
                        <p className="text-gray-900 whitespace-pre-wrap">{selectedIncidentForDetails.description}</p>
                      </div>
                    )}

                    {selectedIncidentForDetails.photo_url && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700 block mb-2">Evidence:</span>
                        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex justify-center">
                          <img 
                            src={selectedIncidentForDetails.photo_url} 
                            alt="Incident Evidence" 
                            className="w-full h-auto object-contain max-h-[300px]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-100 space-y-2">
                      <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                        <span className="font-medium text-gray-700">Reported:</span>
                        <span className="text-gray-900">{new Date(selectedIncidentForDetails.datetime).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-[100px_1fr] gap-2 items-baseline">
                        <span className="font-medium text-gray-700">Reporter:</span>
                        <span className="text-gray-900">{selectedIncidentForDetails.reporter}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Map */}
                  <div className="flex flex-col h-full min-h-[400px]">
                    <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                    <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative z-0">
                      <MapContainer
                        center={[selectedIncidentForDetails.lat, selectedIncidentForDetails.lng]}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Marker position={[selectedIncidentForDetails.lat, selectedIncidentForDetails.lng]}>
                          <Popup>
                            <div className="text-sm font-medium">
                              {selectedIncidentForDetails.location}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 bg-white/50 p-3 rounded-lg border border-gray-100">
                      <FiMapPin className="mt-0.5 text-blue-500 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{selectedIncidentForDetails.location}</p>
                        {selectedIncidentForDetails.barangay && (
                          <p className="text-xs text-gray-500 mt-0.5">{selectedIncidentForDetails.barangay}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">Lat: {selectedIncidentForDetails.lat.toFixed(6)}, Lng: {selectedIncidentForDetails.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-white/50 px-6 py-4 border-t border-gray-200/60 flex justify-end shrink-0">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg shadow-sm transition-colors"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Resolve Confirmation Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Mark as Done</h3>
              <p className="text-sm text-gray-600 mb-4">Are you sure you want to mark this incident as resolved? This will update its status to <span className="font-medium">Resolved</span>.</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm"
                  onClick={() => {
                    setShowResolveModal(false);
                    setResolveIncidentId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                  onClick={async () => {
                    if (resolveIncidentId !== null) {
                      await handleMarkAsResolved(resolveIncidentId);
                    }
                    setShowResolveModal(false);
                    setResolveIncidentId(null);
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Modal */}
        {showMapModal && selectedIncidentForMap && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Incident Location</h3>
                  <p className="text-sm text-gray-600">
                    {selectedIncidentForMap.type} - {selectedIncidentForMap.location}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMapModal(false);
                    setSelectedIncidentForMap(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>

              {/* Map Container */}
              <div className="flex-1 p-4">
                <div className="h-full rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer
                    center={[selectedIncidentForMap.lat, selectedIncidentForMap.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {(['Pending', 'Rejected'].includes(selectedIncidentForMap.status)) ? (
                      (() => {
                        const hasStartEnd = !!selectedIncidentForMap.start_lat && !!selectedIncidentForMap.start_lng && !!selectedIncidentForMap.end_lat && !!selectedIncidentForMap.end_lng;
                        const positions: [number, number][] = hasStartEnd
                          ? [
                              [selectedIncidentForMap.start_lat as number, selectedIncidentForMap.start_lng as number],
                              [selectedIncidentForMap.end_lat as number, selectedIncidentForMap.end_lng as number]
                            ]
                          : [
                              [selectedIncidentForMap.lat - 0.0001, selectedIncidentForMap.lng - 0.0001],
                              [selectedIncidentForMap.lat + 0.0001, selectedIncidentForMap.lng + 0.0001]
                            ];
                        return (
                          <Polyline positions={positions} color="#3b82f6" weight={4} opacity={0.9} />
                        );
                      })()
                    ) : (
                      <Marker position={[selectedIncidentForMap.lat, selectedIncidentForMap.lng]} />
                    )}
                  </MapContainer>
                </div>
              </div>

              {/* Incident Details in Modal */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type & Severity</p>
                    <p className="text-sm font-medium text-gray-900">{selectedIncidentForMap.type}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      selectedIncidentForMap.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                      selectedIncidentForMap.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                      selectedIncidentForMap.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedIncidentForMap.severity}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</p>
                    <p className="text-sm text-gray-900">{selectedIncidentForMap.address}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reported</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedIncidentForMap.datetime).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</p>
                  <p className="text-sm text-gray-900">{selectedIncidentForMap.description}</p>
                </div>
                {/* Admin Approval Actions placed in map details */}
                {selectedIncidentForMap.status === 'Pending' && (
                  <div className="mt-4 flex gap-2 justify-end">
                    <button
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                      onClick={() => handleApprove(selectedIncidentForMap.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                      onClick={() => openRejectModal(selectedIncidentForMap.id)}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentReports;
