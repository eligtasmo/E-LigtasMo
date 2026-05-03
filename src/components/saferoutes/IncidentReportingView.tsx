import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import MapboxMap, { NavigationControl, FullscreenControl, Source, Layer, Marker } from "../maps/MapboxMap";
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
    barangay: "",
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
      barangay: user?.brgy_name || user?.barangay || "",
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
        barangay: user.brgy_name || user.barangay || "",
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
        barangay: form.barangay,
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
        const coordinates = [...polygonPoints.map(p => [p[1], p[0]]), [polygonPoints[0][1], polygonPoints[0][0]]];
        
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
          barangay: form.barangay,
          reportedBy: form.reporter_name,
          reporter: form.reporter_name,
          location: locationName || form.barangay,
          address: locationName || form.barangay,
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
    <div ref={containerRef} className="incident-reporting-container flex h-full w-full overflow-hidden bg-[#0a0a0a] relative">

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {detailAsset && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDetailAsset(null)}>
          <div className="bg-[#1c1c1e] border border-[#3a3a3c] rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#3a3a3c]">
              <div>
                <h3 className="text-white font-bold text-base tracking-wide">{detailAsset.type || 'Hazard'}</h3>
                <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded mt-1 inline-block ${
                  detailAsset.severity === 'High' || detailAsset.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{(detailAsset.severity || 'MODERATE').toUpperCase()}</span>
              </div>
              <button onClick={() => setDetailAsset(null)} className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center hover:bg-[#3a3a3c] transition-colors">
                <FaTimes className="text-[#8e8e93] text-sm" />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-3">
              {detailAsset.location_text || detailAsset.address ? (
                <div className="flex items-start gap-3">
                  <FaMapMarkerAlt className="text-[#8e8e93] mt-0.5 shrink-0" />
                  <p className="text-white text-sm leading-snug">{detailAsset.location_text || detailAsset.address}</p>
                </div>
              ) : null}
              {detailAsset.description ? (
                <div className="bg-[#2c2c2e] rounded-xl p-3 border border-[#3a3a3c]">
                  <p className="text-[#8e8e93] text-[10px] uppercase tracking-widest mb-1">Description</p>
                  <p className="text-white text-sm leading-relaxed">{detailAsset.description}</p>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <FaClock className="text-[#8e8e93] shrink-0" />
                <p className="text-[#8e8e93] text-xs">{new Date(detailAsset.time || detailAsset.created_at || Date.now()).toLocaleString()}</p>
              </div>
              {detailAsset.reporter ? (
                <div className="flex items-center gap-3">
                  <FaUser className="text-[#8e8e93] shrink-0" />
                  <p className="text-[#8e8e93] text-xs">Reported by <span className="text-white">{detailAsset.reporter}</span></p>
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="receipt-container p-8 bg-[#1c1c1e] border border-[#3a3a3c] rounded-[24px] shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all font-mono">
            <div className="mb-6 text-[#34c759] flex justify-center">
              <div className="w-20 h-20 rounded-full bg-[#34c759]/10 flex items-center justify-center border border-[#34c759]/20">
                <FaCheckCircle size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-white tracking-wide">Report Submitted!</h2>
            <p className="text-[#8e8e93] mb-8 text-[13px] leading-relaxed">
              Your incident report has been successfully submitted and verified in the system.
            </p>
            <div className="bg-[#2c2c2e] p-4 rounded-xl mb-8 border border-[#3a3a3c]">
              <p className="text-[11px] text-[#8e8e93] tracking-widest uppercase mb-1">Hazard ID</p>
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
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          onClick={async (e: any) => {
            const { lng, lat } = e.lngLat;
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
                coordinates: polygonPoints.length < 3 
                  ? polygonPoints.map(p => [p[1], p[0]])
                  : [[...polygonPoints.map(p => [p[1], p[0]]), [polygonPoints[0][1], polygonPoints[0][0]]]]
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
        
        <div className="absolute top-6 right-20 z-[10] w-72 md:w-80">
          <form onSubmit={handleSearch} className="flex shadow-xl rounded-xl bg-[#1c1c1e]/90 backdrop-blur-md overflow-hidden border border-white/10 transition-all focus-within:ring-2 focus-within:ring-[#f59e0b]/50">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location..."
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-white placeholder-gray-500"
            />
            <button 
              type="submit" 
              className="bg-[#f59e0b] text-black px-4 hover:bg-[#f59e0b]/90 transition-colors flex items-center justify-center"
              disabled={isSearching}
            >
              {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </form>
          
          {searchResults.length > 0 && (
            <div className="mt-2 bg-[#1c1c1e] rounded-xl shadow-2xl max-h-64 overflow-y-auto border border-white/10 custom-scrollbar">
              {searchResults.map((result, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectSearchResult(result)}
                  className="px-4 py-3 text-sm text-gray-300 hover:bg-[#f59e0b]/10 hover:text-white cursor-pointer border-b border-white/5 last:border-b-0 transition-colors"
                >
                  <p className="font-bold text-[13px]">{result.text}</p>
                  <p className="text-[11px] text-gray-500 truncate">{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-[400px] h-full bg-[#1c1c1e] p-6 border-l border-white/5 flex flex-col z-20 shadow-2xl overflow-y-auto custom-scrollbar font-mono shrink-0 animate-in slide-in-from-right duration-500">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[#f59e0b] font-bold text-xl tracking-wider">
              {isEditMode ? 'INTEL_MODIFICATION' : (selectedAsset ? 'INSPECTION_MODE' : 'HAZARD_MANAGEMENT')}
            </h2>
            <p className="text-white text-[13px] mt-1 tracking-widest">
              {selectedAsset ? `REF_${selectedAsset.id}` : 'Awaiting Data'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                fetchData();
                setSelectedAsset(null);
              }}
              className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center cursor-pointer hover:bg-[#3a3a3c] transition-colors group"
              title="Reload Data"
            >
              <FiRefreshCw className="text-[#f59e0b] text-sm group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>

        {selectedAsset ? (
          <div className="flex-1 space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden shadow-xl">
              <div className="w-full h-48 relative bg-[#1c1c1e]">
                {(() => {
                  let media = selectedAsset.media_urls;
                  if (typeof media === 'string') {
                    try { media = JSON.parse(media); } catch (e) { media = []; }
                  }
                  const urls = Array.isArray(media) ? media : [];
                  return urls.length > 0 ? (
                    <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                       {urls.map((url: string, i: number) => (
                          <img key={i} src={url.startsWith('data:') ? url : `/uploads/${url}`} alt="Evidence" className="w-full h-full object-cover snap-center shrink-0" />
                       ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#3a3a3c]">
                      <FaWater className="text-[60px] mb-2 opacity-20" />
                      <span className="text-[10px] tracking-widest uppercase opacity-50 text-white font-bold">NO_VISUAL_DATA</span>
                    </div>
                  );
                })()}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg tracking-wide">{selectedAsset.type || 'Hazard Event'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <FaShieldAlt className="text-[#f59e0b] text-[10px]" />
                      <span className="text-[#8e8e93] text-[11px] tracking-widest uppercase">{selectedAsset.status || 'ACTIVE'}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest ${
                    selectedAsset.severity === 'High' || selectedAsset.severity === 'Critical' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                  }`}>
                    {selectedAsset.severity || 'MODERATE'}
                  </span>
                </div>
                <div className="h-[1px] bg-[#3a3a3c] my-4"></div>
                <div className="space-y-4">
                   <div className="flex items-start gap-3">
                      <FaMapMarkerAlt className="text-[#8e8e93] mt-1" />
                      <div>
                        <p className="text-[#8e8e93] text-[10px] tracking-widest uppercase mb-0.5">Location</p>
                        <p className="text-white text-[13px] leading-snug">{selectedAsset.location_text || selectedAsset.address || 'Field Data'}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-3">
                      <FaClock className="text-[#8e8e93] mt-1" />
                      <div>
                        <p className="text-[#8e8e93] text-[10px] tracking-widest uppercase mb-0.5">Timestamp</p>
                        <p className="text-white text-[13px]">{new Date(selectedAsset.time || selectedAsset.created_at || Date.now()).toLocaleString()}</p>
                      </div>
                   </div>
                   <div className="bg-[#1c1c1e] p-4 rounded-xl border border-[#3a3a3c]">
                      <p className="text-[#8e8e93] text-[10px] tracking-widest uppercase mb-2">Operational_Notes</p>
                      <p className="text-white text-[13px] leading-relaxed italic">"{selectedAsset.description || 'No description provided.'}"</p>
                   </div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSelectedAsset(null)}
              className="w-full py-4 bg-[#f59e0b] text-black font-bold rounded-xl hover:bg-[#f59e0b]/90 transition-all tracking-widest text-[12px] shadow-lg shadow-[#f59e0b]/10"
            >
              BACK_TO_REPORTING
            </button>
          </div>
        ) : (
          <>
        {(user?.role === 'admin' || user?.role === 'brgy') && (
          <div className="flex bg-[#2c2c2e] rounded-xl p-1 mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setDrawMode('pinpoint');
                setPolygonPoints([]);
              }}
              className={`flex-1 py-2 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${drawMode === 'pinpoint' ? 'bg-[#3a3a3c] text-white shadow-md' : 'text-[#8e8e93] hover:text-white'}`}
            >
              PINPOINT
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawMode('polygon');
                setForm(prev => ({ ...prev, latitude: null, longitude: null }));
              }}
              className={`flex-1 py-2 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${drawMode === 'polygon' ? 'bg-[#3a3a3c] text-white shadow-md' : 'text-[#8e8e93] hover:text-white'}`}
            >
              POLYGON
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 flex-1">
          <div className="bg-[#2c2c2e] rounded-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#3a3a3c]">
              <div className="text-center w-full">
                <div className="text-white text-[14px] font-bold tracking-wider truncate px-4">
                  {locationName ? locationName.split(',')[0] : "LOC"}
                </div>
                <div className="text-[#8e8e93] text-[11px] mt-0.5 tracking-wider truncate px-2">
                  {locationName ? locationName.split(',').slice(1).join(',').trim() : "Tap on map"}
                </div>
              </div>
            </div>
            {drawMode === 'pinpoint' ? (
              <div className="flex flex-col bg-[#2c2c2e] divide-y divide-[#3a3a3c]">
                <div className="flex divide-x divide-[#3a3a3c]">
                  <div className="flex-1 p-3 text-center flex flex-col items-center justify-center">
                    <span className="text-white text-[13px] font-medium">{form.latitude ? form.latitude.toFixed(4) : '--'}</span>
                    <span className="text-[#8e8e93] text-[11px]">Lat</span>
                  </div>
                  <div className="flex-1 p-3 text-center flex flex-col items-center justify-center">
                    <span className="text-white text-[13px] font-medium">{form.longitude ? form.longitude.toFixed(4) : '--'}</span>
                    <span className="text-[#8e8e93] text-[11px]">Lng</span>
                  </div>
                </div>
                {form.latitude && form.longitude && (
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#8e8e93] text-[10px] uppercase tracking-widest font-bold">Affected Radius</span>
                      <span className="text-[#f59e0b] text-[12px] font-bold">{pinpointRadius}m</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={1000}
                      step={25}
                      value={pinpointRadius}
                      onChange={e => setPinpointRadius(Number(e.target.value))}
                      className="w-full accent-[#f59e0b] cursor-pointer"
                    />
                    <div className="flex justify-between text-[#3a3a3c] text-[9px] mt-0.5">
                      <span>25m</span><span>500m</span><span>1km</span>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              <div className="flex bg-[#2c2c2e] divide-x divide-[#3a3a3c]">
                <div className="flex-1 p-3 text-center flex flex-col items-center justify-center">
                  <span className="text-[#f59e0b] text-[13px] font-bold">{polygonPoints.length}</span>
                  <span className="text-[#8e8e93] text-[11px]">Points Added</span>
                </div>
                {polygonPoints.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setPolygonPoints(prev => prev.slice(0, -1))}
                    className="flex-1 p-3 flex flex-col items-center justify-center hover:bg-[#3a3a3c] transition-colors text-[#ef4444]"
                  >
                    <span className="text-[10px] font-bold tracking-widest uppercase">Undo Point</span>
                  </button>
                )}
                {polygonPoints.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setPolygonPoints([]);
                      setForm(prev => ({ ...prev, latitude: null, longitude: null }));
                      setLocationName("");
                    }}
                    className="flex-1 p-3 flex flex-col items-center justify-center hover:bg-[#3a3a3c] transition-colors text-[#8e8e93]"
                  >
                    <span className="text-[10px] font-bold tracking-widest uppercase">Clear All</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-[#2c2c2e] rounded-xl overflow-hidden relative border border-[#3a3a3c]">
            <div className="p-2 border-b border-[#3a3a3c] bg-[#1c1c1e]">
              <span className="text-[#8e8e93] text-[10px] font-bold tracking-widest uppercase ml-1">Incident Type</span>
            </div>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-[#2c2c2e] text-white text-[12px] p-3 outline-none border-none appearance-none cursor-pointer pr-10"
              >
                <option value="" disabled>Select an incident type</option>
                {["Flood", "Road Accident", "Fire", "Medical Emergency", "Crime", "Structural Collapse", "Other"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e8e93]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
            <div className="p-2 bg-[#1c1c1e] flex justify-between items-center">
              <span className="text-[#8e8e93] text-[10px] font-bold tracking-widest uppercase ml-1">Road Passability</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-[#3a3a3c]">
              {[
                { id: "Walking", icon: FaWalking },
                { id: "Motorcycle", icon: FaMotorcycle },
                { id: "Car", icon: FaCar },
                { id: "Truck", icon: FaTruck }
              ].map(({ id, icon: Icon }) => {
                const isAllowed = form.allowedVehicles.includes(id);
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
                    className={`py-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      isAllowed ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ef4444]/10 text-[#ef4444]'
                    }`}
                  >
                    <Icon className="text-[14px]" />
                    <span className="text-[8px] font-bold uppercase tracking-wider">{id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
            <div className="p-2 bg-[#1c1c1e]">
              <span className="text-[#8e8e93] text-[10px] font-bold tracking-widest uppercase ml-1">Severity Level</span>
            </div>
            <div className="flex divide-x divide-[#3a3a3c]">
              {severities.map(level => {
                const isSelected = form.severity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, severity: level }))}
                    className={`flex-1 py-2 text-[12px] transition-all duration-200 ${
                      isSelected ? 'bg-[#f59e0b] text-black font-bold' : 'hover:bg-[#3a3a3c] text-[#8e8e93]'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[#2c2c2e] rounded-xl overflow-hidden p-3 shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-[10px] uppercase tracking-wider font-bold text-[#8e8e93]">Incident_Evidence (MAX 3)</label>
              <span className="text-[#f59e0b] text-[10px] uppercase">{(form.medias || []).length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(form.medias || []).map((m, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-[#3a3a3c] bg-[#1c1c1e]">
                  <img src={m} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, medias: prev.medias?.filter((_, i) => i !== idx) }))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                  >
                    <FaTimes size={10} />
                  </button>
                </div>
              ))}
              {(form.medias || []).length < 3 && (
                <button
                  type="button"
                  onClick={() => document.getElementById('media-upload')?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-[#3a3a3c] hover:border-[#f59e0b] hover:bg-[#3a3a3c]/50 transition-all flex flex-col items-center justify-center gap-1 text-[#8e8e93] hover:text-white"
                >
                  <FaCamera size={18} />
                  <span className="text-[9px] font-bold uppercase">Add</span>
                </button>
              )}
            </div>
            <input
              id="media-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="bg-[#2c2c2e] rounded-xl overflow-hidden shadow-lg">
            <div className="p-3">
              <span className="text-white text-[13px] tracking-wide font-bold uppercase">Field_Notes</span>
            </div>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 bg-[#2c2c2e] text-white text-[12px] placeholder-[#8e8e93] resize-none outline-none"
              placeholder="Enter operational details..."
              rows={3}
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={loading || (drawMode === 'pinpoint' ? !form.latitude : polygonPoints.length < 3) || !form.type}
              className="w-full py-4 bg-[#f59e0b] text-black font-bold rounded-xl hover:bg-[#f59e0b]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-[#f59e0b]/10"
            >
              {loading ? (
                <FaSpinner className="animate-spin text-lg" />
              ) : (
                <>
                  <FaCheckCircle className="text-lg" />
                  <span className="tracking-[0.2em] uppercase text-[12px]">SUBMIT</span>
                </>
              )}
            </button>
          </div>

        </form>
        </>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @media (min-width: 768px) {
          .incident-reporting-container .mapboxgl-ctrl-top-right {
            right: 468px !important;
            top: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
