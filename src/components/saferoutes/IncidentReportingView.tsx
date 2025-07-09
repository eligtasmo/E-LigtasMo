import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import './IncidentReportingView.css';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom';

const incidentIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // exclamation icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const incidentTypes = [
  "Flood",
  "Fire",
  "Landslide",
  "Accident",
  "Blocked Road",
  "Earthquake",
  "Other"
];

const severities = ["Low", "Moderate", "High", "Critical"];

const initialIncidents: any[] = [];

function IncidentLocationPicker({ onPick, picking }: { onPick: (latlng: { lat: number; lng: number }) => void, picking: boolean }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    }
  });
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'E-LigtasMo/1.0' } });
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
    return '';
  } catch (error) {
    return '';
  }
}

function MapPinPreview() {
  const map = useMapEvents({});
  const [pos, setPos] = useState<{lat: number, lng: number} | null>(null);
  useEffect(() => {
    const handleMove = (e: any) => {
      setPos(e.latlng);
    };
    map.on('mousemove', handleMove);
    return () => { map.off('mousemove', handleMove); };
  }, [map]);
  if (!pos) return null;
  return (
    <Marker position={[pos.lat, pos.lng]} icon={L.divIcon({
      className: 'pin-preview',
      html: `<div style="width:32px;height:32px;opacity:0.5;"><img src='https://cdn-icons-png.flaticon.com/512/684/684908.png' style='width:32px;height:32px;filter:drop-shadow(0 0 6px #2563eb88);opacity:0.7;'/></div>`
    })} />
  );
}

