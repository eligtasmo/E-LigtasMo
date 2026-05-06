import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import AdminDispatchNavBar from '../../components/admin/AdminDispatchNavBar';
import type { TabKey } from '../../components/admin/AdminDispatchNavBar';
import { apiFetch } from '../../utils/api';
import { FiUsers, FiClock, FiCheckSquare, FiList, FiAlertTriangle, FiClipboard, FiCheck, FiRefreshCw, FiUploadCloud, FiImage, FiSend, FiX, FiChevronRight, FiPlus, FiCheckCircle } from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents, ZoomControl, Polygon } from 'react-leaflet';
import { SANTA_CRUZ_OUTLINE } from '../../constants/geo';
import { FaFacebookF } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import * as turf from '@turf/turf';

type Agency = 'police' | 'fire' | 'health' | 'coast-guard' | 'dpwh';

const defaultPPE = ['Gloves', 'Masks', 'Face Shield', 'Goggles', 'Boots'];
const defaultEquipment = ['Medical Kit', 'Oxygen Tank', 'Stretcher', 'Radio'];

type SopRunRecord = {
  run_id?: string | number;
  id?: string | number;
  team_assigned?: string;
  dispatched_at?: string;
  created_at?: string;
  notes?: string;
};

type HealthCoordinationData = {
  mhoName: string;
  mhoContact: string;
  nurseAssigner: string;
  hospital: string;
  departure: string;
  arrival: string;
  referralRecord: string;
};

