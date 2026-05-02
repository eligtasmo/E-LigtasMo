import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiAlertTriangle, FiUser, FiMapPin, FiClock, FiCamera } from 'react-icons/fi';
import { FaExclamationTriangle, FaRoad, FaWater, FaFire, FaSnowflake, FaWind, FaMapMarkerAlt, FaPhone, FaEnvelope, FaCalendarAlt } from 'react-icons/fa';

interface Hazard {
  id: number | string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  address: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'active' | 'resolved' | 'monitoring';
  coordinates?: [number, number];
  lat?: number;
  lng?: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  datetime: string;
  reporter: string;
  contact: string;
  email?: string;
  photo_url?: string;
  allowed_modes?: string[] | null;
}

interface HazardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (hazard: Omit<Hazard, 'id'>) => void | Promise<void>;
  initialData?: Hazard | null;
  isEditing?: boolean;
  hazardStart?: [number, number] | null;
  hazardEnd?: [number, number] | null;
  previewLineGeojson?: any;
  previewAreaGeojson?: any;
  draftSeverity?: 'low' | 'medium' | 'high' | 'critical';
  setDraftSeverity?: (severity: 'low' | 'medium' | 'high' | 'critical') => void;
  defaultReporter?: string;
  defaultContact?: string;
  defaultEmail?: string;
  defaultLocation?: string;
  defaultAddress?: string;
}

const HAZARD_TYPES = [
  { value: 'Flood', label: '🌊 Flood', icon: FaWater, color: '#3b82f6' },
  { value: 'Fire', label: '🔥 Fire', icon: FaFire, color: '#ef4444' },
  { value: 'Landslide', label: '⛰️ Landslide', icon: FaExclamationTriangle, color: '#f59e0b' },
  { value: 'Accident', label: '🚗 Accident', icon: FaExclamationTriangle, color: '#dc2626' },
  { value: 'Blocked Road', label: '🚧 Blocked Road', icon: FaRoad, color: '#6b7280' },
  { value: 'Earthquake', label: '🌍 Earthquake', icon: FaExclamationTriangle, color: '#8b5cf6' },
  { value: 'Other', label: '📋 Other', icon: FiAlertTriangle, color: '#10b981' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: '🟢 Low', color: '#10b981' },
  { value: 'medium', label: '🟡 Moderate', color: '#f59e0b' },
  { value: 'high', label: '🟠 High', color: '#ef4444' },
  { value: 'critical', label: '🔴 Critical', color: '#dc2626' }
];