const breathingDotIcon = L.divIcon({
  className: 'breathing-dot-marker',
  html: `<div class='breathing-dot'></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface IncidentReportingViewProps {
  showReceipt: boolean;
  setShowReceipt: (open: boolean) => void;
  referenceId: string | null;
  setReferenceId: (id: string | null) => void;
}

export default function IncidentReportingView({ showReceipt, setShowReceipt, referenceId, setReferenceId }: IncidentReportingViewProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    type: "Flood",
    lat: null,
    lng: null,
    address: "",
    datetime: new Date().toISOString().slice(0, 16),
    description: "",
    severity: "Moderate",
    photoUrl: "",
    reporter: "",
    contact: "",
    nearestShelter: "",
    status: "Pending"
  });
  const [pickingLocation, setPickingLocation] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [mapCursor, setMapCursor] = useState<string>('');
  const [step, setStep] = useState(1);

  // Simulated shelters for nearest shelter dropdown
  const shelters = [
    "Barangay Hall Shelter",
    "Covered Court Shelter",
    "School Gym Shelter"
  ];

  // Fetch pending incidents from backend
  const fetchPendingIncidents = async () => {
    setLoadingIncidents(true);
    try {
      const res = await fetch("http://localhost/eligtasmo/api/list-incidents.php?status=Pending");
      const data = await res.json();
      if (data.success) {
        setIncidents(data.incidents || []);
      } else {
        setIncidents([]);
      }
    } catch (err) {
      setIncidents([]);
    }
    setLoadingIncidents(false);
  };

  useEffect(() => {
    fetchPendingIncidents();
  }, []);

  useEffect(() => {
    if (pickingLocation) {
      setMapCursor('url("/public/images/pin-cursor.svg"), crosshair');
    } else {
      setMapCursor('');
    }
  }, [pickingLocation]);

  useEffect(() => {
    // Auto-fill barangay and coordinator for brgy users
    if (user && user.role === 'brgy') {
      setForm((prev: any) => ({
        ...prev,
        barangay: user.brgy_name || '',
        coordinator: user.full_name || '',
      }));
    }
  }, [user]);

  const handleLocationPick = async (latlng: { lat: number; lng: number }) => {
    setLoadingAddress(true);
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    setForm({ ...form, lat: latlng.lat, lng: latlng.lng, address });
    setPickingLocation(false);
    setLoadingAddress(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreview(ev.target?.result as string);
        setForm({ ...form, photoUrl: file.name }); // In real app, upload and use URL
      };
      reader.readAsDataURL(file);
    }
  };

  // Step validation
  const validateStep1 = () => {
    const newErrors: any = {};
    if (!form.type) newErrors.type = 'Type is required.';
    if (!form.lat || !form.lng) newErrors.location = 'Location is required.';
    if (!form.datetime) newErrors.datetime = 'Date/Time is required.';
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (!form.severity) newErrors.severity = 'Severity is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const validateStep2 = () => {
    const newErrors: any = {};
    if (!form.reporter.trim()) newErrors.reporter = 'Name is required.';
    if (!form.contact.trim()) newErrors.contact = 'Contact number is required.';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) newErrors.email = 'Invalid email address.';
    if (!captchaChecked) newErrors.captcha = 'Please confirm you are not a robot.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;

      // Prepare data
      const payload = {
        ...form,
        email: form.email || "",
      };

      try {
        const response = await fetch("http://localhost/eligtasmo/api/report-incident.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (data.success) {
          setReferenceId(data.id ? String(data.id) : null);
          setShowReceipt(true);
          setSuccessMsg("Incident submitted! Pending approval by barangay or admin.");
          setForm({
            type: "Flood",
            lat: null,
            lng: null,
            address: "",
            datetime: new Date().toISOString().slice(0, 16),
            description: "",
            severity: "Moderate",
            photoUrl: "",
            reporter: "",
            contact: "",
            email: "",
            nearestShelter: "",
            status: "Pending"
          });
          setPhotoPreview(null);
          setCaptchaChecked(false);
          setStep(1);
          fetchPendingIncidents();
        } else {
          setSuccessMsg("");
          alert("Failed to submit: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        setSuccessMsg("");
        alert("Network error. Please try again.");
      }
    }
  };

  return (
    <div className="flex gap-4" style={{ height: "85vh" }}>
      {/* Confirmation Modal */}
      {showReceipt && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center z-[10000]">
            <div className="text-green-600 text-4xl mb-2">✓</div>
            <h2 className="text-xl font-bold mb-2">Incident Submitted!</h2>
            <p className="mb-2">Thank you for your report. Your reference number is:</p>
            <div className="font-mono text-lg bg-gray-100 rounded px-4 py-2 mb-4">{referenceId || 'N/A'}</div>
            <p className="text-sm text-gray-600 mb-4">Please save this reference number to check the status of your report.</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded font-semibold" onClick={() => setShowReceipt(false)}>Close</button>
          </div>
        </div>,
        document.body
      )}
      {/* Sidebar */}
      <div className="w-1/3 flex flex-col p-2 bg-white rounded-lg shadow-md overflow-y-auto">
        {/* Warning/Disclaimer */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded p-3 mb-3 text-sm text-yellow-800">
          <b>Warning:</b> Submitting false or prank reports is a crime and may be prosecuted. Your IP address and timestamp will be recorded.
        </div>
        <h2 className="text-lg font-semibold mb-2">Incident Reporting</h2>
        {successMsg && <div className="bg-green-50 border-l-4 border-green-400 rounded p-2 mb-2 text-green-800 text-sm">{successMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show info cards for brgy users, never for residents or on /residents/report route */}
          {user && user.role === 'brgy' && location.pathname !== '/residents/report' ? (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-100 rounded p-2">
                  <span className="block text-xs text-gray-500">Barangay</span>
                  <span className="font-semibold">{form.barangay}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded p-2">
                  <span className="block text-xs text-gray-500">Coordinator</span>
                  <span className="font-semibold">{form.coordinator}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 1: Incident Details */}
          {step === 1 && (
            <>
              <h3 className="text-sm font-semibold mb-2 mt-4">Incident Details</h3>
              <div>
                <label className="block text-xs font-semibold">Type of Incident</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  required
                >
                  {incidentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.type && <div className="text-xs text-red-600 mt-1">{errors.type}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Incident Location</label>
                <button type="button" className={`px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold text-xs mb-2 ${pickingLocation ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setPickingLocation(true)}>
                  {form.lat && form.lng ? 'Change Location' : 'Pick Location on Map'}
                </button>
                {form.lat && form.lng && (
                  <div className="text-xs text-gray-600 mb-1">Picked: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</div>
                )}
                {loadingAddress && <div className="text-xs text-blue-500">Getting address...</div>}
                {errors.location && <div className="text-xs text-red-600 mt-1">{errors.location}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold">Date & Time</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  name="datetime"
                  type="datetime-local"
                  value={form.datetime}
                  onChange={handleFormChange}
                  required
                />
                {errors.datetime && <div className="text-xs text-red-600 mt-1">{errors.datetime}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold">Description</label>
                <textarea
                  className="w-full border rounded px-2 py-1"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={2}
                  required
                  placeholder="Describe the incident in detail..."
                />
                {errors.description && <div className="text-xs text-red-600 mt-1">{errors.description}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold">Severity</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  name="severity"
                  value={form.severity}
                  onChange={handleFormChange}
                  required
                >
                  {severities.map(sev => (
                    <option key={sev} value={sev}>{sev}</option>
                  ))}
                </select>
                {errors.severity && <div className="text-xs text-red-600 mt-1">{errors.severity}</div>}
              </div>
              {/* Attachments Section */}
              <h3 className="text-sm font-semibold mb-2 mt-4">Attachments</h3>
              <div>
                <label className="block text-xs font-semibold">Photo (optional)</label>
                <input
                  className="w-full border rounded px-2 py-1"
                  name="photo"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={photoPreview} alt="Incident" className="rounded max-h-32 border" />
                    <button type="button" className="text-xs text-red-500 underline" onClick={() => { setPhotoPreview(null); setForm({ ...form, photoUrl: '' }); }}>Remove</button>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <button type="button" className="bg-blue-600 text-white px-6 py-2 rounded font-semibold" onClick={() => { if (validateStep1()) setStep(2); }}>
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 2: Reporter Info & Submit */}
          {step === 2 && (
            <>
              <h3 className="text-sm font-semibold mb-2 mt-4">Reporter Information</h3>
              <div className="md:flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold">Reporter Name <span className="text-red-500">*</span></label>
                  <input
                    className={`w-full border rounded px-2 py-1 ${errors.reporter ? 'border-red-500' : ''}`}
                    name="reporter"
                    value={form.reporter}
                    onChange={handleFormChange}
                    required
                    placeholder="Your name"
                  />
                  {errors.reporter && <div className="text-xs text-red-600 mt-1">{errors.reporter}</div>}
                </div>
                <div className="flex-1 mt-2 md:mt-0">
                  <label className="block text-xs font-semibold">Contact Info <span className="text-red-500">*</span></label>
                  <input
                    className={`w-full border rounded px-2 py-1 ${errors.contact ? 'border-red-500' : ''}`}
                    name="contact"
                    value={form.contact}
                    onChange={handleFormChange}
                    required
                    placeholder="09xx xxx xxxx"
                  />
                  {errors.contact && <div className="text-xs text-red-600 mt-1">{errors.contact}</div>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold">Email (optional)</label>
                <input
                  className={`w-full border rounded px-2 py-1 ${errors.email ? 'border-red-500' : ''}`}
                  name="email"
                  value={form.email || ''}
                  onChange={handleFormChange}
                  type="email"
                  placeholder="your@email.com"
                />
                {errors.email && <div className="text-xs text-red-600 mt-1">{errors.email}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold">Nearest Shelter</label>
                <select
                  className="w-full border rounded px-2 py-1"
                  name="nearestShelter"
                  value={form.nearestShelter}
                  onChange={handleFormChange}
                >
                  <option value="">Select Shelter</option>
                  {shelters.map(shelter => (
                    <option key={shelter} value={shelter}>{shelter}</option>
                  ))}
                </select>
              </div>
              {/* Status (hidden for brgy, optional for admin) */}
              {user && user.role !== 'brgy' && (
                <div>
                  <label className="block text-xs font-semibold">Status</label>
                  <select
                    className="w-full border rounded px-2 py-1"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              )}
              {/* CAPTCHA */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="captcha"
                  checked={captchaChecked}
                  onChange={e => setCaptchaChecked(e.target.checked)}
                  className="h-4 w-4 border rounded"
                />
                <label htmlFor="captcha" className="text-xs">I am not a robot</label>
              </div>
              {errors.captcha && <div className="text-xs text-red-600 mt-1">{errors.captcha}</div>}
              <div className="flex justify-between mt-4">
                <button type="button" className="bg-gray-300 text-gray-800 px-6 py-2 rounded font-semibold" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-semibold flex items-center justify-center">
                  {loadingIncidents ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  ) : null}
                  Submit Incident
                </button>
              </div>
            </>
          )}
        </form>
        {/* List of Pending Incidents */}
        <h3 className="text-md font-semibold mb-2 mt-6">Your Pending Reports</h3>
        {loadingIncidents ? (
          <div className="text-gray-400">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="text-gray-400">No pending incidents reported yet.</div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="mb-3 p-2 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-700">{incident.type}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-200">{new Date(incident.datetime).toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full bg-yellow-400 text-black`}>{incident.severity}</span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gray-400 text-white`}>{incident.status}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{incident.address}</div>
              <div className="text-xs mt-1">{incident.description}</div>
              <div className="text-xs mt-1">Reporter: <b>{incident.reporter}</b> ({incident.contact})</div>
            </div>
          ))
        )}
      </div>
      {/* Map */}
      <div className="flex-1 h-full rounded-xl shadow-lg bg-white overflow-hidden relative" style={{ minWidth: 400 }}>
        <MapContainer center={[form.lat || 14.28, form.lng || 121.42]} zoom={form.lat && form.lng ? 15 : 10} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" />
          {/* Pin preview while picking */}
          {pickingLocation && <MapPinPreview />}
          {/* Picked location marker with breathing effect */}
          {form.lat && form.lng && !pickingLocation && (
            <Marker position={[form.lat, form.lng]} icon={breathingDotIcon} />
          )}
          {/* Location picker handler */}
          {pickingLocation && (
            <IncidentLocationPicker onPick={handleLocationPick} picking={pickingLocation} />
          )}
        </MapContainer>
        {/* Overlay for picking mode */}
        {pickingLocation && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-40 flex items-center justify-center pointer-events-none z-10">
            <div className="text-blue-700 font-semibold animate-pulse">Click on the map to pick a location</div>
          </div>
        )}
      </div>
    </div>
  );
} 