const AdminDispatchResponse: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dispatch');
  const [incidentId, setIncidentId] = useState<string>('');
  const [incidentQuery, setIncidentQuery] = useState<string>('');
  const [teamAssigned, setTeamAssigned] = useState<string>('');
  const phNowInput = () => {
    const ph = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const y = ph.getFullYear();
    const m = String(ph.getMonth() + 1).padStart(2, '0');
    const d = String(ph.getDate()).padStart(2, '0');
    const hh = String(ph.getHours()).padStart(2, '0');
    const mm = String(ph.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };
  const [dispatchedAt, setDispatchedAt] = useState<string>(() => phNowInput());
  const [notes, setNotes] = useState<string>('');
  const [selectedPPE, setSelectedPPE] = useState<string[]>([]);
  const [agencyTags, setAgencyTags] = useState<Agency[]>([]);
  const [equipmentUsed, setEquipmentUsed] = useState<string[]>([]);
  const [detailsAttachments, setDetailsAttachments] = useState<Array<{ id: number; url: string; filename: string; mime: string; size: number }>>([]);
  const [detailsArrivalInput, setDetailsArrivalInput] = useState<string>('');

  const formatPHDateTime = (s: any) => {
    try { if (!s) return '—'; const d = new Date(s); if (Number.isNaN(d.getTime())) return String(s); return d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }); } catch { return String(s || '—'); }
  };
  const [hcMhoName, setHcMhoName] = useState<string>('');
  const [hcMhoContact, setHcMhoContact] = useState<string>('');
  const [hcNurseAssigner, setHcNurseAssigner] = useState<string>('');
  const [hcHospital, setHcHospital] = useState<string>('');
  const [hcDeparture, setHcDeparture] = useState<string>('');
  const [hcArrival, setHcArrival] = useState<string>('');
  const [hcReferralRecord, setHcReferralRecord] = useState<string>('');
  const [hcReferralFile, setHcReferralFile] = useState<File | null>(null);
  const [hcReferralPreview, setHcReferralPreview] = useState<string | null>(null);
  const [runId, setRunId] = useState<string>('');
  const [records, setRecords] = useState<SopRunRecord[]>([]);
  const [recordSearch, setRecordSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived' | null>(null);
  const [status, setStatus] = useState<'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived'>('Received');
  const [statusDesired, setStatusDesired] = useState<'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived'>("Received");
  const [rowStatusEdits, setRowStatusEdits] = useState<Record<string, 'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed'>>({});
  const [rowStatusUpdating, setRowStatusUpdating] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived'>('Received');
  const [responderRoster, setResponderRoster] = useState<Array<{ name: string; checkedIn?: string; checkedOut?: string }>>([
    { name: 'Responder A' },
    { name: 'Responder B' },
    { name: 'Responder C' },
  ]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<Array<{ name: string; status: 'available' | 'busy'; active_runs: number }>>([]);
  const [availableResponders, setAvailableResponders] = useState<Array<{ name: string; status: 'available' | 'unavailable'; last_seen?: string }>>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAck, setConfirmAck] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRunId, setShareRunId] = useState<string>('');
  const [incidentCode, setIncidentCode] = useState<string>('');
  const [incidentAutoFillBusy, setIncidentAutoFillBusy] = useState(false);
  const [incidentFoundSummary, setIncidentFoundSummary] = useState('');
  const [dispatchLocation, setDispatchLocation] = useState<[number, number] | null>(null);
  const [incidentsForMap, setIncidentsForMap] = useState<any[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [dangerZones, setDangerZones] = useState<any[]>([]);
  const [showDanger, setShowDanger] = useState(true);
  const [routeSegmentsById, setRouteSegmentsById] = useState<Record<string, Array<[number, number]>>>({});
  const [suggestedStart, setSuggestedStart] = useState<[number, number] | null>(null);
  const [suggestedEnd, setSuggestedEnd] = useState<[number, number] | null>(null);
  const [suggestedMode, setSuggestedMode] = useState<'driving-car' | 'driving-hgv' | 'foot-walking' | 'cycling-regular'>('driving-car');
  const [suggestedRoutes, setSuggestedRoutes] = useState<Array<{ coords: Array<[number, number]>; distance: number; duration: number; intersectsBlocked: boolean }>>([]);
  const [selectedSuggestedIndex, setSelectedSuggestedIndex] = useState(0);
  const [suggestedLoading, setSuggestedLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const dispatchMapRef = useRef<L.Map | null>(null);
  const hcReferralInputRef = useRef<HTMLInputElement | null>(null);
  const [searchParams] = useSearchParams();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<any | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<'Received'|'Dispatched'|'Responding'|'Arrived'|'Completed'|'Archived'>('Received');
  const [detailsStatusOriginal, setDetailsStatusOriginal] = useState<'Received'|'Dispatched'|'Responding'|'Arrived'|'Completed'|'Archived'>('Received');
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [detailsAgencies, setDetailsAgencies] = useState<string[]>([]);
  const [detailsPPE, setDetailsPPE] = useState<string[]>([]);
  const [detailsEquipment, setDetailsEquipment] = useState<string[]>([]);
  const [detailsNotes, setDetailsNotes] = useState<string>('');
  const [detailsDest, setDetailsDest] = useState<[number, number] | null>(null);

  const extractAvoidPolygonsFromGeojson = (input: any): any[] => {
    const out: any[] = [];
    const normRing = (ring: any) => {
      if (!Array.isArray(ring) || ring.length < 3) return null;
      const cleaned0 = ring
        .filter((c: any) => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
        .map((c: any) => [Number(c[0]), Number(c[1])]);
      if (cleaned0.length < 3) return null;
      const looksSwapped = (() => {
        const s = cleaned0.slice(0, 6);
        let swapped = 0;
        for (const [x, y] of s) {
          if (Math.abs(x) <= 90 && Math.abs(y) > 90) swapped++;
        }
        return swapped >= Math.max(2, Math.ceil(s.length / 2));
      })();
      const cleaned = looksSwapped ? cleaned0.map(([x, y]) => [y, x]) : cleaned0;
      const first = cleaned[0];
      const last = cleaned[cleaned.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) cleaned.push(first);
      if (cleaned.length < 4) return null;
      return cleaned;
    };

    const visitGeom = (g: any) => {
      if (!g || !g.type) return;
      if (g.type === 'Polygon') {
        const ring = normRing(g.coordinates?.[0]);
        if (ring) out.push([ring]);
        return;
      }
      if (g.type === 'MultiPolygon') {
        const polys = Array.isArray(g.coordinates) ? g.coordinates : [];
        polys.forEach((p: any) => {
          const ring = normRing(p?.[0]);
          if (ring) out.push([ring]);
        });
        return;
      }
      if (g.type === 'GeometryCollection') {
        const geoms = Array.isArray(g.geometries) ? g.geometries : [];
        geoms.forEach(visitGeom);
      }
    };

    if (!input) return out;
    if (input.type === 'Feature') visitGeom(input.geometry);
    else if (input.type === 'FeatureCollection' && Array.isArray(input.features)) input.features.forEach((f: any) => visitGeom(f?.geometry));
    else visitGeom(input);
    return out;
  };

  const buildModeAliases = (mode: string) => {
    switch (mode) {
      case 'driving-car': return ['driving-car', 'car', 'motor', 'motorcycle'];
      case 'cycling-regular': return ['cycling-regular', 'bike', 'bicycle'];
      case 'foot-walking': return ['foot-walking', 'foot', 'walk'];
      case 'driving-hgv': return ['driving-hgv', 'truck', 'bus', 'hgv'];
      default: return [mode];
    }
  };

  const isHazardBlockedForMode = (hazard: any, mode: string) => {
    const type = String(hazard?.type || '').toLowerCase();
    if (type.includes('flood')) return true;
    const allowed = hazard?.allowed_modes;
    if (!allowed) return true;
    const allowedArr = Array.isArray(allowed)
      ? allowed
      : typeof allowed === 'string'
        ? (() => { try { const p = JSON.parse(allowed); return Array.isArray(p) ? p : []; } catch { return allowed.split(',').map((s: string) => s.trim()).filter(Boolean); } })()
        : [];
    const aliases = buildModeAliases(mode);
    return !aliases.some(a => allowedArr.includes(a));
  };

  const computeSuggestedRoutes = async (start: [number, number], end: [number, number], mode: typeof suggestedMode) => {
    setSuggestedLoading(true);
    try {
      const pad = 0.02;
      const north = Math.max(start[0], end[0]) + pad;
      const south = Math.min(start[0], end[0]) - pad;
      const east = Math.max(start[1], end[1]) + pad;
      const west = Math.min(start[1], end[1]) - pad;
      const qs = new URLSearchParams({ north: String(north), south: String(south), east: String(east), west: String(west) });
      const overlaysRes = await apiFetch(`list-map-overlays.php?${qs.toString()}`);
      const overlays = await overlaysRes.json().catch(() => ({} as any));
      const hazardsArr = Array.isArray(overlays?.hazards) ? overlays.hazards : [];
      const floodsArr = Array.isArray(overlays?.reports) ? overlays.reports : [];

      const avoidPolys: any[] = [];
      for (const h of hazardsArr) {
        if (!h?.area_geojson) continue;
        if (!isHazardBlockedForMode(h, mode)) continue;
        avoidPolys.push(...extractAvoidPolygonsFromGeojson(h.area_geojson));
      }
      for (const f of floodsArr) {
        if (!f?.area_geojson) continue;
        avoidPolys.push(...extractAvoidPolygonsFromGeojson(f.area_geojson));
      }

      const body: any = {
        profile: mode,
        coordinates: [[start[1], start[0]], [end[1], end[0]]],
        instructions: true,
        alternative_routes: { target_count: 3, share_factor: 0.9, weight_factor: 1.5 },
        geometry_format: 'geojson',
        options: {
          avoid_features: ['ferries'],
          avoid_polygons: avoidPolys.length ? { type: 'MultiPolygon', coordinates: avoidPolys } : undefined
        }
      };
      const res = await apiFetch('ors-directions.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Routing failed');
      const data = await res.json().catch(() => ({} as any));
      const features = Array.isArray(data?.features) ? data.features : [];

      const polys = avoidPolys.map((p: any) => {
        try { return turf.polygon([p[0]]); } catch { return null; }
      }).filter(Boolean) as any[];

      const routes = features.map((f: any) => {
        const coords = f?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const latlngs: Array<[number, number]> = coords.map((c: any) => [Number(c[1]), Number(c[0])]);
        const summary = f?.properties?.summary || {};
        const distance = Number(summary?.distance || 0);
        const duration = Number(summary?.duration || 0);
        let intersectsBlocked = false;
        if (polys.length) {
          try {
            const line = turf.lineString(coords);
            intersectsBlocked = polys.some(p => turf.booleanIntersects(line, p));
          } catch {}
        }
        return { coords: latlngs, distance, duration, intersectsBlocked };
      }).filter(Boolean) as Array<{ coords: Array<[number, number]>; distance: number; duration: number; intersectsBlocked: boolean }>;

      const safe = routes.filter(r => !r.intersectsBlocked);
      const finalRoutes = (safe.length ? safe : routes).slice(0, 3);

      setSuggestedRoutes(finalRoutes);
      setSelectedSuggestedIndex(0);
    } catch {
      setSuggestedRoutes([]);
    } finally {
      setSuggestedLoading(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!suggestedStart || !suggestedEnd) return '';
    const url = new URL(`${window.location.origin}/share-route`);
    url.searchParams.set('start', `${suggestedStart[0]},${suggestedStart[1]}`);
    url.searchParams.set('end', `${suggestedEnd[0]},${suggestedEnd[1]}`);
    url.searchParams.set('mode', suggestedMode);
    return url.toString();
  }, [suggestedStart, suggestedEnd, suggestedMode]);

  const handleShareFacebook = () => {
    if (!shareUrl) return;
    const quote = `Suggested safe routes available. Open the map to view the best route and alternatives.`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
  };
  
  useEffect(() => {
    try {
      const hasLink = !!searchParams.get('incidentId') || !!searchParams.get('runId');
      if (hasLink) { /* Do not restore form state when opened from link */ return; }
      const raw = localStorage.getItem('dispatch_draft');
      if (raw) {
        const d = JSON.parse(raw);
        setIncidentQuery(d.incidentId ?? '');
        setTeamAssigned(d.teamAssigned ?? '');
        setDispatchedAt(d.dispatchedAt ?? phNowInput());
        setNotes(d.notes ?? '');
        setSelectedPPE(Array.isArray(d.selectedPPE) ? d.selectedPPE : []);
        setEquipmentUsed(Array.isArray(d.equipmentUsed) ? d.equipmentUsed : []);
        setAgencyTags(Array.isArray(d.agencyTags) ? d.agencyTags : []);
        setStatus(d.status ?? 'Received');
      }
      const rawResp = localStorage.getItem('response_draft');
      if (rawResp) {
        const r = JSON.parse(rawResp);
        setNotes(r.notes ?? '');
        setSelectedPPE(Array.isArray(r.selectedPPE) ? r.selectedPPE : []);
        setEquipmentUsed(Array.isArray(r.equipmentUsed) ? r.equipmentUsed : []);
      }
      const rosterRaw = localStorage.getItem('responder_roster');
      if (rosterRaw) {
        const rr = JSON.parse(rosterRaw);
        if (Array.isArray(rr)) setResponderRoster(rr);
      }
      const hcRaw = localStorage.getItem('hc_draft');
      if (hcRaw) {
        const hc = JSON.parse(hcRaw);
        setHcMhoName(hc?.hcMhoName ?? '');
        setHcMhoContact(hc?.hcMhoContact ?? '');
        setHcNurseAssigner(hc?.hcNurseAssigner ?? '');
        setHcHospital(hc?.hcHospital ?? '');
        setHcDeparture(hc?.hcDeparture ?? '');
        setHcArrival(hc?.hcArrival ?? '');
        setHcReferralRecord(hc?.hcReferralRecord ?? '');
      }
    } catch (_e) { void _e; }
  }, [refreshTick]);
  useEffect(() => { setStatusDesired(status); }, [status]);

  const normalizeIncidentId = (s: string) => s.trim().replace(/^#\s*/, '').replace(/^INC[-\s]?/i, '').trim();

  useEffect(() => {
    const incRaw = (incidentId || '').trim();
    if (!incRaw) { setIncidentFoundSummary(''); return; }
    const inc = incRaw.replace(/^#\s*/, '').replace(/^INC[-\s]?/i, '').trim();
    let cancelled = false;
    async function loadIncident() {
      try {
        setIncidentAutoFillBusy(true);
        // Try to find incident by ID first
        const res = await apiFetch(`list-incidents.php?limit=10000`);
        const data = await res.json().catch(() => ({} as any));
        const arr = Array.isArray((data as any)?.incidents) ? (data as any).incidents : (Array.isArray(data) ? data : []);
        let foundIncident: any = null;
        if (Array.isArray(arr) && arr.length) {
          foundIncident = arr.find((x: any) => {
            const xid = String(x?.id ?? x?.incident_id ?? x?.incident_code ?? x?.code ?? '').replace(/^#\s*/, '').replace(/^INC[-\s]?/i, '').trim();
            return xid === inc;
          }) || null;
          // Fallback: check public_id and photo_url digits
          if (!foundIncident) {
            const incDigits = inc.replace(/\D/g, '');
            foundIncident = arr.find((x: any) => {
              const pid = String(x?.public_id ?? '').replace(/^#\s*/, '').replace(/^INC[-\s]?/i, '').trim();
              const pidDigits = pid.replace(/\D/g, '');
              const urlDigits = String(x?.photo_url ?? '').replace(/\D/g, '');
              return (pid && (pid === inc || pidDigits === incDigits)) || (incDigits && urlDigits.includes(incDigits));
            }) || null;
          }
        }

        // Fallback: match SOP run by run_code, run id, or incident_id
        let linkedByRun: any = null;
        if (!foundIncident) {
          try {
            const rRes = await apiFetch(`list-sop-runs.php?limit=10000`);
            const rData = await rRes.json().catch(() => ({} as any));
            const runs = Array.isArray(rData) ? rData : (rData?.runs || rData?.sop_runs || rData?.records || []);
            if (Array.isArray(runs) && runs.length) {
              linkedByRun = runs.find((row: any) => {
                const rid = String(row?.id ?? '').trim();
                const rcode = String(row?.run_code ?? '').trim();
                const rinc = String(row?.incident_id ?? '').trim();
                return rid === inc || rcode === inc || rinc === inc;
              }) || null;
              if (linkedByRun) {
                const targetIncidentId = String(linkedByRun.incident_id ?? '').trim();
                if (targetIncidentId) {
                  // Set the canonical incident id to drive records and lock logic
                  setIncidentId(targetIncidentId);
                  // Attempt to get incident summary for notes
                  if (Array.isArray(arr) && arr.length) {
                    foundIncident = arr.find((x: any) => String(x?.id ?? '').trim() === targetIncidentId) || null;
                  }
                }
              }
            }
          } catch {}
        }

        if (!cancelled) {
          if (foundIncident) {
            const desc = String(foundIncident.description || '').trim();
            const type = String(foundIncident.type || '').trim();
            const loc = String(foundIncident.location || foundIncident.address || '').trim();
            const sev = String(foundIncident.severity || '').trim();
            const summary = [type, sev && `(Severity: ${sev})`, loc && `@ ${loc}`].filter(Boolean).join(' ');
            setNotes(prev => (desc ? desc : summary || prev));
            setIncidentFoundSummary(summary);
            const code = String(foundIncident?.id ?? '').trim();
            if (code) setIncidentCode(code);
            const canonicalId = String(foundIncident?.id ?? '').trim();
            if (canonicalId && canonicalId !== inc) {
              setIncidentId(canonicalId);
            }
          } else if (linkedByRun) {
            setIncidentFoundSummary(`Matched run; linked incident #${String(linkedByRun.incident_id ?? '').trim()}`);
          } else {
            setIncidentFoundSummary('');
          }
        }
      } finally {
        if (!cancelled) setIncidentAutoFillBusy(false);
      }
    }
    loadIncident();
    return () => { cancelled = true; };
  }, [incidentId]);

  useEffect(() => {
    (async () => {
      try {
        const response = await apiFetch('list-danger-zones.php');
        const data = await response.json().catch(() => ({} as any));
        const arr = Array.isArray(data) ? data : (data?.zones || data?.records || []);
        setDangerZones(arr);
      } catch {}
    })();
  }, [refreshTick]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('list-incidents.php?status=Approved&limit=1000');
        const data = await res.json().catch(() => ({} as any));
        const arr = Array.isArray((data as any)?.incidents) ? (data as any).incidents : (Array.isArray(data) ? data : []);
        const processed = arr.map((i: any) => ({
          ...i,
          start_lat: i.start_lat ? Number(i.start_lat) : Number(i.lat ?? null),
          start_lng: i.start_lng ? Number(i.start_lng) : Number(i.lng ?? null),
          end_lat: i.end_lat ? Number(i.end_lat) : Number(i.lat2 ?? null),
          end_lng: i.end_lng ? Number(i.end_lng) : Number(i.lng2 ?? null),
          lat: i.lat ? Number(i.lat) : null,
          lng: i.lng ? Number(i.lng) : null,
        }));
        setIncidentsForMap(processed);
      } catch {}
    })();
  }, []);

  function HazardHeatLayer({ points, radius, blur }: { points: Array<[number, number, number]>; radius?: number; blur?: number }) {
    const map = useMapEvents({});
    useEffect(() => {
      if (!map || !points || points.length === 0) return;
      const size = map.getSize();
      if (!size || size.x <= 0 || size.y <= 0) return;
      const safeRadius = Math.max(1, Number.isFinite(radius as number) ? (radius as number) : 28);
      const safeBlur = Math.max(1, Number.isFinite(blur as number) ? (blur as number) : 16);
      const validPoints = points.filter(p => Array.isArray(p) && p.length === 3 && typeof p[0] === 'number' && typeof p[1] === 'number' && typeof p[2] === 'number' && !isNaN(p[0]) && !isNaN(p[1]) && !isNaN(p[2]));
      if (validPoints.length === 0) return;
      const gradient = { 0.1: '#0f172a', 0.3: '#1f2937', 0.55: '#ef4444', 0.75: '#b91c1c', 0.9: '#7f1d1d' } as any;
      const layer = (L as any).heatLayer(validPoints, { radius: safeRadius, blur: safeBlur, maxZoom: 18, max: 1.0, gradient });
      layer.addTo(map);
      return () => { layer.remove(); };
    }, [map, points, radius, blur]);
    return null;
  }

  const MapClickSelect = ({ onPick }: { onPick: (latlng: [number, number]) => void }) => {
    useMapEvents({ click(e) { onPick([e.latlng.lat, e.latlng.lng]); } });
    return null;
  };

  const getRouteSegment = async (start: [number, number], end: [number, number]) => {
    const body = { coordinates: [[start[1], start[0]], [end[1], end[0]]] };
    // @ts-ignore
    if (!(window as any)._orsSegmentCache) { (window as any)._orsSegmentCache = new Map<string, Array<[number, number]>>(); }
    // @ts-ignore
    const cache: Map<string, Array<[number, number]>> = (window as any)._orsSegmentCache;
    const cacheKey = `${start[0]},${start[1]}|${end[0]},${end[1]}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    try {
      const response = await apiFetch('ors-directions.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) return [start, end];
      const data = await response.json();
      const coordinates = data?.features?.[0]?.geometry?.coordinates;
      if (!Array.isArray(coordinates)) return [start, end];
      const segment: Array<[number, number]> = coordinates.map((coord: any) => [coord[1], coord[0]]);
      cache.set(cacheKey, segment);
      return segment;
    } catch { return [start, end]; }
  };
  useEffect(() => {
    try {
      const ridParam = searchParams.get('runId');
      if (!ridParam) return;
      const ridNum = Number(ridParam);
      if (!Number.isFinite(ridNum)) return;
      (async () => {
        try {
          const res = await apiFetch(`get-sop-run.php?sop_run_id=${encodeURIComponent(String(ridNum))}`);
          const data = await res.json().catch(() => ({} as any));
          const row = (data?.sop_run || null);
          if (row) {
            setDetailsRecord(row);
            try { const rawA = JSON.parse((row as any).agencies_tagged || '[]'); setDetailsAgencies(Array.isArray(rawA) ? rawA : []); } catch { setDetailsAgencies([]); }
            try { const rawP = JSON.parse((row as any).ppe_checklist || '[]'); setDetailsPPE(Array.isArray(rawP) ? rawP : []); } catch { setDetailsPPE([]); }
            try { const rawE = JSON.parse((row as any).equipment_used || '[]'); setDetailsEquipment(Array.isArray(rawE) ? rawE : []); } catch { setDetailsEquipment([]); }
            setDetailsNotes((row as any).notes || '');
            const dlat = row.destination_lat; const dlng = row.destination_lng;
            if (Number.isFinite(Number(dlat)) && Number.isFinite(Number(dlng))) {
              const dest: [number, number] = [Number(dlat), Number(dlng)];
              setDetailsDest(dest);
              if (dispatchMapRef.current) {
                dispatchMapRef.current.setView(dest as any, 15);
              }
            }
            const ds = ((row as any).status_label || ((row as any).status === 'completed' ? 'Completed' : 'Received')) as any;
            setDetailsStatus(ds);
            setDetailsStatusOriginal(ds);
            try { const hc = JSON.parse((row as any).health_coordination || 'null'); const arr = (hc && hc.arrival_at) ? hc.arrival_at : ((row as any).hc_arrival || ''); setDetailsArrivalInput(arr || ''); } catch { setDetailsArrivalInput(((row as any).hc_arrival || '') as any); }
            try {
              const aRes = await apiFetch(`list-health-attachments.php?sop_run_id=${encodeURIComponent(String((row as any).id || (row as any).run_id))}`);
              const aData = await aRes.json().catch(() => ({} as any));
              setDetailsAttachments(Array.isArray(aData.attachments) ? aData.attachments : []);
            } catch { setDetailsAttachments([]); }
            setDetailsOpen(true);
          }
        } catch {}
      })();
    } catch {}
  }, [searchParams]);

  // Do not set incidentId from URL; keep the background form independent

  useEffect(() => {
    try {
      const incParam = searchParams.get('incidentId');
      if (!incParam) return;
      (async () => {
      try {
        const r = await apiFetch(`list-sop-runs.php?incident_id=${encodeURIComponent(String(incParam))}&page_size=1&page=1`);
        const d = await r.json().catch(() => ({} as any));
        const rows = Array.isArray(d) ? d : (d?.sop_runs || d?.runs || []);
        const first = Array.isArray(rows) && rows.length ? rows[0] : null;
        if (!first) { return; }
        try {
          const res = await apiFetch(`get-sop-run.php?sop_run_id=${encodeURIComponent(String((first as any).id || (first as any).run_id))}`);
          const data = await res.json().catch(() => ({} as any));
          const row = (data?.sop_run || first);
          setDetailsRecord(row);
          try { const rawA = JSON.parse((row as any).agencies_tagged || '[]'); setDetailsAgencies(Array.isArray(rawA) ? rawA : []); } catch { setDetailsAgencies([]); }
          try { const rawP = JSON.parse((row as any).ppe_checklist || '[]'); setDetailsPPE(Array.isArray(rawP) ? rawP : []); } catch { setDetailsPPE([]); }
          try { const rawE = JSON.parse((row as any).equipment_used || '[]'); setDetailsEquipment(Array.isArray(rawE) ? rawE : []); } catch { setDetailsEquipment([]); }
          setDetailsNotes((row as any).notes || '');
          const dlat = (row as any).destination_lat; const dlng = (row as any).destination_lng;
          if (Number.isFinite(Number(dlat)) && Number.isFinite(Number(dlng))) {
            const dest: [number, number] = [Number(dlat), Number(dlng)];
            setDetailsDest(dest);
            if (dispatchMapRef.current) { dispatchMapRef.current.setView(dest as any, 15); }
          }
          const ds2 = ((row as any).status_label || ((row as any).status === 'completed' ? 'Completed' : ((row as any).status === 'archived' ? 'Archived' : 'Received'))) as any;
          setDetailsStatus(ds2);
          setDetailsStatusOriginal(ds2);
          setIncidentCode(String((first as any).incident_id || (first as any).incident_code || incParam));
          setShareRunId(String((first as any).run_id || (first as any).id || ''));
          try { const hc = JSON.parse((row as any).health_coordination || 'null'); const arr = (hc && hc.arrival_at) ? hc.arrival_at : ((row as any).hc_arrival || ''); setDetailsArrivalInput(arr || ''); } catch { setDetailsArrivalInput(((row as any).hc_arrival || '') as any); }
          try {
            const aRes = await apiFetch(`list-health-attachments.php?sop_run_id=${encodeURIComponent(String((row as any).id || (row as any).run_id))}`);
            const aData = await aRes.json().catch(() => ({} as any));
            setDetailsAttachments(Array.isArray(aData.attachments) ? aData.attachments : []);
          } catch { setDetailsAttachments([]); }
          setDetailsOpen(true);
        } catch {}
      } catch {}
    })();
  } catch {}
  }, [searchParams]);
  useEffect(() => {
    const payload = { incidentId, teamAssigned, dispatchedAt, notes, selectedPPE, equipmentUsed, agencyTags, status };
    try { localStorage.setItem('dispatch_draft', JSON.stringify(payload)); } catch (_e) { void _e; }
  }, [incidentId, teamAssigned, dispatchedAt, notes, selectedPPE, equipmentUsed, agencyTags, status]);

  useEffect(() => {
    const payload = { notes, selectedPPE, equipmentUsed };
    try { localStorage.setItem('response_draft', JSON.stringify(payload)); } catch (_e) { void _e; }
  }, [notes, selectedPPE, equipmentUsed]);

  useEffect(() => {
    const hc = { hcMhoName, hcMhoContact, hcNurseAssigner, hcHospital, hcDeparture, hcArrival, hcReferralRecord };
    try { localStorage.setItem('hc_draft', JSON.stringify(hc)); } catch (_e) { void _e; }
  }, [hcMhoName, hcMhoContact, hcNurseAssigner, hcHospital, hcDeparture, hcArrival, hcReferralRecord]);

  useEffect(() => {
    if (hcReferralFile) {
      const url = URL.createObjectURL(hcReferralFile);
      setHcReferralPreview(url);
      return () => { URL.revokeObjectURL(url); };
    }
    setHcReferralPreview(null);
  }, [hcReferralFile]);

  const counts = useMemo(() => ({ runs: records.length }), [records]);
  const hasExistingRunForIncident = useMemo(() => {
    const inc = (incidentId || '').trim();
    if (!inc) return false;
    return records.some(r => {
      const rid = String((r as any).incident_id ?? (r as any).incident_code ?? '').trim();
      return rid !== '' && rid === inc;
    });
  }, [records, incidentId]);
  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => (
      `${String((r as any).team_assigned||'')}${String((r as any).notes||'')}${String((r as any).status||'')}`
        .toLowerCase()
        .includes(q)
    ));
  }, [records, recordSearch]);

  const locked = (!!runId || hasExistingRunForIncident);
  const statusOrder = ['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const;
  const currentIdx = statusOrder.indexOf(status);
  const doneColorClass = status === 'Completed' ? 'bg-green-600' : status === 'Responding' ? 'bg-amber-500' : status === 'Arrived' ? 'bg-indigo-600' : status === 'Dispatched' ? 'bg-blue-600' : 'bg-blue-600';
  const statusPillClass = status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' : status === 'Responding' ? 'bg-amber-100 text-amber-700 border-amber-200' : status === 'Arrived' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : status === 'Dispatched' ? 'bg-blue-100 text-blue-700 border-blue-200' : status === 'Archived' ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-gray-100 text-gray-700 border-gray-200';
  const pillClassFor = (s: 'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived') => (
    s === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
    s === 'Responding' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    s === 'Arrived' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
    s === 'Dispatched' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    s === 'Archived' ? 'bg-gray-200 text-gray-700 border-gray-300' :
    'bg-gray-100 text-gray-700 border-gray-200'
  );

  const statusToServer = (s: 'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived') => (
    s === 'Completed' ? 'completed' :
    s === 'Archived' ? 'archived' :
    'in_progress'
  );

  const toggleArrayValue = (arr: string[], value: string, setter: (next: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]);
  };

  const toggleAgency = (value: Agency) => {
    setAgencyTags(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  };



  const setRunStatus = async (next: typeof status) => {
    setStatusUpdating(next);
    setStatus(next);
    try {
      if (runId) {
        await apiFetch('update-sop-run.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sop_run_id: Number(runId), status: statusToServer(next), status_label: next })
        });
      }
      if (next === 'Completed') {
        toast.success('Run marked as Completed');
      } else {
        toast.success(`Status updated to ${next}`);
      }
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const updateRecordStatus = async (rid: string | number, next: 'Received' | 'Dispatched' | 'Responding' | 'Arrived' | 'Completed' | 'Archived', rowKey: string) => {
    setRowStatusUpdating(rowKey);
    try {
      await apiFetch('update-sop-run.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sop_run_id: Number(rid), status: statusToServer(next as any), status_label: next })
      });
      toast.success(`Status updated to ${next}`);
      fetchRecords();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setRowStatusUpdating(null);
    }
  };

  const bulkUpdateRecordStatus = async () => {
    const ids = Object.entries(selectedRows).filter(([, v]) => v).map(([k]) => Number(k));
    if (ids.length === 0) return;
    try {
      const res = await apiFetch('bulk-update-sop-runs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_ids: ids, status: statusToServer(bulkStatus), status_label: bulkStatus })
      });
      const data = await res.json().catch(() => ({ success: res.ok }));
      if (data && data.success) {
        toast.success(`Updated ${ids.length} record(s)`);
        setSelectedRows({});
        fetchRecords();
      } else {
        toast.error('Bulk update failed');
      }
    } catch {
      toast.error('Server error');
    }
  };

  const dispatchTeam = async () => {
    setSubmitAttempted(true);
    if (!teamAssigned.trim()) {
      toast.error('Team is required.');
      return;
    }
    if (!dispatchLocation) {
      toast.error('Set a dispatch destination on the map.');
      return;
    }
    if (runId || hasExistingRunForIncident) {
      toast.error('A dispatch run already exists for this incident.');
      return;
    }
    const hasHC = !!(hcMhoName || hcMhoContact || hcNurseAssigner || hcHospital || hcDeparture || hcArrival || hcReferralRecord);
    const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date());
    const obj: any = {}; nowParts.forEach(p => { obj[p.type] = p.value; });
    const dispatchedAtNow = `${obj.year}-${obj.month}-${obj.day} ${obj.hour}:${obj.minute}:${obj.second}`;
    const payload = {
      incident_id: Number(incidentId || '0'),
      sop_id: 'emergency-calls',
      team_assigned: teamAssigned,
      dispatched_at: dispatchedAtNow,
      notes,
      ppe_required: selectedPPE,
      equipment_planned: equipmentUsed,
      agencies_tagged: agencyTags,
      ...(hasHC ? { health_coordination: {
        mho_name: hcMhoName || null,
        mho_contact: hcMhoContact || null,
        nurse_assigner: hcNurseAssigner || null,
        hospital: hcHospital || null,
        departure_at: dispatchedAtNow,
        arrival_at: null,
        referral_record: null,
      } } : {}),
      status: 'Dispatched',
      destination_lat: dispatchLocation ? dispatchLocation[0] : null,
      destination_lng: dispatchLocation ? dispatchLocation[1] : null
    };
    try {
      const createRes = await apiFetch('create-sop-run.php', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => '');
        toast.error('Dispatch failed');
        console.error('create-sop-run error:', createRes.status, errText);
        return;
      }
      const createData = await createRes.json();
      const newRunId = createData?.sop_run_id || createData?.id || '';
      setRunId(newRunId);
      if (createData?.incident_id) { setIncidentId(String(createData.incident_id)); setPage(1); }

      // Log activity
      const logRes = await apiFetch('log-activity.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'dispatch_team', details: payload, sop_run_id: Number(newRunId) }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!logRes.ok) {
        const errText2 = await logRes.text().catch(() => '');
        console.warn('log-activity error:', logRes.status, errText2);
      }
      toast.success(`Team dispatched${incidentCode ? ` • Incident ID ${incidentCode}` : ''}`);

      // Upload referral record image if provided
      try {
        if (hcReferralFile && newRunId) {
          const fd = new FormData();
          fd.append('sop_run_id', String(newRunId));
          fd.append('attachments[]', hcReferralFile);
          const upRes = await apiFetch('upload-health-attachments.php', { method: 'POST', body: fd as any });
          await upRes.json().catch(() => ({}));
        }
      } catch {}
      fetchRecords();
      setRunStatus('Dispatched');
      try {
        setShareRunId(String(newRunId));
        setShareOpen(true);
      } catch {}
      try {
        const incIdNum = Number(createData?.incident_id || incidentId);
        if (incIdNum) {
          const r = await apiFetch(`list-sop-runs.php?incident_id=${encodeURIComponent(String(incIdNum))}&page_size=1&page=1`);
          const d = await r.json().catch(() => ({} as any));
          const rows = Array.isArray(d) ? d : (d?.sop_runs || d?.runs || []);
          const first = Array.isArray(rows) && rows.length ? rows[0] : null;
          const code = String(first?.incident_code ?? '').trim();
          if (code) setIncidentCode(code);
        }
      } catch {}
    } catch (e) {
      console.error(e);
      toast.error('Dispatch attempted. Backend may be unavailable.');
    }
  };

  const logResponderAction = async (user: string, action: 'login' | 'logout') => {
    try {
      await apiFetch('log-activity.php', {
        method: 'POST',
        body: JSON.stringify({ action: `responder_${action}`, sop_run_id: Number(runId), user }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`Responder ${action} logged.`);
    } catch (e) {
      console.error(e);
    }
  };

  const saveResponseTracking = async () => {
    const payload = {
      sop_run_id: Number(runId),
      ppe_checklist: selectedPPE,
      equipment_used: equipmentUsed,
      notes,
    };
    try {
      const updRes1 = await apiFetch('update-sop-run.php', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      await updRes1.json().catch(() => ({}));
      await apiFetch('log-activity.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_response_tracking', sop_run_id: Number(runId), details: payload }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Response tracking saved.');
    } catch (e) {
      console.error(e);
      toast.error('Save attempted. Backend may be unavailable.');
    }
  };

  

  const saveHealthCoordination = async (data: HealthCoordinationData) => {
    try {
      const updRes2 = await apiFetch('update-sop-run.php', {
        method: 'POST',
        body: JSON.stringify({ sop_run_id: Number(runId), health_coordination: data }),
        headers: { 'Content-Type': 'application/json' },
      });
      await updRes2.json().catch(() => ({}));
      await apiFetch('log-activity.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_health_coordination', sop_run_id: Number(runId), details: data }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Health coordination saved.');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (incidentId.trim()) params.set('incident_id', incidentId.trim());
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const url = `list-sop-runs.php${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('list-sop-runs error:', res.status, errText);
        toast.error('Cannot load dispatch records');
        setRecords([]);
        return;
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.runs || data?.sop_runs || data?.records || [];
      setRecords(rows);
      if (data?.paging) { setTotal(Number(data.paging.total || 0)); setPage(Number(data.paging.page || 1)); setPageSize(Number(data.paging.page_size || 20)); }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [incidentId, page, pageSize]);

  return (
    <div className="w-full font-jetbrains">
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ top: 80, right: 24 }}
        toastOptions={{
          duration: 2500,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 6px 16px rgba(2, 6, 23, 0.08)',
            minWidth: '320px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center'
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } }
        }}
      />
      <AdminDispatchNavBar active={activeTab} onChange={setActiveTab} counts={counts} />

      {activeTab === 'dispatch' && (
        <div className="w-full p-4 lg:p-8 animate-in fade-in duration-500">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
              <div className="w-1.5 h-8 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
              Dispatch_Control_Center
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Unit_Coordination • Sector_Deployment • Tactical_Relay</p>
          </div>
          <div className="grid grid-cols-12 gap-8">
            {/* Summary cards removed for cleaner aligned layout */}

            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="bg-white tactical-container p-6 shadow-xl shadow-slate-900/5 relative overflow-hidden group">
                {locked && (
                  <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <FiAlertTriangle className="text-amber-600 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-black text-amber-900 uppercase tracking-widest">System_Lock_Active</div>
                      <p className="text-[9px] font-bold text-amber-700/80 uppercase tracking-tight mt-1 leading-relaxed">Mission_Active. Telemetry_Only.</p>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">Response_Unit</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <FiUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                        <input disabled={locked} className={`w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50/50 text-[11px] font-black uppercase tracking-widest border transition-all ${submitAttempted && !teamAssigned.trim() ? 'border-red-500 bg-red-50/10' : 'border-gray-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5'} disabled:bg-gray-100 disabled:text-gray-400`} placeholder="ALPHA_UNIT" value={teamAssigned} onChange={e => setTeamAssigned(e.target.value)} />
                      </div>
                      <button type="button" disabled={locked} className="h-12 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-all shadow-lg" onClick={async () => {
                        setIsPickerOpen(true);
                        try {
                          const [tRes, rRes] = await Promise.all([ apiFetch('list-teams.php'), apiFetch('list-responder-availability.php') ]);
                          const tData = await tRes.json(); const rData = await rRes.json();
                          let teams = Array.isArray(tData.teams) ? tData.teams : [];
                          let responders = Array.isArray(rData.responders) ? rData.responders : [];
                          setAvailableTeams(teams); setAvailableResponders(responders);
                        } catch (e) { console.error(e); }
                      }}>Roster</button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">Inventory_Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[...defaultPPE, ...defaultEquipment].map(item => (
                        <button key={item} type="button" disabled={locked} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${ (defaultPPE.includes(item) ? selectedPPE : equipmentUsed).includes(item) ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-gray-100 hover:bg-gray-50' } disabled:opacity-60`} onClick={() => defaultPPE.includes(item) ? toggleArrayValue(selectedPPE, item, setSelectedPPE) : toggleArrayValue(equipmentUsed, item, setEquipmentUsed)}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 block">Mission_Intelligence</label>
                    <textarea className="w-full h-24 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setConfirmOpen(true)}
                      disabled={!teamAssigned.trim() || !!runId || hasExistingRunForIncident}
                      className={`w-full h-14 rounded-xl font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl ${ (!teamAssigned.trim() || !!runId || hasExistingRunForIncident) ? 'bg-gray-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30 hover:scale-[1.02]' }`}
                    >
                      <FiSend className="text-xl" />
                      {(!!runId || hasExistingRunForIncident) ? 'LOCKED' : 'Initiate_Deployment'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white tactical-container p-5 shadow-xl shadow-slate-900/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Deployment_Status</div>
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusPillClass}`}>{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select className="flex-1 h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" value={statusDesired} onChange={e => setStatusDesired(e.target.value as any)}>
                    {(statusOrder).map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <button onClick={() => setRunStatus(statusDesired)} disabled={statusUpdating !== null} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-all">Update</button>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  {statusOrder.map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= currentIdx ? doneColorClass : 'bg-gray-100'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white tactical-container p-2 shadow-xl shadow-slate-900/5 relative flex flex-col h-[750px] animate-pop">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/30 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Geospatial_Intelligence</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-900 uppercase tracking-widest transition-colors">Heat_Map</span>
                      </label>
                    </div>
                    <div className="w-px h-4 bg-gray-200" />
                    <div className="flex items-center gap-2 text-blue-600">
                      <FiRefreshCw className="text-xs animate-spin-slow" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Live_Relay</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 relative rounded-b-xl overflow-hidden group/map">
                  <MapContainer
                    center={[14.5995, 120.9842]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                    zoomControl={false}
                    preferCanvas={true}
                    attributionControl={false}
                    ref={dispatchMapRef as any}
                  >
                    <ZoomControl position="bottomright" />
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                    <Polygon positions={SANTA_CRUZ_OUTLINE.geometry.coordinates[0].map((c: any) => [c[1], c[0]])} pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5', fillOpacity: 0 }} />
                    {incidentsForMap.map((i: any, idx) => {
                      const hasSegment = Number.isFinite(Number(i.start_lat)) && Number.isFinite(Number(i.start_lng)) && Number.isFinite(Number(i.end_lat)) && Number.isFinite(Number(i.end_lng));
                      if (!hasSegment) return null;
                      const key = String(i.id ?? i.incident_code ?? idx);
                      const positions: [number, number][] = (routeSegmentsById[key] && routeSegmentsById[key].length > 1) ? routeSegmentsById[key] : [[Number(i.start_lat), Number(i.start_lng)], [Number(i.end_lat), Number(i.end_lng)]];
                      return (
                        <Polyline key={`inc-${i.id}-${idx}`} positions={positions} pathOptions={{ color: '#f97316', weight: 5, opacity: 0.9 }} eventHandlers={{
                          click: async () => {
                            const start: [number, number] = [Number(i.start_lat), Number(i.start_lng)];
                            const end: [number, number] = [Number(i.end_lat), Number(i.end_lng)];
                            const seg = await getRouteSegment(start, end);
                            setRouteSegmentsById(prev => ({ ...prev, [key]: seg }));
                            const pick = seg[Math.floor(seg.length / 2)] || [Number(i.start_lat), Number(i.start_lng)];
                            setDispatchLocation(pick);
                            setIncidentQuery(String(i.incident_code ?? i.id ?? ''));
                            setSuggestedStart(start); setSuggestedEnd(end);
                            computeSuggestedRoutes(start, end, suggestedMode);
                          }
                        }}>
                          <Popup className="font-jetbrains">
                            <div className="p-2 min-w-[150px]">
                              <div className="text-[11px] font-black text-slate-900 uppercase mb-1">{String(i.type || 'Incident')}</div>
                              <div className="text-[9px] font-bold text-slate-500 uppercase leading-relaxed">{String(i.address || i.location || 'Sector_Coordinates')}</div>
                            </div>
                          </Popup>
                        </Polyline>
                      );
                    })}
                    {suggestedRoutes.map((r, i) => (
                      <Polyline key={`suggested-${i}`} positions={r.coords} pathOptions={{ color: i === selectedSuggestedIndex ? '#2563eb' : '#94a3b8', weight: i === selectedSuggestedIndex ? 8 : 4, opacity: i === selectedSuggestedIndex ? 1 : 0.4 }} eventHandlers={{ click: () => { setSelectedSuggestedIndex(i); if (r.coords && r.coords.length) { const mid = r.coords[Math.floor(r.coords.length / 2)]; if (mid) setDispatchLocation(mid); } } }} />
                    ))}
                    {dispatchLocation && ( <Marker position={dispatchLocation} icon={getMarkerIcon('#dc2626')} /> )}
                    <MapClickSelect onPick={(ll) => setDispatchLocation(ll)} />
                  </MapContainer>

                  {/* Sidebar on Map */}
                  <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-3">
                    <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-gray-100 shadow-2xl min-w-[220px]">
                      <div className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                        <span>Route_Logic</span>
                        <FiRefreshCw className={`text-blue-600 ${suggestedLoading ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="space-y-4">
                        <select className="w-full h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-black uppercase tracking-widest focus:outline-none" value={suggestedMode} onChange={(e) => { const next = e.target.value as any; setSuggestedMode(next); if (suggestedStart && suggestedEnd) computeSuggestedRoutes(suggestedStart, suggestedEnd, next); }}>
                          <option value="driving-car">Car</option>
                          <option value="driving-hgv">Truck</option>
                          <option value="cycling-regular">Bike</option>
                          <option value="foot-walking">Walk</option>
                        </select>
                        <div className="space-y-2">
                          {suggestedRoutes.map((r, i) => (
                            <button key={i} onClick={() => setSelectedSuggestedIndex(i)} className={`w-full p-3 rounded-xl border text-left transition-all ${ i === selectedSuggestedIndex ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-gray-50/50 border-gray-100 text-slate-600 hover:bg-white' }`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest">Vector_{i + 1}</span>
                                {r.intersectsBlocked && ( <div className="px-1.5 py-0.5 rounded bg-red-500 text-[7px] font-black text-white uppercase">Blocked</div> )}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-black tabular-nums">{(r.distance / 1000).toFixed(1)}KM</span>
                                <span className="ml-auto text-xs font-black tabular-nums">{Math.round(r.duration / 60)}MIN</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${dispatchLocation ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector_Target: {dispatchLocation ? 'LOCKED' : 'AWAITING_INPUT'}</span>
                    </div>
                  </div>
                  <button className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ !dispatchLocation ? 'bg-gray-100 text-slate-300 cursor-not-allowed border border-gray-100' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' }`} onClick={async () => {
                    if (!dispatchLocation) return;
                    setNotes(prev => `${prev ? prev + '\n' : ''}Dispatch to ${dispatchLocation[0].toFixed(5)}, ${dispatchLocation[1].toFixed(5)}`);
                    try {
                      if (runId) {
                        const payload = { sop_run_id: Number(runId), destination_lat: dispatchLocation[0], destination_lng: dispatchLocation[1] };
                        await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        toast.success('Target synchronized.');
                      } else { toast.success('Target noted.'); }
                    } catch (e) { toast.error('Sync failed'); }
                  }}>Lock_Target</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'response' && (
          <div className="w-full animate-in fade-in duration-500">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-8 bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                Response_Oversight
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Asset_Tracking • Personnel_Log • Equipment_Registry</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* PPE Checklist */}
              <div className="bg-white tactical-container p-6 shadow-xl shadow-slate-900/5 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <FiCheckSquare className="text-emerald-600" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">SOP_PPE_Registry</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {defaultPPE.map(item => (
                    <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 bg-gray-50/30 cursor-pointer hover:bg-white hover:border-emerald-200 transition-all group">
                      <input type="checkbox" checked={selectedPPE.includes(item)} onChange={() => toggleArrayValue(selectedPPE, item, setSelectedPPE)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20" />
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Equipment Tracker */}
              <div className="bg-white tactical-container p-6 shadow-xl shadow-slate-900/5 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiList className="text-blue-600" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mission_Asset_Log</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {defaultEquipment.map(item => (
                    <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 bg-gray-50/30 cursor-pointer hover:bg-white hover:border-blue-200 transition-all group">
                      <input type="checkbox" checked={equipmentUsed.includes(item)} onChange={() => toggleArrayValue(equipmentUsed, item, setEquipmentUsed)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Responder Roster */}
              <div className="bg-white tactical-container p-6 shadow-xl shadow-slate-900/5 transition-all hover:translate-y-[-2px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <FiUsers className="text-slate-900" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Personnel_Deployment</span>
                </div>
                <div className="space-y-4">
                  {responderRoster.map((r, idx) => (
                    <div key={`${r.name}-${idx}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 bg-gray-50/30">
                      <input className="flex-1 bg-transparent text-[11px] font-black text-slate-900 uppercase tracking-widest focus:outline-none" placeholder="IDENTIFY_RESPONDER" value={r.name} onChange={e => setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} />
                      <div className="flex gap-2">
                        <button className="p-2 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-105 transition-transform" onClick={() => { const t = new Date().toISOString(); setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, checkedIn: t } : it)); logResponderAction(r.name, 'login'); }}><FiCheck size={12} /></button>
                        <button className="p-2 rounded-lg bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform" onClick={() => { const t = new Date().toISOString(); setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, checkedOut: t } : it)); logResponderAction(r.name, 'logout'); }}><FiClock size={12} /></button>
                      </div>
                    </div>
                  ))}
                  <button className="w-full h-11 rounded-xl border-2 border-dashed border-gray-200 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all" onClick={() => setResponderRoster(prev => [...prev, { name: '' }])}>
                    Register_Unit
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={saveResponseTracking} 
                disabled={!runId || (selectedPPE.length === 0 && equipmentUsed.length === 0 && !notes.trim())} 
                className={`h-14 px-10 rounded-xl font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl ${ !runId || (selectedPPE.length === 0 && equipmentUsed.length === 0 && !notes.trim()) ? 'bg-gray-100 text-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30 hover:scale-[1.02]' }`}
              >
                Sync_Mission_Logs
              </button>
            </div>
          </div>
        )}

      {isPickerOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsPickerOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white tactical-container shadow-2xl overflow-hidden animate-pop">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Roster_Selector</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-1">Available_Personnel • Sector_Units</p>
              </div>
              <button className="p-2 hover:bg-white rounded-lg transition-colors" onClick={() => setIsPickerOpen(false)}><FiX className="text-slate-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-blue-600" /> Tactical_Teams
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableTeams.length === 0 && <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-gray-50 rounded-xl">No_Teams_Active</div>}
                  {availableTeams.map((t, idx) => (
                    <button key={idx} className="w-full flex items-center gap-4 p-4 text-left bg-gray-50/50 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all group" onClick={() => { setTeamAssigned(t.name); setIsPickerOpen(false); }}>
                      <div className={`w-2 h-2 rounded-full ${t.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500'}`} />
                      <div className="flex-1">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{t.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t.status}</div>
                      </div>
                      <FiChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-emerald-600" /> Active_Responders
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {availableResponders.length === 0 && <div className="p-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-gray-50 rounded-xl">No_Personnel_Active</div>}
                  {availableResponders.map((r, idx) => (
                    <button key={idx} className="w-full flex items-center gap-4 p-4 text-left bg-gray-50/50 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-xl transition-all group" onClick={() => { if (!responderRoster.some(x => x.name === r.name)) setResponderRoster(prev => [...prev, { name: r.name }]); }}>
                      <div className={`w-2 h-2 rounded-full ${r.status === 'available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <div className="flex-1">
                        <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{r.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{r.status}</div>
                      </div>
                      <FiPlus className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50/30 border-t border-gray-50 flex justify-end">
              <button className="h-11 px-8 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg" onClick={() => setIsPickerOpen(false)}>Complete_Selection</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-lg bg-white tactical-container shadow-2xl overflow-hidden animate-pop">
            <div className="p-8 border-b border-gray-50 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <FiSend size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Authorize_Deployment?</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-2 leading-relaxed">System_Locked_Post_Deployment. Verify_Mission_Parameters.</p>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</span>
                <span className="text-[11px] font-black text-slate-900 uppercase">{teamAssigned || '—'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 border border-gray-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector_Target</span>
                <span className="text-[11px] font-black text-blue-600">{dispatchLocation ? `${dispatchLocation[0].toFixed(4)}, ${dispatchLocation[1].toFixed(4)}` : 'NULL'}</span>
              </div>
              {(!dispatchLocation) && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                  <FiAlertTriangle className="text-red-600" />
                  <span className="text-[9px] font-black text-red-900 uppercase tracking-widest">Target_Coordinates_Required</span>
                </div>
              )}
            </div>
            <div className="p-8 pt-0 flex gap-3">
              <button className="flex-1 h-14 rounded-xl border-2 border-gray-100 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-gray-50 transition-all" onClick={() => setConfirmOpen(false)}>Abort</button>
              <button className={`flex-[2] h-14 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${(!dispatchLocation || confirmLoading) ? 'bg-gray-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`} disabled={!dispatchLocation || confirmLoading} onClick={async () => { if (confirmLoading || !dispatchLocation) return; setConfirmLoading(true); await dispatchTeam(); setConfirmLoading(false); setConfirmOpen(false); }}>
                {confirmLoading ? 'Relaying...' : 'Initiate_Deployment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShareOpen(false)} />
          <div className="relative w-full max-w-lg bg-white tactical-container shadow-2xl overflow-hidden animate-pop">
            <div className="p-8 border-b border-gray-50 text-center bg-emerald-50/30">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <FiCheckCircle size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Mission_Synchronized</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-2">Unit_Acknowledged • Live_Feed_Active</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sector_Access_Token</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 flex items-center text-[10px] font-black text-slate-600 truncate">{`${window.location.origin}/admin/dispatch-response?incidentId=${encodeURIComponent(incidentId || '')}`}</div>
                  <button className="h-12 px-6 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg" onClick={async () => {
                    const url = `${window.location.origin}/admin/dispatch-response?incidentId=${encodeURIComponent(incidentId || '')}`;
                    try { await navigator.clipboard.writeText(url); toast.success('Token copied.'); } catch { toast.error('Copy failed.'); }
                  }}>Copy</button>
                </div>
              </div>
            </div>
            <div className="p-8 pt-0">
              <button className="w-full h-14 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl" onClick={() => setShareOpen(false)}>Return_To_Command</button>
            </div>
          </div>
        </div>
      )}

      {/* Health tab removed; health coordination merged into Dispatch */}

        {activeTab === 'records' && (
          <div className="w-full animate-in fade-in duration-500">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-8 bg-slate-900 shadow-[0_0_15px_rgba(15,23,42,0.4)]" />
                Mission_Registry
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Deployment_Archive • Response_History • Sector_Logs</p>
            </div>

            <div className="bg-white tactical-container p-6 shadow-xl shadow-slate-900/5">
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Incident_ID</span>
                  <input className="w-32 h-10 rounded-lg border border-gray-100 bg-white px-3 text-[11px] font-black uppercase tracking-widest focus:outline-none" value={incidentId} onChange={e => setIncidentId(e.target.value)} />
                </div>
                <input className="flex-1 min-w-[200px] h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-[11px] font-black uppercase tracking-widest focus:bg-white transition-all" placeholder="Filter_By_Unit_Or_Intel..." value={recordSearch} onChange={e => setRecordSearch(e.target.value)} />
                <div className="ml-auto flex items-center gap-3">
                  <select className="h-10 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-black uppercase tracking-widest" value={bulkStatus} onChange={e => setBulkStatus(e.target.value as any)}>
                    {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                  </select>
                  <button className="h-10 px-6 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40" disabled={Object.values(selectedRows).filter(Boolean).length === 0} onClick={bulkUpdateRecordStatus}>Apply</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 pt-2 px-4 text-left">
                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" onChange={e => {
                          const checked = e.target.checked;
                          const next: Record<string, boolean> = {};
                          filteredRecords.forEach((r, idx) => { const id = String((r as any).run_id || (r as any).id || idx); next[id] = checked; });
                          setSelectedRows(next);
                        }} />
                      </th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">ID</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Sector</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Unit</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Deployment</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Status</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Medical_Relay</th>
                      <th className="pb-4 pt-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.length === 0 && (
                      <tr>
                        <td className="p-12 text-center" colSpan={8}>
                          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No_Active_Deployment_Records</p>
                        </td>
                      </tr>
                    )}
                    {filteredRecords.map((r, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" checked={!!selectedRows[String((r as any).run_id || (r as any).id || idx)]} onChange={e => {
                            const key = String((r as any).run_id || (r as any).id || idx);
                            setSelectedRows(prev => ({ ...prev, [key]: e.target.checked }));
                          }} />
                        </td>
                        <td className="py-4 px-4 text-[11px] font-black text-slate-900 tabular-nums">#{r.run_id || r.id || '-'}</td>
                        <td className="py-4 px-4 text-[11px] font-black text-blue-600 uppercase tracking-tighter">INC_{(r as any).incident_code || (r as any).incident_id || '-'}</td>
                        <td className="py-4 px-4 text-[11px] font-black text-slate-900 uppercase tracking-widest">{r.team_assigned || '-'}</td>
                        <td className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-tight">{formatPHDateTime(r.dispatched_at || (r as any).started_at || r.created_at)}</td>
                        <td className="py-4 px-4">
                          {(() => { const key = String((r as any).run_id || (r as any).id || idx); const current = (r as any).status_label || ((r as any).status === 'completed' ? 'Completed' : ( (r as any).status === 'archived' ? 'Archived' : 'Received')); const display = (rowStatusEdits[key] ?? current) as any; const isEditing = editingRowId === key; return (
                            <div className="flex items-center gap-3">
                              {!isEditing && (
                                <button className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${pillClassFor(display)} hover:scale-105`} onClick={() => setEditingRowId(key)}>
                                  {display}
                                </button>
                              )}
                              {isEditing && (
                                <select className="h-8 rounded-lg border border-gray-100 bg-white text-[9px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/10" autoFocus value={display} onBlur={() => setEditingRowId(null)} onChange={e => {
                                  const next = e.target.value as any;
                                  setRowStatusEdits(prev => ({ ...prev, [key]: next }));
                                  updateRecordStatus((r as any).run_id || (r as any).id, next, key);
                                  setEditingRowId(null);
                                }}>
                                  {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                                </select>
                              )}
                              {rowStatusUpdating === key && (<FiRefreshCw className="text-blue-500 text-xs animate-spin" />)}
                            </div>
                          ); })()}
                        </td>
                        <td className="py-4 px-4">
                          {(() => { let name = ''; try { const hc = JSON.parse((r as any).health_coordination || 'null'); if (hc) { name = hc.nurse_assigner || hc.mho_name || ''; } } catch {} return <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{name || '—'}</span>; })()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button className="h-8 px-4 rounded-lg bg-gray-50 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all" onClick={async () => {
                            const runKey = String((r as any).run_id || (r as any).id || idx);
                            setDetailsRecord(r);
                            { const ds = ((r as any).status_label || ((r as any).status === 'completed' ? 'Completed' : ((r as any).status === 'archived' ? 'Archived' : 'Received'))) as any; setDetailsStatus(ds); setDetailsStatusOriginal(ds); }
                            let a: string[] = []; let p: string[] = []; let eArr: string[] = [];
                            try { const rawA = JSON.parse((r as any).agencies_tagged || '[]'); a = Array.isArray(rawA) ? rawA : []; } catch {}
                            try { const rawP = JSON.parse((r as any).ppe_checklist || '[]'); p = Array.isArray(rawP) ? rawP : []; } catch {}
                            try { const rawE = JSON.parse((r as any).equipment_used || '[]'); eArr = Array.isArray(rawE) ? rawE : []; } catch {}
                            setDetailsAgencies(a); setDetailsPPE(p); setDetailsEquipment(eArr); setDetailsNotes(r.notes || '');
                            const dlat = (r as any).destination_lat; const dlng = (r as any).destination_lng;
                            if (dlat && dlng) { setDetailsDest([Number(dlat), Number(dlng)]); } else { setDetailsDest(null); }
                            try {
                              let arrival = '';
                              try { const hc = JSON.parse((r as any).health_coordination || 'null'); if (hc && hc.arrival_at) arrival = hc.arrival_at; } catch {}
                              arrival = arrival || (r as any).hc_arrival || '';
                              setDetailsArrivalInput(arrival || '');
                            } catch {}
                            setDetailsOpen(true);
                            try {
                              const runIdToLoad = Number((r as any).run_id || (r as any).id);
                              if (Number.isFinite(runIdToLoad)) {
                                const aRes = await apiFetch(`list-health-attachments.php?sop_run_id=${encodeURIComponent(String(runIdToLoad))}`);
                                const aData = await aRes.json().catch(() => ({} as any));
                                setDetailsAttachments(Array.isArray(aData.attachments) ? aData.attachments : []);
                              } else { setDetailsAttachments([]); }
                            } catch { setDetailsAttachments([]); }
                          }}>Intel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex items-center justify-between bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} Total</div>
                <div className="flex items-center gap-3">
                  <button className="h-9 px-4 rounded-lg bg-white border border-gray-100 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                  <button className="h-9 px-4 rounded-lg bg-white border border-gray-100 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-gray-50 disabled:opacity-30" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
                  <select className="h-9 rounded-lg border border-gray-100 bg-white text-[10px] font-black text-slate-600 uppercase tracking-widest focus:ring-0" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                    {[10,20,50,100].map(s => <option key={s} value={s}>{s}/Page</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      {detailsOpen && detailsRecord && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDetailsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white tactical-container shadow-2xl overflow-hidden animate-pop max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 shrink-0">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                Mission_Intelligence_Report <span className="text-blue-600">#{(detailsRecord as any).run_id || (detailsRecord as any).id}</span>
              </h3>
              <button className="p-2 hover:bg-white rounded-lg transition-colors" onClick={() => setDetailsOpen(false)}><FiX className="text-slate-400" /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector_ID</div>
                  <div className="text-[11px] font-black text-blue-600 uppercase">INC_{(detailsRecord as any).incident_id || '—'}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned_Unit</div>
                  <div className="text-[11px] font-black text-slate-900 uppercase">{(detailsRecord as any).team_assigned || '—'}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Deployment_Time</div>
                  <div className="text-[11px] font-black text-slate-900 uppercase">{formatPHDateTime((detailsRecord as any).dispatched_at || (detailsRecord as any).created_at)}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-50">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">Mission_Status</div>
                  <div className="flex items-center gap-2">
                    <select className={`text-[10px] font-black uppercase tracking-widest border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/10 ${pillClassFor(detailsStatus)}`} value={detailsStatus} onChange={e => setDetailsStatus(e.target.value as any)}>
                      {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-3 bg-blue-600" /> Tactical_Equipment
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detailsPPE.map(item => ( <span key={item} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest border border-emerald-100">{item}</span> ))}
                      {detailsEquipment.map(item => ( <span key={item} className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest border border-blue-100">{item}</span> ))}
                      {detailsPPE.length === 0 && detailsEquipment.length === 0 && <span className="text-[9px] font-bold text-slate-300 uppercase italic">No_Registry_Entries</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-3 bg-slate-900" /> Mission_Telemetry
                    </h4>
                    <div className="p-5 rounded-xl bg-gray-50 border border-gray-100 min-h-[120px] text-[11px] font-bold text-slate-600 uppercase leading-relaxed">
                      {detailsNotes || 'No_Tactical_Notes_Recorded'}
                    </div>
                    {detailsStatus === 'Completed' && (
                      <div className="mt-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                        <label className="text-[9px] font-black text-blue-800 uppercase tracking-widest block mb-2">Final_Arrival_Timestamp</label>
                        <input type="datetime-local" className="w-full h-10 rounded-lg border border-blue-100 bg-white px-3 text-[11px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={detailsArrivalInput} onChange={e => setDetailsArrivalInput(e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-600" /> Medical_Relay
                    </h4>
                    {(() => { 
                      let hc: any = null; try { hc = JSON.parse((detailsRecord as any).health_coordination || 'null'); } catch {}
                      return (
                        <div className="p-5 rounded-xl border border-emerald-50 bg-emerald-50/10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest opacity-60">Nurse_Assigner</span>
                            <span className="text-[11px] font-black text-emerald-900 uppercase">{hc?.nurse_assigner || '—'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest opacity-60">Facility_Target</span>
                            <span className="text-[11px] font-black text-emerald-900 uppercase">{hc?.hospital || 'FIELD_OPS'}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {detailsAttachments && detailsAttachments.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-blue-600" /> Digital_Evidence
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {detailsAttachments.map(att => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener" className="aspect-square rounded-xl overflow-hidden border border-gray-100 hover:ring-4 hover:ring-blue-500/10 transition-all shadow-sm">
                            <img src={att.url} alt={att.filename} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50/30 border-t border-gray-50 flex justify-between shrink-0">
              <a className="h-14 px-8 rounded-xl border-2 border-gray-100 flex items-center justify-center text-[10px] font-black text-slate-900 uppercase tracking-widest hover:bg-white transition-all shadow-sm" href={`/admin/incident-report/${encodeURIComponent((detailsRecord as any).run_id || (detailsRecord as any).id)}`} target="_self">Generate_Operational_Report</a>
              <div className="flex gap-3">
                <button className="h-14 px-8 rounded-xl border-2 border-gray-100 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white transition-all shadow-sm" onClick={() => setDetailsOpen(false)}>Close</button>
                <button className={`h-14 px-10 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${(detailsStatus === detailsStatusOriginal && (detailsStatus !== 'Completed' || !detailsArrivalInput)) ? 'bg-gray-100 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30'}`} onClick={() => {
                  if (detailsStatus !== detailsStatusOriginal) { setStatusConfirmOpen(true); return; }
                  (async () => {
                    const rid = Number((detailsRecord as any).run_id || (detailsRecord as any).id);
                    const statusPayload = statusToServer(detailsStatus);
                    const payload: any = { sop_run_id: rid, status: statusPayload, status_label: detailsStatus };
                    if (detailsArrivalInput && detailsStatus === 'Completed') { payload.health_coordination = { arrival_at: detailsArrivalInput }; }
                    try {
                      const res = await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      const data = await res.json().catch(() => ({} as any));
                      if (data && data.success) { toast.success('Telemetry updated.'); setDetailsOpen(false); fetchRecords(); } else { toast.error('Comms failure.'); }
                    } catch { toast.error('Relay error.'); }
                  })();
                }}>Save_Updates</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statusConfirmOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setStatusConfirmOpen(false)} />
          <div className="relative w-full max-w-md bg-white tactical-container shadow-2xl overflow-hidden animate-pop">
            <div className="p-8 border-b border-gray-50 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiRefreshCw size={32} className="animate-spin-slow" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Update_Sector_Status?</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-2 leading-relaxed">Transition_Status From <span className="text-slate-900">{detailsStatusOriginal}</span> to <span className="text-blue-600">{detailsStatus}</span>.</p>
            </div>
            <div className="p-8 pt-0 flex gap-3 mt-4">
              <button className="flex-1 h-14 rounded-xl border-2 border-gray-100 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:bg-gray-50 transition-all" onClick={() => setStatusConfirmOpen(false)}>Cancel</button>
              <button className="flex-[2] h-14 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl" onClick={async () => {
                const rid = Number((detailsRecord as any).run_id || (detailsRecord as any).id);
                const statusPayload = statusToServer(detailsStatus);
                const payload: any = { sop_run_id: rid, status: statusPayload, status_label: detailsStatus };
                try {
                  const res = await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  const data = await res.json().catch(() => ({} as any));
                  if (data && data.success) { toast.success('Status synchronized.'); setStatusConfirmOpen(false); setDetailsOpen(false); fetchRecords(); } else { toast.error('Comms failure.'); }
                } catch { toast.error('Relay error.'); }
              }}>Confirm_Transition</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDispatchResponse;

const HealthCoordinationForm: React.FC<{ runId: string; incidentId: string; setRunId: (id: string) => void; onSave: (data: HealthCoordinationData) => void }> = ({ runId, incidentId, setRunId, onSave }) => {
  const [mhoName, setMhoName] = useState('');
  const [mhoContact, setMhoContact] = useState('');
  const [nurseAssigner, setNurseAssigner] = useState('');
  const [hospital, setHospital] = useState('');
  const [departure, setDeparture] = useState<string>('');
  const [arrival, setArrival] = useState<string>('');
  const [referralRecord, setReferralRecord] = useState('');
  const [attachments, setAttachments] = useState<Array<{ id: number; url: string; filename: string; mime: string; size: number }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('health_coordination_draft');
      if (raw) {
        const d = JSON.parse(raw);
        setMhoName(d.mhoName ?? '');
        setMhoContact(d.mhoContact ?? '');
        setNurseAssigner(d.nurseAssigner ?? '');
        setHospital(d.hospital ?? '');
        setDeparture(d.departure ?? '');
        setArrival(d.arrival ?? '');
        setReferralRecord(d.referralRecord ?? '');
      }
    } catch (_e) { void _e; }
  }, []);

  useEffect(() => {
    const loadAttachments = async () => {
      if (!runId) return;
      try {
        const res = await apiFetch(`list-health-attachments.php?sop_run_id=${encodeURIComponent(runId)}`);
        const data = await res.json().catch(() => ({ attachments: [] }));
        const rows = Array.isArray(data) ? data : (data.attachments || []);
        setAttachments(rows);
      } catch (_e) { /* ignore */ }
    };
    loadAttachments();
  }, [runId]);

  useEffect(() => {
    const payload = { mhoName, mhoContact, nurseAssigner, hospital, departure, arrival, referralRecord };
    try { localStorage.setItem('health_coordination_draft', JSON.stringify(payload)); } catch (_e) { void _e; }
  }, [mhoName, mhoContact, nurseAssigner, hospital, departure, arrival, referralRecord]);

  const handleSave = () => {
    onSave({ mhoName, mhoContact, nurseAssigner, hospital, departure, arrival, referralRecord });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow animate-pop">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="text-xs text-gray-600">Run: <span className="font-semibold text-gray-900">{runId || '—'}</span></div>
        <button
          className="px-2.5 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
          onClick={async () => {
            try {
              const res = await apiFetch('create-sop-run.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incident_id: Number((incidentId || '').replace(/\D/g, '')) || undefined, sop_id: 'health-transfer' })
              });
              const data = await res.json();
              if (data && data.success && data.sop_run_id) {
                setRunId(String(data.sop_run_id));
                toast.success(`Run created: ${data.sop_run_id}`);
              } else {
                toast.error(data?.message || 'Failed to create run');
              }
            } catch (e) {
              toast.error('Server error creating run');
            }
          }}
        >New Run</button>
        <div className="flex items-center gap-1">
          <input
            value={linkInput}
            onChange={e => setLinkInput(e.target.value)}
            placeholder="Run ID"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            style={{ width: 110 }}
          />
          <button
            className="px-2 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
            onClick={async () => {
              const idNum = Number(linkInput.replace(/\D/g, ''));
              if (!idNum) { toast.error('Enter a valid Run ID'); return; }
              try {
                const res = await apiFetch(`get-sop-run.php?sop_run_id=${idNum}`);
                const data = await res.json();
                if (data && data.success && data.sop_run) {
                  setRunId(String(idNum));
                  toast.success('Run linked');
                } else {
                  toast.error('Run not found');
                }
              } catch (e) {
                toast.error('Lookup failed');
              }
            }}
          >Link</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">MHO/MESU Contacted (Name)</label>
          <input className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={mhoName} onChange={e => setMhoName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">MHO/MESU Contact Number</label>
          <input className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={mhoContact} onChange={e => setMhoContact(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">MHO Nurse Assigner</label>
          <input className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={nurseAssigner} onChange={e => setNurseAssigner(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Patient Transfer Hospital</label>
          <input className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={hospital} onChange={e => setHospital(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time of Departure</label>
          <input type="datetime-local" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={departure} onChange={e => setDeparture(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time of Arrival</label>
          <input type="datetime-local" className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={arrival} onChange={e => setArrival(e.target.value)} />
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1">Attached Images (replaces referral record)</label>
          <div className="flex flex-col gap-2">
            <div
              className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 ${uploading ? 'opacity-70 cursor-wait' : 'cursor-pointer'} bg-gray-50 hover:bg-gray-100`}
              onClick={() => {
                if (!runId) {
                  toast.error('Select or create a run first');
                  return;
                }
                fileInputRef.current?.click();
              }}
            >
              <FiUploadCloud className="text-blue-600" />
              <span className="text-sm text-gray-700">Drag & drop or click to upload</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (!files || !files.length) return;
                if (!runId) { toast.error('Select or create a run first'); e.currentTarget.value = ''; return; }
                const fd = new FormData();
                fd.append('sop_run_id', String(runId));
                Array.from(files).forEach((f) => fd.append('attachments[]', f));
                setUploading(true);
                try {
                  const res = await apiFetch('upload-health-attachments.php', { method: 'POST', body: fd });
                  const data = await res.json().catch(() => ({ attachments: [] }));
                  const rows = Array.isArray(data) ? data : (data.attachments || []);
                  setAttachments(rows);
                  toast.success('Images uploaded');
                } catch (_e) {
                  toast.error('Upload failed');
                } finally {
                  setUploading(false);
                  e.currentTarget.value = '';
                }
              }}
            />
            {!runId && (<span className="text-xs text-gray-500">Select or create a run first</span>)}
            {uploading && (<span className="text-xs text-blue-600">Uploading…</span>)}
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {attachments.map((att) => (
              <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="group block rounded-lg border border-gray-200 overflow-hidden">
                <img src={att.url} alt={att.filename} className="w-full h-24 object-cover group-hover:opacity-90" />
                <div className="p-1 text-[11px] text-gray-600 truncate">{att.filename}</div>
              </a>
            ))}
            {attachments.length === 0 && (
              <div className="text-xs text-gray-500">No images yet</div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <button onClick={handleSave} disabled={!hospital.trim() || !arrival} className={`rounded-md px-4 py-2 ${!hospital.trim() || !arrival ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Save Coordination</button>
      </div>
    </div>
  );
};

// moved helpers and effects inside component earlier
  const getMarkerIcon = (color: string): L.Icon => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#333" stroke-width="1.5"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>`;
    const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    return new L.Icon({ iconUrl: dataUrl, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
  };
