import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import AdminDispatchNavBar from '../../components/admin/AdminDispatchNavBar';
import type { TabKey } from '../../components/admin/AdminDispatchNavBar';
import { apiFetch } from '../../utils/api';
import { FiUsers, FiClock, FiCheckSquare, FiList, FiAlertTriangle, FiClipboard, FiCheck, FiRefreshCw, FiUploadCloud, FiImage } from 'react-icons/fi';
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
    <div className="w-full px-4 lg:px-6">
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
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4">DISPATCH AND RESPONSE</h2>
          <div className="grid grid-cols-12 gap-6">
            {/* Summary cards removed for cleaner aligned layout */}

            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white border border-gray-200 rounded-xl p-5 relative h-[640px] flex flex-col">
                {locked && (
                  <div className="absolute -top-3 left-5 right-5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    Dispatch run exists. Form is locked. You may update notes and status only.
                  </div>
                )}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Team Assigned</label>
                      <div className="flex items-center gap-2">
                        <input disabled={locked} className={`flex-1 rounded-md bg-white px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${submitAttempted && !teamAssigned.trim() ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'} disabled:bg-gray-100 disabled:text-gray-500`} placeholder="Alpha Team / Rescue Team A" value={teamAssigned} onChange={e => setTeamAssigned(e.target.value)} />
                        <button type="button" disabled={locked} className="px-3 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 disabled:opacity-60" onClick={async () => {
                          setIsPickerOpen(true);
                          try {
                            const [tRes, rRes] = await Promise.all([
                              apiFetch('list-teams.php'),
                              apiFetch('list-responder-availability.php')
                            ]);
                            const tData = await tRes.json();
                            const rData = await rRes.json();
                            let teams = Array.isArray(tData.teams) ? tData.teams : [];
                            let responders = Array.isArray(rData.responders) ? rData.responders : [];
                            if (teams.length === 0 && responders.length === 0) {
                              await apiFetch('seed-teams-responders.php');
                              const [t2, r2] = await Promise.all([
                                apiFetch('list-teams.php'),
                                apiFetch('list-responder-availability.php')
                              ]);
                              const td = await t2.json(); const rd = await r2.json();
                              teams = Array.isArray(td.teams) ? td.teams : [];
                              responders = Array.isArray(rd.responders) ? rd.responders : [];
                            }
                            setAvailableTeams(teams);
                            setAvailableResponders(responders);
                          } catch (e) { console.error(e); }
                        }}>Choose</button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">PPE Required</label>
                      <div className="flex flex-wrap gap-2">
                        {defaultPPE.map(item => (
                          <button key={item} type="button" disabled={locked} aria-pressed={selectedPPE.includes(item)} className={`px-2.5 py-1.5 rounded-md text-xs border ${selectedPPE.includes(item) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'} disabled:opacity-60`} onClick={() => toggleArrayValue(selectedPPE, item, setSelectedPPE)}>
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Equipment Planned</label>
                      <div className="flex flex-wrap gap-2">
                        {defaultEquipment.map(item => (
                          <button key={item} type="button" disabled={locked} aria-pressed={equipmentUsed.includes(item)} className={`px-2.5 py-1.5 rounded-md text-xs border ${equipmentUsed.includes(item) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'} disabled:opacity-60`} onClick={() => toggleArrayValue(equipmentUsed, item, setEquipmentUsed)}>
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Inform Other Agencies (OPTIONAL)</label>
                      <div className="flex flex-wrap gap-2">
                        {(['police','fire','health','coast-guard','dpwh'] as Agency[]).map(ag => (
                          <button key={ag} type="button" disabled={locked} aria-pressed={agencyTags.includes(ag)} className={`px-2.5 py-1.5 rounded-md text-xs border ${agencyTags.includes(ag) ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-700 border-gray-300'} disabled:opacity-60`} onClick={() => toggleAgency(ag)}>
                            {ag.replace('-', ' ').toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea className="w-full h-28 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="text-sm font-medium mb-1">Health Coordination (optional)</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">MHO/MESU Contacted (Name)</label>
                        <input disabled={locked} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={hcMhoName} onChange={e => setHcMhoName(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">MHO/MESU Contact Number</label>
                        <input disabled={locked} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={hcMhoContact} onChange={e => setHcMhoContact(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">MHO Nurse Assigner</label>
                        <input disabled={locked} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={hcNurseAssigner} onChange={e => setHcNurseAssigner(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Patient Transfer Hospital</label>
                        <input disabled={locked} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={hcHospital} onChange={e => setHcHospital(e.target.value)} />
                      </div>
                      
                      <div className="md:col-span-2 flex flex-col">
                        <label className="block text-sm font-medium mb-1">Referral Record</label>
                        <input ref={hcReferralInputRef} disabled={locked} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files && e.target.files[0] ? e.target.files[0] : null; setHcReferralFile(f); }} />
                        <div className="h-28 rounded-md border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center relative cursor-pointer" onClick={() => { if (hcReferralInputRef.current && !locked) hcReferralInputRef.current.click(); }}>
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <FiImage className="text-gray-500" />
                            <span>{hcReferralFile ? hcReferralFile.name : 'No file chosen'}</span>
                            <span className="text-gray-400">{hcReferralFile ? (hcReferralFile.type || (hcReferralFile.name.includes('.') ? hcReferralFile.name.split('.').pop() as string : '')) : 'image/*'}</span>
                          </div>
                          <button type="button" disabled={locked} className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 disabled:opacity-60" onClick={(e) => { e.stopPropagation(); if (hcReferralInputRef.current) hcReferralInputRef.current.click(); }}>Choose File</button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto flex justify-end items-end">
                      <button
                        onClick={() => setConfirmOpen(true)}
                        disabled={!teamAssigned.trim() || !!runId || hasExistingRunForIncident}
                        className={`w-40 rounded-md py-2 font-semibold ${(!teamAssigned.trim() || !!runId || hasExistingRunForIncident) ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      >
                        { (!!runId || hasExistingRunForIncident) ? 'Run Exists' : 'Dispatch Team' }
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              </div>

            <div className="col-span-12 lg:col-span-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-0 overflow-hidden h-[640px] flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b">
                    <div className="text-sm font-medium">Dispatch Map</div>
                  </div>
                  <div className="flex-1">
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
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                      />
                      <Polygon 
                        positions={SANTA_CRUZ_OUTLINE.geometry.coordinates[0].map((c: any) => [c[1], c[0]])}
                        pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 5', fillOpacity: 0 }}
                      />
                      {/* Heatmap and danger layers removed */}
                      {incidentsForMap.map((i: any, idx) => {
                        const hasSegment = Number.isFinite(Number(i.start_lat)) && Number.isFinite(Number(i.start_lng)) && Number.isFinite(Number(i.end_lat)) && Number.isFinite(Number(i.end_lng));
                        if (!hasSegment) return null;
                        const key = String(i.id ?? i.incident_code ?? idx);
                        const positions: [number, number][] = (routeSegmentsById[key] && routeSegmentsById[key].length > 1) ? routeSegmentsById[key] : [[Number(i.start_lat), Number(i.start_lng)], [Number(i.end_lat), Number(i.end_lng)]];
                        const mid: [number, number] = positions[Math.floor(positions.length / 2)];
                        return (
                          <Polyline key={`inc-${i.id}-${idx}`} positions={positions} pathOptions={{ color: '#f97316', weight: 5, opacity: 0.9 }} eventHandlers={{
                            click: async () => {
                              const start: [number, number] = [Number(i.start_lat), Number(i.start_lng)];
                              const end: [number, number] = [Number(i.end_lat), Number(i.end_lng)];
                              const seg = await getRouteSegment(start, end);
                              setRouteSegmentsById(prev => ({ ...prev, [key]: seg }));
                              const pick = seg[Math.floor(seg.length / 2)] || mid;
                              setDispatchLocation(pick);
                              setIncidentQuery(String(i.incident_code ?? i.id ?? ''));
                              setSuggestedStart(start);
                              setSuggestedEnd(end);
                              computeSuggestedRoutes(start, end, suggestedMode);
                            }
                          }}>
                            <Popup>
                              <div className="text-xs">
                                <div className="font-semibold">{String(i.type || 'Incident')}</div>
                                <div>{String(i.severity || '—')}</div>
                                <div>{String(i.address || i.location || '—')}</div>
                              </div>
                            </Popup>
                          </Polyline>
                        );
                      })}
                      {suggestedRoutes.map((r, i) => (
                        <Polyline
                          key={`suggested-${i}`}
                          positions={r.coords}
                          pathOptions={{
                            color: i === selectedSuggestedIndex ? '#2563eb' : '#94a3b8',
                            weight: i === selectedSuggestedIndex ? 7 : 5,
                            opacity: i === selectedSuggestedIndex ? 0.95 : 0.65
                          }}
                          eventHandlers={{
                            click: () => {
                              setSelectedSuggestedIndex(i);
                              if (r.coords && r.coords.length) {
                                const mid = r.coords[Math.floor(r.coords.length / 2)];
                                if (mid) setDispatchLocation(mid);
                              }
                            }
                          }}
                        />
                      ))}
                      {dispatchLocation && (
                        <Marker position={dispatchLocation} icon={getMarkerIcon('#ef4444')}>
                          <Popup>Selected Location</Popup>
                        </Marker>
                      )}
                      <MapClickSelect onPick={(ll) => setDispatchLocation(ll)} />
                    </MapContainer>
                  </div>
                  <div className="p-3 border-t text-xs text-gray-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        {dispatchLocation ? `${dispatchLocation[0].toFixed(5)}, ${dispatchLocation[1].toFixed(5)}` : 'Click map or an incident path to set location'}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 rounded-md border border-gray-300 text-xs" onClick={async () => {
                          if (!dispatchLocation) return;
                          setNotes(prev => `${prev ? prev + '\n' : ''}Dispatch to ${dispatchLocation[0].toFixed(5)}, ${dispatchLocation[1].toFixed(5)}`);
                          try {
                            if (runId) {
                              const payload = { sop_run_id: Number(runId), destination_lat: dispatchLocation[0], destination_lng: dispatchLocation[1] };
                              const res = await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                              await res.json().catch(() => ({}));
                              toast.success('Destination saved to run.');
                            } else {
                              toast.success('Destination noted. It will be saved on dispatch.');
                            }
                          } catch (e) { console.error(e); toast.error('Failed to save destination'); }
                        }}>Set Destination</button>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                          value={suggestedMode}
                          onChange={(e) => {
                            const next = e.target.value as any;
                            setSuggestedMode(next);
                            if (suggestedStart && suggestedEnd) computeSuggestedRoutes(suggestedStart, suggestedEnd, next);
                          }}
                        >
                          <option value="driving-car">Car</option>
                          <option value="driving-hgv">Truck</option>
                          <option value="cycling-regular">Bike</option>
                          <option value="foot-walking">Walk</option>
                        </select>
                        {suggestedLoading ? (
                          <span className="text-xs text-gray-500">Routing…</span>
                        ) : null}
                      </div>
                      {suggestedRoutes.length ? (
                        <button
                          className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs flex items-center gap-1 hover:bg-blue-700"
                          onClick={handleShareFacebook}
                        >
                          <FaFacebookF />
                          Share
                        </button>
                      ) : null}
                    </div>
                    {suggestedRoutes.length ? (
                      <div className="mt-2 flex gap-2 overflow-x-auto">
                        {suggestedRoutes.map((r, i) => (
                          <button
                            key={`sbtn-${i}`}
                            className={`px-2 py-1 rounded-md border text-[11px] whitespace-nowrap ${
                              i === selectedSuggestedIndex ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-300 bg-white text-gray-700'
                            }`}
                            onClick={() => setSelectedSuggestedIndex(i)}
                          >
                            Route {i + 1}
                            {r.distance ? ` • ${(r.distance / 1000).toFixed(1)} km` : ''}
                            {r.duration ? ` • ${Math.round(r.duration / 60)} min` : ''}
                            {r.intersectsBlocked ? ' • blocked' : ''}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Status</div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusPillClass}`}>{status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select className="text-xs border border-gray-300 rounded px-2 py-1" value={statusDesired} onChange={e => setStatusDesired(e.target.value as any)}>
                      {(statusOrder).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setRunStatus(statusDesired)}
                      disabled={statusUpdating !== null}
                      className={`px-3 py-1 rounded text-xs ${statusUpdating !== null ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      Update
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2">
                      {statusOrder.map((s, i) => (
                        <div key={s} className={`flex-1 h-2 rounded-full ${i <= currentIdx ? doneColorClass : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                      {statusOrder.map(s => (<span key={s}>{s}</span>))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => setRunStatus('Completed')}
                      className={`w-full px-3 py-2 rounded-md text-sm ${status === 'Completed' ? 'bg-green-600 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                      {status === 'Completed' ? 'Completed' : 'Mark Completed'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'response' && (
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4">RESPONSE TRACKING AND SAFETY</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PPE Checklist */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow animate-pop">
              <div className="flex items-center gap-2 mb-3">
                <FiCheckSquare />
                <span className="font-medium">PPE Checklist</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {defaultPPE.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedPPE.includes(item)} onChange={() => toggleArrayValue(selectedPPE, item, setSelectedPPE)} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            {/* Equipment Tracker */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow animate-pop">
              <div className="flex items-center gap-2 mb-3">
                <FiList />
                <span className="font-medium">Equipment / Supply Tracker</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {defaultEquipment.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={equipmentUsed.includes(item)} onChange={() => toggleArrayValue(equipmentUsed, item, setEquipmentUsed)} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            {/* Responder Roster */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <FiUsers />
                <span className="font-medium">Responder Roster</span>
              </div>
              <div className="space-y-2">
                {responderRoster.map((r, idx) => (
                  <div key={`${r.name}-${idx}`} className="flex items-center gap-2">
                    <input className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs" value={r.name} onChange={e => setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} />
                    <button className="px-2 py-1 text-xs rounded bg-green-600 text-white" onClick={() => { const t = new Date().toISOString(); setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, checkedIn: t } : it)); logResponderAction(r.name, 'login'); }}>Check-in</button>
                    <button className="px-2 py-1 text-xs rounded bg-gray-600 text-white" onClick={() => { const t = new Date().toISOString(); setResponderRoster(prev => prev.map((it, i) => i === idx ? { ...it, checkedOut: t } : it)); logResponderAction(r.name, 'logout'); }}>Check-out</button>
                  </div>
                ))}
                <div className="pt-2">
                  <button className="px-2 py-1 text-xs rounded border border-gray-300" onClick={() => setResponderRoster(prev => [...prev, { name: '' }])}>Add Responder</button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveResponseTracking} disabled={!runId || (selectedPPE.length === 0 && equipmentUsed.length === 0 && !notes.trim())} className={`rounded-md px-4 py-2 ${!runId || (selectedPPE.length === 0 && equipmentUsed.length === 0 && !notes.trim()) ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Save Tracking</button>
          </div>
        </div>
      )}

      {isPickerOpen && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsPickerOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-3xl bg-white rounded-xl border border-gray-200 shadow-2xl transition-transform duration-200 origin-center scale-95">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-base font-semibold">Select Team or Responder</div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setIsPickerOpen(false)}>Close</button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium">Teams</div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-200">
                  {availableTeams.length === 0 && <div className="p-3 text-xs text-gray-500">No teams found</div>}
                  {availableTeams.map((t, idx) => (
                    <button key={idx} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white" onClick={() => { setTeamAssigned(t.name); setIsPickerOpen(false); }}>
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${t.status === 'available' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="flex-1 text-sm font-medium">{t.name}</span>
                      <span className="text-xs text-gray-600">{t.status}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium">Responders</div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-200">
                  {availableResponders.length === 0 && <div className="p-3 text-xs text-gray-500">No responders found</div>}
                  {availableResponders.map((r, idx) => (
                    <button key={idx} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white" onClick={() => {
                      if (!responderRoster.some(x => x.name === r.name)) {
                        setResponderRoster(prev => [...prev, { name: r.name }]);
                      }
                    }}>
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${r.status === 'available' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="flex-1 text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-gray-600">{r.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-gray-200 flex items-center justify-end">
              <button className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm" onClick={() => setIsPickerOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-base font-semibold">Confirm Dispatch</div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setConfirmOpen(false)}>Close</button>
            </div>
              <div className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Team</span><span className="font-medium">{teamAssigned || '—'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Dispatched</span><span className="font-medium">{(() => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()); const o: any = {}; parts.forEach(p => o[p.type] = p.value); return `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`; })()}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">PPE</span><span className="font-medium truncate">{selectedPPE.length ? selectedPPE.join(', ') : 'None'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Equipment</span><span className="font-medium truncate">{equipmentUsed.length ? equipmentUsed.join(', ') : 'None'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Agencies</span><span className="font-medium truncate">{agencyTags.length ? agencyTags.map(a => a.replace('-', ' ').toUpperCase()).join(', ') : 'None'}</span></div>
              {dispatchLocation && (
                <div className="mt-2">
                  <div className="text-xs text-gray-500 mb-1">Destination</div>
                  <div className="h-40 rounded-lg overflow-hidden border">
                    <MapContainer center={[dispatchLocation[0], dispatchLocation[1]]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                      <Marker position={[dispatchLocation[0], dispatchLocation[1]]} />
                    </MapContainer>
                  </div>
                </div>
              )}
              {!dispatchLocation && (
                <div className="text-xs text-red-600">Dispatch destination is required. Click on the map to set it.</div>
              )}
            </div>
            <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded-md border border-gray-300 text-sm" onClick={() => { setConfirmOpen(false); setConfirmAck(false); }}>Cancel</button>
              <button className={`px-3 py-1.5 rounded-md text-sm ${(!dispatchLocation || confirmLoading) ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`} disabled={!dispatchLocation || confirmLoading} onClick={async () => { if (confirmLoading || !dispatchLocation) return; setConfirmLoading(true); await dispatchTeam(); setConfirmLoading(false); setConfirmOpen(false); }}>
                {confirmLoading ? 'Dispatching…' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShareOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-base font-semibold">Dispatch Created</div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setShareOpen(false)}>Close</button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Incident ID</span><span className="font-medium">{incidentCode || '—'}</span></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between"><span className="text-gray-500">Team</span><span className="font-medium truncate">{teamAssigned || '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-500">Dispatched</span><span className="font-medium truncate">{(() => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date()); const o: any = {}; parts.forEach(p => o[p.type] = p.value); return `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`; })()}</span></div>
              </div>
              {dispatchLocation && (
                <div className="flex items-center justify-between"><span className="text-gray-500">Destination</span><span className="font-medium">{`${dispatchLocation[0].toFixed(5)}, ${dispatchLocation[1].toFixed(5)}`}</span></div>
              )}
              <div className="flex items-center justify-between"><span className="text-gray-500">PPE</span><span className="font-medium truncate">{selectedPPE.length ? selectedPPE.join(', ') : 'None'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Equipment</span><span className="font-medium truncate">{equipmentUsed.length ? equipmentUsed.join(', ') : 'None'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Agencies</span><span className="font-medium truncate">{agencyTags.length ? agencyTags.map(a => a.replace('-', ' ').toUpperCase()).join(', ') : 'None'}</span></div>
              {(hcNurseAssigner || hcHospital) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between"><span className="text-gray-500">MHO Nurse</span><span className="font-medium truncate">{hcNurseAssigner || '—'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Hospital</span><span className="font-medium truncate">{hcHospital || '—'}</span></div>
                </div>
              )}
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Run details</div>
                {(() => { const inc = String(incidentId || (detailsRecord as any)?.incident_id || '').trim(); const url = `${window.location.origin}/admin/dispatch-response?incidentId=${encodeURIComponent(inc)}`; return (<a className="text-blue-600 underline text-xs" href={url} target="_self" rel="noopener">Open Run Details</a>); })()}
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">Share link (opens responder board)</div>
                {(() => {
                  const url = `${window.location.origin}/admin/dispatch-response?incidentId=${encodeURIComponent(incidentId || (detailsRecord as any)?.incident_id || '')}`;
                  return (
                    <div className="flex items-center gap-2">
                      <input className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs" readOnly value={url} />
                      <button className="px-2 py-1 rounded border border-gray-300 text-xs" onClick={async () => {
                        try { await navigator.clipboard.writeText(url); toast.success('Share link copied'); } catch { toast.error('Copy failed'); }
                      }}>Copy</button>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="p-3 border-t border-gray-200 flex items-center justify-end">
              <button className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={() => setShareOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Health tab removed; health coordination merged into Dispatch */}

      {activeTab === 'records' && (
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4">DISPATCH RECORDS</h2>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Incident ID</label>
                <input className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm" value={incidentId} onChange={e => setIncidentId(e.target.value)} />
              </div>
              <input className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-2 py-1 text-sm" placeholder="Search team, notes, or status" value={recordSearch} onChange={e => setRecordSearch(e.target.value)} />
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-gray-600">Selected: {Object.values(selectedRows).filter(Boolean).length}</span>
                <select className="text-xs border border-gray-300 rounded px-2 py-1" value={bulkStatus} onChange={e => setBulkStatus(e.target.value as any)}>
                  {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
                <button className="px-2 py-1 rounded text-xs bg-blue-600 text-white disabled:opacity-60" disabled={Object.values(selectedRows).filter(Boolean).length === 0} onClick={bulkUpdateRecordStatus}>Apply</button>
              </div>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-2"><input type="checkbox" onChange={e => {
                    const checked = e.target.checked;
                    const next: Record<string, boolean> = {};
                    filteredRecords.forEach((r, idx) => { const id = String((r as any).run_id || (r as any).id || idx); next[id] = checked; });
                    setSelectedRows(next);
                  }} /></th>
                  <th className="text-left p-2">Run ID</th>
                  <th className="text-left p-2">Incident ID</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-left p-2">Dispatched</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">MHO Nurse</th>
                  <th className="text-left p-2">Hospital</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-xs text-gray-500" colSpan={6}>No records found. Try dispatching a team.</td>
                  </tr>
                )}
                {filteredRecords.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2"><input type="checkbox" checked={!!selectedRows[String((r as any).run_id || (r as any).id || idx)]} onChange={e => {
                      const key = String((r as any).run_id || (r as any).id || idx);
                      setSelectedRows(prev => ({ ...prev, [key]: e.target.checked }));
                    }} /></td>
                    <td className="p-2">{r.run_id || r.id || '-'}</td>
                    <td className="p-2">{(r as any).incident_code || (r as any).incident_id || '-'}</td>
                    <td className="p-2">{r.team_assigned || '-'}</td>
                    <td className="p-2">{formatPHDateTime(r.dispatched_at || (r as any).started_at || r.created_at)}</td>
                    <td className="p-2">
                      {(() => { const key = String((r as any).run_id || (r as any).id || idx); const current = (r as any).status_label || ((r as any).status === 'completed' ? 'Completed' : ( (r as any).status === 'archived' ? 'Archived' : 'Received')); const display = (rowStatusEdits[key] ?? current) as any; const isEditing = editingRowId === key; return (
                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <button className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${pillClassFor(display)}`} onClick={() => setEditingRowId(key)}>
                              {display}
                            </button>
                          )}
                          {isEditing && (
                            <select className="text-xs border border-gray-300 rounded px-2 py-1" autoFocus value={display} onBlur={() => setEditingRowId(null)} onChange={e => {
                              const next = e.target.value as any;
                              setRowStatusEdits(prev => ({ ...prev, [key]: next }));
                              updateRecordStatus((r as any).run_id || (r as any).id, next, key);
                              setEditingRowId(null);
                            }}>
                              {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                            </select>
                          )}
                          {rowStatusUpdating === key && (<span className="text-[11px] text-gray-500">Updating…</span>)}
                        </div>
                      ); })()}
                    </td>
                    <td className="p-2">{(() => { let name = ''; try { const hc = JSON.parse((r as any).health_coordination || 'null'); if (hc) { name = hc.nurse_assigner || hc.mho_name || ''; } } catch {} return name || '—'; })()}</td>
                    <td className="p-2">{(() => { let hosp = ''; try { const hc = JSON.parse((r as any).health_coordination || 'null'); if (hc) { hosp = hc.hospital || ''; } } catch {} return hosp || '—'; })()}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <button className="text-blue-600 hover:underline" onClick={async () => {
                          const runKey = String((r as any).run_id || (r as any).id || idx);
                          setDetailsRecord(r);
                          { const ds = ((r as any).status_label || ((r as any).status === 'completed' ? 'Completed' : ((r as any).status === 'archived' ? 'Archived' : 'Received'))) as any; setDetailsStatus(ds); setDetailsStatusOriginal(ds); }
                          let a: string[] = []; let p: string[] = []; let eArr: string[] = [];
                          try { const rawA = JSON.parse((r as any).agencies_tagged || '[]'); a = Array.isArray(rawA) ? rawA : []; } catch {}
                          try { const rawP = JSON.parse((r as any).ppe_checklist || '[]'); p = Array.isArray(rawP) ? rawP : []; } catch {}
                          try { const rawE = JSON.parse((r as any).equipment_used || '[]'); eArr = Array.isArray(rawE) ? rawE : []; } catch {}
                          setDetailsAgencies(a);
                          setDetailsPPE(p);
                          setDetailsEquipment(eArr);
                          setDetailsNotes(r.notes || '');
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
                        }}>View Details</button>
                        <button className="text-blue-600 hover:underline" onClick={() => {
                          const dlat = (r as any).destination_lat; const dlng = (r as any).destination_lng;
                          if (dlat && dlng) {
                            const dest: [number, number] = [Number(dlat), Number(dlng)];
                            setDispatchLocation(dest);
                            if (dispatchMapRef.current) {
                              dispatchMapRef.current.setView(dest as any, 15);
                            }
                            toast.success('Centered map to destination');
                          } else {
                            toast.error('No destination set on this run');
                          }
                        }}>View on Map</button>
                        <a className="text-gray-700 hover:underline" href={`/admin/incident-report/${encodeURIComponent((r as any).run_id || (r as any).id || '')}`} target="_self" rel="noopener">Generate Report</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-600">Page {page} of {Math.max(1, Math.ceil(total / pageSize))} • {total} total</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 rounded border border-gray-300 text-xs disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <button className="px-2 py-1 rounded border border-gray-300 text-xs disabled:opacity-50" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>Next</button>
                <select className="text-xs border border-gray-300 rounded px-2 py-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10,20,50,100].map(s => <option key={s} value={s}>{s}/page</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      {detailsOpen && detailsRecord && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailsOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-3xl bg-white rounded-xl border border-gray-200 shadow-2xl">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-base font-semibold">Run Details</div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setDetailsOpen(false)}>Close</button>
              </div>
              <div className="p-4 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  <div className="text-gray-500">Incident ID</div>
                  <div className="font-medium">{(detailsRecord as any).incident_id || '—'}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-gray-500">Team</div>
                  <div className="font-medium">{(detailsRecord as any).team_assigned || '—'}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-gray-500">Completed</div>
                  <div className="font-medium">{formatPHDateTime((detailsRecord as any).completed_at)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-gray-500">Dispatched</div>
                  <div className="font-medium">{formatPHDateTime((detailsRecord as any).dispatched_at || (detailsRecord as any).started_at || (detailsRecord as any).created_at)}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Status</div>
                    <select className="text-sm border border-gray-300 rounded px-2 py-1" value={detailsStatus} onChange={e => setDetailsStatus(e.target.value as any)}>
                      {(['Received','Dispatched','Responding','Arrived','Completed','Archived'] as const).map(s => (<option key={s} value={s}>{s}</option>))}
                    </select>
                    {(detailsRecord as any)?.status_updated_by && (
                      <div className="mt-2 text-[11px] text-gray-500">Last change by {(detailsRecord as any).status_updated_by} at {(detailsRecord as any).status_updated_at || '—'}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Agencies</div>
                    <div className="flex flex-wrap gap-2">
                      {(['police','fire','health','coast-guard','dpwh'] as Agency[]).map(ag => (
                        <span key={ag} className={`px-2.5 py-1.5 rounded-md text-xs border ${detailsAgencies.includes(ag) ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>{ag.replace('-',' ').toUpperCase()}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">PPE</div>
                    <div className="flex flex-wrap gap-2">
                      {defaultPPE.map(item => (
                        <span key={item} className={`px-2.5 py-1.5 rounded-md text-xs border ${detailsPPE.includes(item) ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Equipment</div>
                    <div className="flex flex-wrap gap-2">
                      {defaultEquipment.map(item => (
                        <span key={item} className={`px-2.5 py-1.5 rounded-md text-xs border ${detailsEquipment.includes(item) ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm' : 'bg-white text-gray-400 border-gray-200'}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Notes</div>
                    <textarea className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm" rows={4} value={detailsNotes} readOnly />
                    {detailsAttachments && detailsAttachments.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {detailsAttachments.map(att => (
                          <a key={att.id} href={att.url} target="_blank" rel="noopener" className="block border rounded overflow-hidden">
                            <img src={att.url} alt={att.filename} className="w-full h-20 object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
              </div>
              <div className="space-y-2">
                <div className="text-xs text-gray-500">Destination</div>
                  <div className="h-48 rounded-lg overflow-hidden border">
                    <MapContainer center={detailsDest || [14.5995, 120.9842]} zoom={detailsDest ? 15 : 12} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
                      {detailsDest && <Marker position={[detailsDest[0], detailsDest[1]]} />}
                      {/* Map is view-only in this modal for printed-style details */}
                    </MapContainer>
                  </div>
                  {detailsDest && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{detailsDest[0].toFixed(6)}, {detailsDest[1].toFixed(6)}</span>
                      <button className="px-2 py-1 rounded border border-gray-300" onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(`${detailsDest[0].toFixed(6)}, ${detailsDest[1].toFixed(6)}`);
                          toast.success('Coordinates copied');
                        } catch {
                          toast.error('Copy failed');
                        }
                      }}>Copy</button>
                      <button className="px-2 py-1 rounded border border-gray-300" onClick={() => {
                        try {
                          if (detailsDest && dispatchMapRef.current) {
                            dispatchMapRef.current.setView(detailsDest as any, 15);
                            toast.success('Centered admin map');
                          }
                        } catch {}
                      }}>Center Admin Map</button>
                    </div>
                  )}
                  <div className="mt-2 text-xs">
                    <div className="text-gray-500 mb-1">Run details</div>
                    {(() => {
                      const inc = String((detailsRecord as any).incident_id || '').trim();
                      if (!inc) return null;
                      const url = `${window.location.origin}/admin/dispatch-response?incidentId=${encodeURIComponent(inc)}`;
                      return (
                        <div className="flex items-center gap-2">
                          <a className="text-blue-600 underline" href={url} target="_self" rel="noopener">Open Run Details</a>
                          <button className="px-2 py-1 rounded border border-gray-300" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success('Link copied'); } catch { toast.error('Copy failed'); } }}>Copy link</button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Health Coordination</div>
                    {(() => {
                      const rec: any = detailsRecord || {};
                      const h = rec.health_coordination || {};
                      const mho = rec.hc_mho_name || h.mho_name || '';
                      const mhoContact = rec.hc_mho_contact || h.mho_contact || '';
                      const nurse = rec.hc_nurse_assigner || h.nurse_assigner || '';
                      const hospital = rec.hc_hospital || h.hospital || '';
                      const departure = formatPHDateTime(rec.hc_departure || h.departure_at || rec.dispatched_at || '');
                      const arrival = formatPHDateTime(rec.hc_arrival || h.arrival_at || '');
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>MHO Nurse: {nurse || '—'}</div>
                          <div>Hospital: {hospital || '—'}</div>
                          <div>MHO/MESU: {mho || '—'}</div>
                          <div>Contact: {mhoContact || '—'}</div>
                          <div>Departure: {departure || '—'}</div>
                          <div>Arrival: {arrival || '—'}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                {detailsStatus === 'Completed' && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Completion Documentation</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-1">Time of Arrival</label>
                        <input type="datetime-local" className="w-full rounded border border-gray-300 px-2 py-1 text-xs" value={detailsArrivalInput} onChange={e => setDetailsArrivalInput(e.target.value)} />
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">This time will be saved when you click Save.</div>
                  </div>
                )}
              </div>
              </div>
              <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 rounded-md border border-gray-300 text-sm" onClick={() => setDetailsOpen(false)}>Close</button>
                <button className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={() => {
                  if (detailsStatus !== detailsStatusOriginal) { setStatusConfirmOpen(true); return; }
                  (async () => {
                    const rid = Number((detailsRecord as any).run_id || (detailsRecord as any).id);
                    const statusPayload = statusToServer(detailsStatus);
                    const payload: any = { sop_run_id: rid, status: statusPayload, status_label: detailsStatus };
                    if (detailsArrivalInput && detailsStatus === 'Completed') {
                      payload.health_coordination = { arrival_at: detailsArrivalInput };
                    }
                    try {
                      const res = await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      const data = await res.json().catch(() => ({} as any));
                      if (data && data.success) { toast.success('Record updated'); setDetailsOpen(false); fetchRecords(); } else { toast.error('Update failed'); }
                    } catch { toast.error('Server error'); }
                  })();
                }}>Save</button>
              </div>
              </div>
              </div>
            )}

      {statusConfirmOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatusConfirmOpen(false)} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="text-base font-semibold">Confirm Status Change</div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setStatusConfirmOpen(false)}>Close</button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div>Change status from <span className={`px-2 py-0.5 rounded-full border ${pillClassFor(detailsStatusOriginal)}`}>{detailsStatusOriginal}</span> to <span className={`px-2 py-0.5 rounded-full border ${pillClassFor(detailsStatus)}`}>{detailsStatus}</span>?</div>
              <div className="text-[11px] text-gray-500">This action records the staff account and timestamp.</div>
            </div>
            <div className="p-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 rounded-md border border-gray-300 text-sm" onClick={() => setStatusConfirmOpen(false)}>Cancel</button>
              <button className="px-3 py-1.5 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700" onClick={async () => {
                const rid = Number((detailsRecord as any).run_id || (detailsRecord as any).id);
                const statusPayload = statusToServer(detailsStatus);
                const payload: any = { sop_run_id: rid, status: statusPayload, status_label: detailsStatus };
                try {
                  const res = await apiFetch('update-sop-run.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  const data = await res.json().catch(() => ({} as any));
                  if (data && data.success) { toast.success('Status changed'); setStatusConfirmOpen(false); setDetailsOpen(false); fetchRecords(); } else { toast.error('Update failed'); }
                } catch { toast.error('Server error'); }
              }}>Confirm</button>
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow animate-pop">
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
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={mhoName} onChange={e => setMhoName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">MHO/MESU Contact Number</label>
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={mhoContact} onChange={e => setMhoContact(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">MHO Nurse Assigner</label>
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={nurseAssigner} onChange={e => setNurseAssigner(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Patient Transfer Hospital</label>
          <input className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={hospital} onChange={e => setHospital(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time of Departure</label>
          <input type="datetime-local" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={departure} onChange={e => setDeparture(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time of Arrival</label>
          <input type="datetime-local" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={arrival} onChange={e => setArrival(e.target.value)} />
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
