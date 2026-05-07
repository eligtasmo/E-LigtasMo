import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import MapboxMap, { NavigationControl, FullscreenControl, Source, Layer, Marker } from "../maps/MapboxMap";
import { SantaCruzMapboxOutline } from '../maps/SantaCruzOutline';
import { isPointInSantaCruz } from '../../utils/geoValidation';
import TacticalMarker from "../maps/TacticalMarker";
import './IncidentReportingView.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { 
  FaMapMarkerAlt, 
  FaExclamationTriangle, 
  FaCamera, 
  FaUser, 
  FaPhone, 
  FaEnvelope,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaSearch,
  FaWalking,
  FaMotorcycle,
  FaCar,
  FaTruck,
  FaShieldAlt,
  FaInfoCircle,
  FaWater,
  FaClock,
  FaSync
} from 'react-icons/fa';
import { FiRefreshCw } from 'react-icons/fi';

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN) as string | undefined;

const severities = ["Low", "Moderate", "High"];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return '';
    const data = await response.json();
    return data.features?.[0]?.place_name || '';
  } catch (error) {
    return '';
  }
}

interface IncidentReportingViewProps {
  showReceipt: boolean;
  setShowReceipt: (open: boolean) => void;
  referenceId: string | null;
  setReferenceId: (id: string | null) => void;
}

// ── Normalize area_geojson to a Feature object ────────────────────────────────
function normalizeGeoJSON(raw: any): { feature: any; coords: number[][] } | null {
  if (!raw) return null;
  let geom: any = null;
  if (raw.type === 'Feature' && raw.geometry) {
    geom = raw.geometry;
  } else if (raw.type === 'Polygon' || raw.type === 'MultiPolygon') {
    geom = raw;
  } else {
    return null;
  }
  if (!geom || !geom.coordinates) return null;
  const ring: number[][] = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0]?.[0];
  if (!ring || !Array.isArray(ring)) return null;
  return {
    feature: { type: 'Feature', properties: {}, geometry: geom },
    coords: ring,
  };
}