const HazardFormModal: React.FC<HazardFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing,
  hazardStart,
  hazardEnd,
  previewLineGeojson,
  previewAreaGeojson,
  draftSeverity,
  setDraftSeverity,
  defaultReporter,
  defaultContact,
  defaultEmail,
  defaultLocation,
  defaultAddress
}) => {
  const [formData, setFormData] = useState({
    type: 'Flood',
    severity: (draftSeverity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
    location: defaultLocation || '',
    address: defaultAddress || '',
    description: '',
    reportedBy: defaultReporter || 'Barangay',
    status: 'active' as 'active' | 'resolved' | 'monitoring',
    datetime: new Date().toISOString().slice(0, 16),
    reporter: defaultReporter || 'Barangay',
    contact: defaultContact || '',
    email: defaultEmail || '',
    photo_url: '',
    allowedVehicles: [] as string[],
    lat: 0,
    lng: 0,
    start_lat: hazardStart?.[0] || 0,
    start_lng: hazardStart?.[1] || 0,
    end_lat: hazardEnd?.[0] || 0,
    end_lng: hazardEnd?.[1] || 0
  });

  // Compact single-step form (no Next/Previous). Keep state minimal.
  const [currentStep] = useState(1);
  const totalSteps = 1;
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [phase, setPhase] = useState<'confirm' | 'details'>('details');

  useEffect(() => {
    if (!isOpen) return;
    const hasPreview = !!previewAreaGeojson || !!previewLineGeojson;
    setPhase(!isEditing && hasPreview ? 'confirm' : 'details');
  }, [isOpen, isEditing, previewAreaGeojson, previewLineGeojson]);

  useEffect(() => {
    if (initialData) {
      const sevRaw = String((initialData as any).severity || '').toLowerCase();
      const sev =
        sevRaw === 'critical' ? 'critical' :
        sevRaw === 'high' ? 'high' :
        sevRaw === 'moderate' || sevRaw === 'medium' ? 'medium' :
        sevRaw === 'low' ? 'low' :
        (draftSeverity || 'medium');
      setFormData({
        type: initialData.type,
        severity: sev as any,
        location: initialData.location,
        address: initialData.address || '',
        description: initialData.description,
        reportedBy: initialData.reportedBy,
        status: initialData.status,
        datetime: initialData.datetime || new Date().toISOString().slice(0, 16),
        reporter: initialData.reporter || '',
        contact: initialData.contact || '',
        email: initialData.email || '',
        photo_url: initialData.photo_url || '',
        allowedVehicles: Array.isArray(initialData.allowed_modes) ? initialData.allowed_modes : [],
        lat: initialData.lat || 0,
        lng: initialData.lng || 0,
        start_lat: initialData.start_lat || 0,
        start_lng: initialData.start_lng || 0,
        end_lat: initialData.end_lat || 0,
        end_lng: initialData.end_lng || 0
      });
    } else {
      setFormData({
        type: 'Flood',
        severity: (draftSeverity || 'medium') as any,
        location: defaultLocation || '',
        address: defaultAddress || '',
        description: '',
        reportedBy: defaultReporter || 'Barangay',
        status: 'active',
        datetime: new Date().toISOString().slice(0, 16),
        reporter: defaultReporter || 'Barangay',
        contact: defaultContact || '',
        email: defaultEmail || '',
        photo_url: '',
        allowedVehicles: [],
        lat: 0,
        lng: 0,
        start_lat: hazardStart?.[0] || 0,
        start_lng: hazardStart?.[1] || 0,
        end_lat: hazardEnd?.[0] || 0,
        end_lng: hazardEnd?.[1] || 0
      });
    }
    // Always start at single compact step
    // (We still keep the variable for minimal change footprint.)
  }, [initialData, isOpen, hazardStart, hazardEnd, draftSeverity, defaultLocation, defaultAddress, defaultReporter, defaultContact, defaultEmail]);

  const severityIndex = formData.severity === 'low' ? 0 : formData.severity === 'medium' ? 1 : formData.severity === 'high' ? 2 : 3;
  const previewRadiusM = formData.severity === 'critical' ? 350 : formData.severity === 'high' ? 250 : formData.severity === 'medium' ? 160 : 110;

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!isFormValid()) {
      setSubmitError('Please fill all required fields.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    // Always set datetime automatically to the current time on save
    const nowIso = new Date().toISOString();
    const reporterFinal = formData.reporter || defaultReporter || 'Barangay';
    const contactFinal = formData.contact || defaultContact || '';
    const locationFinal = formData.location || defaultLocation || defaultAddress || '';
    const addressFinal = formData.address || defaultAddress || locationFinal;
    try {
      await onSubmit({
        ...formData,
        reporter: reporterFinal,
        reportedBy: reporterFinal,
        contact: contactFinal,
        location: locationFinal,
        address: addressFinal,
        datetime: nowIso,
        reportedAt: initialData?.reportedAt || nowIso
      });
      onClose();
    } catch (err: any) {
      setSubmitError(String(err?.message || err || 'Failed to save hazard.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Validate minimal required fields for single-step submit
  const isFormValid = () => (
    !!formData.type &&
    !!formData.description &&
    !!formData.severity &&
    !!(formData.reporter || defaultReporter) &&
    !!(formData.contact || defaultContact) &&
    !!(formData.address || defaultAddress || formData.location || defaultLocation)
  );

  if (!isOpen) return null;

  const previewMain = previewAreaGeojson || previewLineGeojson;
  const previewSvg = (() => {
    const norm = (raw: any) => {
      if (!raw) return null;
      const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
      if (!parsed) return null;
      if (parsed.type === 'Feature' && parsed.geometry) return parsed;
      if (parsed.type && parsed.coordinates) return { type: 'Feature', geometry: parsed, properties: parsed.properties || {} };
      if (parsed.geometry && parsed.geometry.type && parsed.geometry.coordinates) return { type: 'Feature', geometry: parsed.geometry, properties: parsed.properties || {} };
      return null;
    };

    const areaF = norm(previewAreaGeojson);
    const lineF = norm(previewLineGeojson);
    const areaGeom = areaF?.geometry;
    const lineGeom = lineF?.geometry;

    const areaType = areaGeom?.type;
    const lineType = lineGeom?.type;
    const areaCoords = areaGeom?.coordinates;
    const lineCoords = lineGeom?.coordinates;

    const poly: [number, number][] | null =
      areaType === 'Polygon' && Array.isArray(areaCoords) && Array.isArray(areaCoords[0]) ? areaCoords[0] :
      areaType === 'MultiPolygon' && Array.isArray(areaCoords) && Array.isArray(areaCoords[0]) && Array.isArray(areaCoords[0][0]) ? areaCoords[0][0] :
      null;

    const line: [number, number][] | null =
      lineType === 'LineString' && Array.isArray(lineCoords) ? lineCoords :
      lineType === 'MultiLineString' && Array.isArray(lineCoords) && Array.isArray(lineCoords[0]) ? lineCoords[0] :
      null;

    const pts = ([] as [number, number][])
      .concat((poly || []) as any)
      .concat((line || []) as any)
      .filter((c: any) => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1]))) as [number, number][];
    if (pts.length < 2) return null;

    let minX = pts[0][0], maxX = pts[0][0], minY = pts[0][1], maxY = pts[0][1];
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const padX = (maxX - minX) * 0.08 || 0.0002;
    const padY = (maxY - minY) * 0.08 || 0.0002;
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;

    const w = 1000;
    const h = 560;
    const sx = w / (maxX - minX);
    const sy = h / (maxY - minY);
    const s = Math.min(sx, sy);
    const ox = (w - (maxX - minX) * s) / 2;
    const oy = (h - (maxY - minY) * s) / 2;

    const project = ([x, y]: [number, number]) => {
      const px = ox + (x - minX) * s;
      const py = oy + (maxY - y) * s;
      return [px, py] as const;
    };

    const pathFrom = (arr: [number, number][]) => {
      const projected = arr.map(project);
      return projected.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    };

    return {
      viewBox: `0 0 ${w} ${h}`,
      areaD: poly && poly.length >= 3 ? pathFrom(poly) : null,
      lineD: line && line.length >= 2 ? pathFrom(line) : null,
    };
  })();

  const modal = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <style>{`
        .hazard-modal-scroll::-webkit-scrollbar { width: 8px; }
        .hazard-modal-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.06); }
        .hazard-modal-scroll::-webkit-scrollbar-thumb { background: rgba(100,100,100,0.35); border-radius: 4px; }
      `}</style>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-hidden" style={{ maxHeight: '90svh' }}>
        <form
          onSubmit={
            phase === 'confirm'
              ? (e: any) => {
                  e.preventDefault();
                  setPhase('details');
                }
              : handleSubmit
          }
          className="flex flex-col h-full min-h-0"
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {phase === 'confirm' ? 'Confirm hazard' : isEditing ? 'Edit Hazard' : 'Report Hazard'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {phase === 'confirm' ? (
            <div className="flex-1 overflow-y-auto p-3 min-h-0 hazard-modal-scroll">
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-extrabold text-gray-900">Preview</div>
                  <div className="mt-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="w-full h-[220px]">
                      {previewMain ? (
                        <svg viewBox={previewSvg?.viewBox || '0 0 1000 560'} className="w-full h-full">
                          {previewSvg?.areaD ? (
                            <path d={previewSvg.areaD} fill="rgba(37, 99, 235, 0.25)" stroke="rgba(37, 99, 235, 0.8)" strokeWidth="5" />
                          ) : null}
                          {previewSvg?.lineD ? (
                            <>
                              <path d={previewSvg.lineD} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="16" strokeLinejoin="round" strokeLinecap="round" />
                              <path d={previewSvg.lineD} fill="none" stroke="rgba(37, 99, 235, 0.9)" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round" />
                            </>
                          ) : null}
                        </svg>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 font-semibold">
                          No preview available
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-700 font-semibold">
                    Confirm the shape/path is correct before submitting details.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex-1 overflow-y-auto p-3 min-h-0 hazard-modal-scroll"
              style={{
                WebkitOverflowScrolling: 'touch',
                overflowY: 'auto',
                scrollbarGutter: 'stable both-edges',
                maxHeight: 'calc(90svh - 112px)'
              }}
            >
              <div className="space-y-3">
                {/* Hazard Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Type of Hazard *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select hazard type</option>
                    {HAZARD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-700">Location</div>
                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(v => !v)}
                      className="text-xs font-extrabold text-blue-700 hover:text-blue-800"
                    >
                      {showMoreDetails ? 'Hide' : 'Edit'}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 font-semibold">
                    {formData.address || formData.location || defaultAddress || defaultLocation || '—'}
                  </div>
                  {showMoreDetails ? (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          General Location
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Barangay San Miguel"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Specific Address
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          readOnly={!!isEditing}
                          disabled={!!isEditing}
                          placeholder="Street name, landmark, etc."
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Date and Time - auto, read-only */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date & Time (auto)
                  </label>
                  <input
                    type="text"
                    value={new Date().toLocaleString()}
                    readOnly
                    className="w-full p-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>

                {/* Details */}
                <div className="space-y-3">
                  {/* Description */}
                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the hazard..."
                    required
                  />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-700">Severity *</label>
                      <div className="text-[11px] font-semibold text-gray-700">{previewRadiusM}m coverage</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={3}
                      step={1}
                      value={severityIndex}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const next = (v === 0 ? 'low' : v === 1 ? 'medium' : v === 2 ? 'high' : 'critical') as any;
                        setFormData({ ...formData, severity: next });
                        if (setDraftSeverity) setDraftSeverity(next);
                      }}
                      className="w-full"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-gray-500 font-semibold">
                      <span>Low</span>
                      <span>Moderate</span>
                      <span>High</span>
                      <span>Critical</span>
                    </div>
                  </div>

                  {/* Photo URL */}
                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Photo URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/photo.jpg"
                  />
                  </div>

                  {/* Allowed Vehicles */}
                  <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Allowed Vehicles (who can pass)
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { key: 'driving-car', label: 'Car' },
                      { key: 'driving-car', label: 'Motor' },
                      { key: 'cycling-regular', label: 'Bike' },
                      { key: 'foot-walking', label: 'Walk' },
                      { key: 'driving-hgv', label: 'Truck' },
                    ].map(({ key, label }) => {
                      const selected = formData.allowedVehicles.includes(key);
                      return (
                        <button
                          key={label}
                          type="button"
                          className={`${selected ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-2 py-1 rounded text-xs`}
                          onClick={() => {
                            const current = formData.allowedVehicles;
                            const next = selected ? current.filter(m => m !== key) : [...current, key];
                            setFormData({ ...formData, allowedVehicles: next });
                          }}
                          title={`Allow ${label}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave empty to block all vehicles.
                  </p>
                  </div>
                  {/* End of Allowed Vehicles */}
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Reporter
                      </label>
                      <input
                        type="text"
                        value={formData.reporter}
                        onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        readOnly={!showMoreDetails}
                      />
                      <div className="mt-1 text-[11px] text-gray-500 font-semibold">
                        {showMoreDetails ? 'You can edit reporter info.' : 'Auto-filled from account.'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.contact}
                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="09xx xxx xxxx"
                        required
                      />
                    </div>
                  </div>

                  {showMoreDetails ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email Address (optional)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  ) : null}

                  {showMoreDetails ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="active">Active</option>
                        <option value="monitoring">Monitoring</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  ) : null}
              </div>
            </div>
          </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50">
            {phase === 'details' && submitError ? (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-800">
                {submitError}
              </div>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              {phase === 'confirm' ? (
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isFormValid() || submitting}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-md transition-colors disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
};

export default HazardFormModal;