// ── Approximate circle polygon (GeoJSON) around a lat/lng ─────────────────────
function circleGeoJSON(lat: number, lng: number, radiusM: number, steps = 64) {
  const earthR = 6378137;
  const coords = Array.from({ length: steps }, (_, i) => {
    const angle = (i * 360) / steps;
    const rad   = (angle * Math.PI) / 180;
    const dLat  = (radiusM / earthR) * (180 / Math.PI) * Math.cos(rad);
    const dLng  = (radiusM / (earthR * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI) * Math.sin(rad);
    return [lng + dLng, lat + dLat];
  });
  coords.push(coords[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}

export default function IncidentReportingView({ showReceipt, setShowReceipt, referenceId, setReferenceId }: IncidentReportingViewProps) {

  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [viewport, setViewport] = useState({
    latitude: 14.2833,
    longitude: 121.4167,
    zoom: 13
  });
  const [unifiedAssets, setUnifiedAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [detailAsset, setDetailAsset] = useState<any | null>(null);

  const [mapInstance, setMapInstance] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapInstance || !containerRef.current) return;
    const observer = new ResizeObserver(() => mapInstance.resize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mapInstance]);

  const flyToAsset = (lat: number, lng: number) => {
    if (mapInstance) {
      mapInstance.flyTo({ center: [lng, lat], zoom: 16, duration: 1200, essential: true });
    }
  };

  const calculateCentroid = (coords: number[][]): [number, number] => {
    if (!coords || coords.length === 0) return [0, 0];
    const lng = coords.reduce((s, p) => s + p[0], 0) / coords.length;
    const lat = coords.reduce((s, p) => s + p[1], 0) / coords.length;
    return [lat, lng];
  };

  const sortPointsForPolygon = (points: [number, number][]) => {
    if (points.length < 3) return points;
    // Calculate centroid specifically for the sorting
    const latSum = points.reduce((s, p) => s + p[0], 0);
    const lngSum = points.reduce((s, p) => s + p[1], 0);
    const cLat = latSum / points.length;
    const cLng = lngSum / points.length;

    return [...points].sort((a, b) => {
      const angleA = Math.atan2(a[0] - cLat, a[1] - cLng);
      const angleB = Math.atan2(b[0] - cLat, b[1] - cLng);
      return angleA - angleB;
    });
  };

  const [drawMode, setDrawMode] = useState<'pinpoint' | 'polygon'>('pinpoint');
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [pinpointRadius, setPinpointRadius] = useState<number>(100);

  const [form, setForm] = useState({
    latitude: null as number | null,
    longitude: null as number | null,
    type: "",
    severity: "Moderate",
    allowedVehicles: ["Walking", "Motorcycle", "Car", "Truck"] as string[],
    description: "",
    medias: [] as string[],
    reporter_name: "",
    reporter_contact: "",
    reporter_email: "",
    brgy: "",
    role: "brgy"
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&country=ph&proximity=121.4167,14.2833`;
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const [lng, lat] = result.center;
    setViewport(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setLocationName(result.place_name);
    setSearchResults([]);
    setSearchQuery("");
  };

  const fetchData = async () => {
    try {
      const res = await apiFetch('unified-incidents.php');
      const json = await res.json();
      if (json.success) {
        // Only show approved/active/resolved reports on the general reporting map
        const activeOnly = (json.data || []).filter((inc: any) => 
          ['ACTIVE', 'APPROVED', 'VERIFIED', 'RESOLVED'].includes((inc.status || '').toUpperCase())
        );
        setUnifiedAssets(activeOnly);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReset = () => {
    setForm({
      latitude: null as number | null,
      longitude: null as number | null,
      type: "",
      severity: "Moderate",
      allowedVehicles: ["Walking", "Motorcycle", "Car", "Truck"] as string[],
      description: "",
      medias: [] as string[],
      reporter_name: user?.full_name || user?.username || "",
      reporter_contact: user?.contact_number || "",
      reporter_email: user?.email || "",
      brgy: user?.brgy_name || user?.brgy || "",
      role: (user?.role as any) || "brgy"
    });
    setLocationName("");
    setPolygonPoints([]);
  };

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [sourceTable, setSourceTable] = useState<string>("");

  // Handle pre-fill from Tactical Dashboard
  useEffect(() => {
    const prefill = location.state?.prefill;
    const isEdit = location.state?.isEdit;
    
    if (prefill) {
      setIsEditMode(!!isEdit);
      setEditId(prefill.id);
      setSourceTable(prefill.source_table || "");

      const lat = Number(prefill.lat);
      const lng = Number(prefill.lng);
      
      setForm(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        type: prefill.type || "",
        severity: prefill.severity || "Moderate",
        description: prefill.description || "",
      }));

      setViewport(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        zoom: 17
      }));

      if (mapInstance) {
        mapInstance.flyTo({
          center: [lng, lat],
          zoom: 17,
          duration: 2000,
          essential: true
        });
      }

      // Reverse geocode for the address field
      reverseGeocode(lat, lng).then(addr => {
        setLocationName(addr);
      });
    }
  }, [location.state, mapInstance]);

  // Initialize user info
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        reporter_name: user.full_name || user.username || "",
        reporter_contact: user.contact_number || "",
        reporter_email: user.email || "",
        brgy: user.brgy_name || user.brgy || "",
        role: user.role || "brgy"
      }));
    }
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setViewport(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }));
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setForm(prev => ({ ...prev, medias: [...(prev.medias || []), result].slice(0, 3) }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      alert("Please select a location on the map.");
      return;
    }
    if (!form.severity) {
      alert("Please select a severity level.");
      return;
    }
    if (!form.type) {
      alert("Please select an incident type.");
      return;
    }
    if (!form.description && (form.medias || []).length === 0) {
      alert("Please provide at least a description or one evidence photo.");
      return;
    }

    setLoading(true);
    try {
      let payloadUrl = "submit-incident-report.php";
      let payload: any = {
        user_id: user?.id || 0,
        latitude: form.latitude,
        longitude: form.longitude,
        type: form.type,
        severity: form.severity,
        allowedVehicles: form.allowedVehicles,
        medias: form.medias,
        description: form.description || `Report by ${form.role}`,
        brgy: form.brgy,
        reporter_name: form.reporter_name,
        reporter_contact: form.reporter_contact,
        reporter_email: form.reporter_email,
        role: form.role,
        is_passable: form.allowedVehicles.length === 4 ? 1 : 0 // If all are selected, it's fully passable
      };

      if (drawMode === 'polygon') {
        if (polygonPoints.length < 3) {
          alert("Please draw a polygon with at least 3 points on the map.");
          setLoading(false);
          return;
        }
        
        payloadUrl = "add-hazard.php";
        const severityDb = form.severity; // Keep original severity (Critical, High, Moderate, Low)
        const sorted = sortPointsForPolygon(polygonPoints);
        const coordinates = [...sorted.map(p => [p[1], p[0]]), [sorted[0][1], sorted[0][0]]];
        
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        polygonPoints.forEach(p => {
           minLat = Math.min(minLat, p[0]);
           maxLat = Math.max(maxLat, p[0]);
           minLng = Math.min(minLng, p[1]);
           maxLng = Math.max(maxLng, p[1]);
        });
        
        payload = {
          type: form.type,
          severity: severityDb,
          allowedVehicles: form.allowedVehicles,
          area_geojson: {
            type: "Polygon",
            coordinates: [coordinates]
          },
          brgy: form.brgy,
          reportedBy: form.reporter_name,
          reporter: form.reporter_name,
          location: locationName || form.brgy,
          address: locationName || form.brgy,
          description: form.description,
          lat: (minLat + maxLat) / 2,
          lng: (minLng + maxLng) / 2
        };
      } else {
        // Pinpoint mode — attach the radius circle as area_geojson
        const circle = circleGeoJSON(form.latitude!, form.longitude!, pinpointRadius);
        payload = {
          ...payload,
          area_geojson: circle.geometry,
          radius_m: pinpointRadius,
        };
      }

      const response = await apiFetch(isEditMode ? (sourceTable === 'incident_reports' ? 'update-incident-report.php' : 'update-hazard.php') : payloadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditMode ? { ...payload, id: editId } : payload),
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Server returned an invalid response (500). Please check server logs.");
      }

      if (data.success) {
        setReferenceId(String(data.report_id || data.hazard_id || "SYS-GEN"));
        setShowReceipt(true);
        fetchData(); // Refresh assets on map
        setForm(prev => ({
          ...prev,
          latitude: null,
          longitude: null,
          severity: "Moderate",
          allowedVehicles: ["Walking", "Motorcycle", "Car", "Truck"],
          description: "",
          medias: []
        }));
        setLocationName("");
        setPolygonPoints([]);
      } else {
        alert(data.error || "Failed to submit report");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="incident-reporting-container flex h-full w-full overflow-hidden bg-gray-50 relative">

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {detailAsset && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDetailAsset(null)}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden font-jetbrains" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-gray-900 font-bold text-base tracking-wide">{detailAsset.type || 'Hazard'}</h3>
                <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${
                  detailAsset.severity === 'High' || detailAsset.severity === 'Critical' ? 'bg-red-500/10 text-red-600' : 'bg-yellow-500/10 text-yellow-600'
                }`}>{(detailAsset.severity || 'MODERATE').toUpperCase()}</span>
              </div>
              <button onClick={() => setDetailAsset(null)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                <FaTimes className="text-gray-400 text-sm" />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3">
              {detailAsset.location_text || detailAsset.address ? (
                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-gray-900 text-sm leading-snug">{detailAsset.location_text || detailAsset.address}</p>
                </div>
              ) : null}
              {detailAsset.description ? (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Description</p>
                  <p className="text-gray-900 text-sm leading-relaxed">{detailAsset.description}</p>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <FaClock className="text-gray-400 shrink-0" />
                <p className="text-gray-500 text-xs">{new Date(detailAsset.time || detailAsset.created_at || Date.now()).toLocaleString()}</p>
              </div>
              {detailAsset.reporter ? (
                <div className="flex items-center gap-3">
                  <FaUser className="text-gray-400 shrink-0" />
                  <p className="text-gray-500 text-xs">Reported by <span className="text-gray-900">{detailAsset.reporter}</span></p>
                </div>
              ) : null}
              {detailAsset.area_geojson && (
                <div className="flex items-center gap-2 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl p-2.5">
                  <FaShieldAlt className="text-[#f59e0b] shrink-0" />
                  <p className="text-[#f59e0b] text-xs font-medium">Zone area marked — routes will be rerouted around this zone</p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setDetailAsset(null)} className="w-full py-3 bg-[#f59e0b] text-black font-bold rounded-xl hover:bg-[#f59e0b]/90 transition-colors text-sm tracking-widest uppercase">Close</button>
            </div>
          </div>
        </div>
      )}
      {showReceipt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="receipt-container p-8 bg-white border border-gray-200 rounded-[24px] shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all font-mono">
            <div className="mb-6 text-[#34c759] flex justify-center">
              <div className="w-20 h-20 rounded-full bg-[#34c759]/10 flex items-center justify-center border border-[#34c759]/20">
                <FaCheckCircle size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 tracking-wide">Report Submitted!</h2>
            <p className="text-gray-500 mb-8 text-[13px] leading-relaxed">
              Your incident report has been successfully submitted and verified in the system.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl mb-8 border border-gray-200">
              <p className="text-[11px] text-slate-500 tracking-widest uppercase mb-1">Hazard ID</p>
              <p className="text-xl font-bold text-[#f59e0b] tracking-wider">{referenceId}</p>
            </div>
            <button 
              onClick={() => setShowReceipt(false)}
              className="bg-[#f59e0b] text-black font-bold px-6 py-4 rounded-xl hover:bg-[#f59e0b]/90 transition-colors w-full tracking-widest uppercase text-[12px]"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 relative h-full z-0 overflow-hidden">
        <MapboxMap
          onLoad={(e: any) => setMapInstance(e.target)}
          {...viewport}
          onMove={(evt: any) => setViewport(evt.viewState)}
          style={{ height: "100%", width: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={async (e: any) => {
            const { lng, lat } = e.lngLat;
            if (!isPointInSantaCruz(lat, lng)) {
              alert("Incident pinpoint restricted to Santa Cruz, Laguna area only.");
              return;
            }
            if (drawMode === 'polygon') {
              setPolygonPoints(prev => [...prev, [lat, lng]]);
              if (polygonPoints.length === 0) {
                setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                const address = await reverseGeocode(lat, lng);
                setLocationName(address || `Polygon Area`);
              }
            } else {
              setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
              const address = await reverseGeocode(lat, lng);
              setLocationName(address || `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`);
              
              // Auto-center on click
              if (mapInstance) {
                mapInstance.flyTo({
                  center: [lng, lat],
                  zoom: 17,
                  duration: 1000,
                  essential: true
                });
              }
            }
          }}
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          <SantaCruzMapboxOutline />
          
          {drawMode === 'pinpoint' && form.latitude && form.longitude && (
            <TacticalMarker 
              latitude={form.latitude} 
              longitude={form.longitude}
              type={form.type || (form.severity === 'Critical' || form.severity === 'High' ? 'hazard' : 'flood')}
              label="HERE"
            />
          )}

          {unifiedAssets.filter(a => !a.area_geojson).map((asset) => (
            <TacticalMarker
              key={`${asset.source_table}-${asset.id}`}
              latitude={Number(asset.lat || 0)}
              longitude={Number(asset.lng || 0)}
              type={asset.type || 'flood'}
              status={asset.status}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedAsset(asset);
                flyToAsset(Number(asset.lat), Number(asset.lng));
              }}
            />
          ))}

          {/* ── Existing hazard/flood zones (pinpoints + polygons) ── */}
          {unifiedAssets.map((a, idx) => {
            const rawGeo = a.area_geojson
              ? (typeof a.area_geojson === 'string' ? (() => { try { return JSON.parse(a.area_geojson); } catch { return null; } })() : a.area_geojson)
              : null;
            const normalized = rawGeo ? normalizeGeoJSON(rawGeo) : null;
            const color = (a.severity === 'High' || a.severity === 'Critical') ? '#ef4444' : '#f59e0b';

            if (normalized) {
              // Has polygon/circle area
              const [cLat, cLng] = calculateCentroid(normalized.coords);
              return (
                <React.Fragment key={`zone-${idx}`}>
                  <Source id={`zone-src-${idx}`} type="geojson" data={normalized.feature}>
                    <Layer id={`zone-fill-${idx}`} type="fill" paint={{ 'fill-color': color, 'fill-opacity': 0.18 }} />
                    <Layer id={`zone-line-${idx}`} type="line" paint={{ 'line-color': color, 'line-width': 2, 'line-dasharray': [3, 2] }} />
                  </Source>
                  <TacticalMarker
                    latitude={cLat}
                    longitude={cLng}
                    type={a.type || 'hazard'}
                    status={a.status}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setDetailAsset(a);
                      flyToAsset(cLat, cLng);
                    }}
                  />
                </React.Fragment>
              );
            } else if (a.lat && a.lng) {
              // Pinpoint without circle
              return (
                <TacticalMarker
                  key={`pin-${idx}`}
                  latitude={Number(a.lat)}
                  longitude={Number(a.lng)}
                  type={a.type || 'hazard'}
                  status={a.status}
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setDetailAsset(a);
                    flyToAsset(Number(a.lat), Number(a.lng));
                  }}
                />
              );
            }
            return null;
          })}

          {drawMode === 'polygon' && polygonPoints.map((p, idx) => (
            <Marker 
              key={idx} 
              latitude={p[0]} 
              longitude={p[1]} 
              draggable={true}
              onDrag={(e) => {
                setPolygonPoints(prev => {
                  const newPoints = [...prev];
                  newPoints[idx] = [e.lngLat.lat, e.lngLat.lng];
                  return newPoints;
                });
              }}
            >
              <div className="w-4 h-4 bg-[#f59e0b] rounded-full border-2 border-white shadow-md cursor-move hover:scale-110 transition-transform"></div>
            </Marker>
          ))}

          {drawMode === 'polygon' && polygonPoints.length > 1 && (
            <Source id="draw-polygon" type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: polygonPoints.length < 3 ? 'LineString' : 'Polygon',
                coordinates: (() => {
                  const sorted = sortPointsForPolygon(polygonPoints);
                  return polygonPoints.length < 3 
                    ? polygonPoints.map(p => [p[1], p[0]])
                    : [[...sorted.map(p => [p[1], p[0]]), [sorted[0][1], sorted[0][0]]]];
                })()
              } as any
            }}>
              {polygonPoints.length >= 3 && (
                <Layer
                  id="draw-polygon-fill"
                  type="fill"
                  paint={{
                    'fill-color': '#f59e0b',
                    'fill-opacity': 0.2
                  }}
                />
              )}
              <Layer
                id="draw-polygon-line"
                type="line"
                paint={{
                  'line-color': '#f59e0b',
                  'line-width': 3
                }}
              />
            </Source>
          )}
          {/* ── Pinpoint radius circle preview ── */}
          {drawMode === 'pinpoint' && form.latitude && form.longitude && (() => {
            const circleFeat = circleGeoJSON(form.latitude!, form.longitude!, pinpointRadius);
            return (
              <Source id="pinpoint-radius" type="geojson" data={circleFeat as any}>
                <Layer id="pinpoint-radius-fill" type="fill" paint={{ 'fill-color': '#f59e0b', 'fill-opacity': 0.15 }} />
                <Layer id="pinpoint-radius-line" type="line" paint={{ 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [4, 2] }} />
              </Source>
            );
          })()}
        </MapboxMap>
        
        {/* Floating Search Bar */}
        <div className="absolute top-6 left-6 z-[10] w-[400px] max-w-[90%]">
          <form onSubmit={handleSearch} className="flex shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md overflow-hidden border border-slate-200/50 transition-all focus-within:ring-4 focus-within:ring-slate-900/10">
            <div className="pl-5 flex items-center">
              <FaSearch className="text-slate-400 text-sm" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a tactical location..."
              className="flex-1 px-4 py-3.5 text-[13px] outline-none bg-transparent text-slate-900 font-bold placeholder-slate-400"
            />
            <button 
              type="submit" 
              className="bg-slate-900 text-white px-6 hover:bg-slate-800 transition-all flex items-center justify-center active:scale-95"
              disabled={isSearching}
            >
              {isSearching ? <FaSpinner className="animate-spin text-sm" /> : <FaCheckCircle className="text-sm" />}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-slate-100 custom-scrollbar divide-y divide-slate-50">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <p className="font-bold text-[13px] text-slate-900">{result.text}</p>
                  <p className="text-[11px] text-slate-500 truncate">{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-[340px] h-full bg-gray-50 p-5 border-l border-gray-100 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar font-jetbrains shrink-0 animate-in slide-in-from-right duration-500">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[#f59e0b] font-bold text-lg tracking-tight uppercase">
              {isEditMode ? 'Intel Mod' : (selectedAsset ? 'Inspection' : 'Hazards')}
            </h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-0.5">
              {isEditMode ? `Ref ${editId}` : (selectedAsset ? `Ref ${selectedAsset.id}` : 'Surveillance')}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => {
              fetchData();
              setSelectedAsset(null);
            }}
            className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-[#f59e0b] hover:bg-gray-50 transition-all shadow-sm"
          >
            <FiRefreshCw className="text-sm" />
          </button>
        </div>

        {selectedAsset ? (
          <div className="flex-1 space-y-5 animate-in fade-in zoom-in duration-300">
            {/* Asset Detail Content (existing logic) */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
              {/* ... (rest of selectedAsset view) ... */}
            </div>
          </div>
        ) : (
          <>
            {(user?.role === 'admin' || user?.role === 'brgy') && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4 shadow-inner">
                <button
                  type="button"
                  onClick={() => { setDrawMode('pinpoint'); setPolygonPoints([]); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all ${drawMode === 'pinpoint' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >Pinpoint</button>
                <button
                  type="button"
                  onClick={() => { setDrawMode('polygon'); setForm(prev => ({ ...prev, latitude: null, longitude: null })); }}
                  className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all ${drawMode === 'polygon' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >Polygon</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 custom-scrollbar overflow-y-auto pr-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-50/50 border-b border-gray-100">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Selected Location</p>
                  <p className="text-slate-900 text-[12px] font-bold tracking-tight leading-tight">
                    {locationName ? locationName.split(',')[0] : "Awaiting map selection..."}
                  </p>
                </div>

                {drawMode === 'pinpoint' ? (
                  <div className="divide-y divide-gray-100">
                    <div className="grid grid-cols-2 divide-x divide-gray-100">
                      <div className="p-2">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Latitude</p>
                        <p className="text-[11px] font-bold text-slate-900">{form.latitude ? form.latitude.toFixed(5) : '--'}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Longitude</p>
                        <p className="text-[11px] font-bold text-slate-900">{form.longitude ? form.longitude.toFixed(5) : '--'}</p>
                      </div>
                    </div>
                    {form.latitude && form.longitude && (
                      <div className="p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Impact Radius</span>
                          <span className="text-[#f59e0b] text-[11px] font-bold">{pinpointRadius}m</span>
                        </div>
                        <input
                          type="range" min={25} max={1000} step={25}
                          value={pinpointRadius}
                          onChange={e => setPinpointRadius(Number(e.target.value))}
                          className="w-full accent-[#f59e0b] cursor-pointer h-1 bg-gray-100 rounded-lg appearance-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div className="p-2 text-center">
                      <p className="text-[#f59e0b] text-sm font-bold tracking-tight">{polygonPoints.length}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Points</p>
                    </div>
                    <button type="button" onClick={() => setPolygonPoints(prev => prev.slice(0, -1))} className="p-2 flex items-center justify-center hover:bg-gray-50 transition-all text-red-600 font-bold text-[9px] uppercase tracking-widest">Undo</button>
                    <button type="button" onClick={() => { setPolygonPoints([]); setForm(prev => ({ ...prev, latitude: null, longitude: null })); setLocationName(""); }} className="p-2 flex items-center justify-center hover:bg-gray-50 transition-all text-slate-400 font-bold text-[9px] uppercase tracking-widest">Clear</button>
                  </div>
                )}
              </div>

              {/* Incident Type */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incident Type</span>
                </div>
                <div className="relative">
                  <select
                    value={form.type}
                    onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-white text-slate-900 text-[11px] p-2.5 outline-none border-none appearance-none cursor-pointer pr-10 font-medium tracking-tight"
                  >
                    <option value="" disabled>Select report category</option>
                    {["Flood", "Road Accident", "Fire", "Medical Emergency", "Crime", "Structural Collapse", "Other"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Road Passability */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Road Passability</span>
                </div>
                <div className="flex divide-x divide-gray-100 bg-white">
                  {[
                    { id: "Walking", icon: FaWalking },
                    { id: "Motorcycle", icon: FaMotorcycle },
                    { id: "Car", icon: FaCar },
                    { id: "Truck", icon: FaTruck }
                  ].map(({ id, icon: Icon }) => {
                    const isPassable = form.allowedVehicles.includes(id);
                    return (
                       <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({
                            ...prev,
                            allowedVehicles: prev.allowedVehicles.includes(id)
                              ? prev.allowedVehicles.filter(v => v !== id)
                              : [...prev.allowedVehicles, id]
                          }));
                        }}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all duration-200 ${
                          isPassable 
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        <Icon className="text-[14px]" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">{id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Level */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-1.5 bg-gray-100/50 border-b border-gray-100">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Filter</span>
                </div>
                <div className="flex divide-x divide-gray-100">
                  {severities.map(level => {
                    const isSelected = form.severity === level;
                    const colorMap: Record<string, string> = {
                      'Low': isSelected ? 'bg-emerald-500 text-white' : 'text-emerald-600',
                      'Moderate': isSelected ? 'bg-amber-500 text-white' : 'text-amber-600',
                      'High': isSelected ? 'bg-red-500 text-white' : 'text-red-600'
                    };
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, severity: level }))}
                        className={`flex-1 py-2 text-[10px] transition-all duration-200 font-bold tracking-widest uppercase ${
                          isSelected ? colorMap[level] : `bg-white ${colorMap[level]} hover:bg-gray-50`
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Evidence</span>
                  <span className="text-[#f59e0b] text-[10px] font-bold">{(form.medias || []).length}/3</span>
                </div>
                <div className="p-3 grid grid-cols-3 gap-2">
                  {(form.medias || []).map((m, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                      <img src={m} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, medias: prev.medias?.filter((_, i) => i !== idx) }))}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <FaTimes size={8} />
                      </button>
                    </div>
                  ))}
                  {(form.medias || []).length < 3 && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('media-upload')?.click()}
                      className="aspect-square bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all group"
                    >
                      <FaCamera className="text-gray-300 group-hover:text-[#f59e0b] text-sm" />
                      <span className="text-[8px] font-bold text-slate-500 uppercase">Add</span>
                    </button>
                  )}
                </div>
                <input id="media-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Field Notes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Field Notes</span>
                </div>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-white text-slate-900 text-[11px] placeholder-gray-300 resize-none outline-none font-medium leading-relaxed"
                  placeholder="Enter operational details..."
                  rows={2}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || (drawMode === 'pinpoint' ? !form.latitude : polygonPoints.length < 3) || !form.type}
                  className="w-full py-4 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-200 disabled:text-gray-400 text-black font-bold text-[11px] tracking-[0.2em] uppercase rounded-2xl transition-all shadow-lg shadow-[#f59e0b]/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <><FaCheckCircle /> Submit Report</>}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
        @media (min-width: 768px) {
          .incident-reporting-container .mapboxgl-ctrl-top-right {
            right: 24px !important;
            top: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
