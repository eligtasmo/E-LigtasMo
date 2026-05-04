import React, { useState, useRef, useEffect } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { CustomButton } from "../common";
import { MailIcon, EnvelopeIcon, ChevronLeftIcon } from '../../icons';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const SANTA_CRUZ_BOUNDS: L.LatLngBoundsExpression = [
  [14.20, 121.35], // Southwest coordinates
  [14.35, 121.50]  // Northeast coordinates
];

const barangays = [
  "Alipit", "Bagumbayan", "Bubukal", "Calios", "Duhat", 
  "Gatid", "Jasaan", "Labuin", "Malinao", "Oogong", 
  "Pagsawitan", "Palasan", "Patimbao", "Poblacion I", 
  "Poblacion II", "Poblacion III", "Poblacion IV", "Poblacion V", 
  "San Jose", "San Juan", "San Pablo Norte", "San Pablo Sur", 
  "Santisima Cruz", "Santo Angel Central", "Santo Angel Norte", 
  "Santo Angel Sur"
];
const cities = ["Santa Cruz", "Taguig", "Binan", "San Pedro", "Santa Rosa", "Cabuyao", "Calamba", "Other"];

interface BrgyRegisterFormProps {
  onSuccess?: () => void;
  formClassName?: string;
  mode?: 'brgy' | 'resident';
}

const LocationPicker = ({ position, setPosition }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return position ? (
    <Marker position={position}>
      <Popup>Barangay Hall Location</Popup>
    </Marker>
  ) : null;
};

/* ── Step Progress Indicator ── */
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {Array.from({ length: total }).map((_, i) => {
      const stepNum = i + 1;
      const isActive = stepNum === current;
      const isDone = stepNum < current;
      return (
        <React.Fragment key={i}>
          <div
            className={`w-4 h-1 rounded-full transition-all duration-500 ${
              isActive ? 'bg-brand-500 w-8 shadow-[0_0_15px_rgba(245,178,53,0.5)]'
              : isDone ? 'bg-brand-500' : 'bg-white/10'
            }`}
          />
          {i < total - 1 && (
            <div className={`w-4 h-0.5 transition-colors duration-300 ${isDone ? 'bg-brand-500/30' : 'bg-transparent'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ── Privacy Banner ── */
const PrivacyBanner = ({ onDismiss }: { onDismiss: () => void }) => (
  <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 mb-6 relative">
    <div className="mt-0.5 text-brand-500 flex-shrink-0">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 118 0v4" />
      </svg>
    </div>
    <p className="text-[11px] text-gray-400 font-medium leading-relaxed pr-4 uppercase tracking-wider">
      DATA INTEGRITY SECURED. ENCRYPTED CHANNEL ESTABLISHED FOR CREDENTIAL TRANSMISSION.
    </p>
    <button onClick={onDismiss} className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors" type="button">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
);

const BrgyRegisterForm = ({ onSuccess, formClassName = "space-y-6", mode = 'brgy' }: BrgyRegisterFormProps) => {
  const TOTAL_STEPS = mode === 'brgy' ? 4 : 3;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    barangay: "",
    city: "Santa Cruz",
    province: "Laguna",
    fullName: "",
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(true);

  // Email verification state
  const [codeSent, setCodeSent] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* ── Step 1: Send verification code ── */
  const handleSendCode = async () => {
    setError("");
    if (!form.email || !form.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/request-verification-code.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "signup" }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setCooldown(60);
        setError("");
      } else {
        setError(data.error || "Failed to send code. Try again.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  /* ── Verify code ── */
  const handleVerifyCode = async () => {
    setError("");
    const code = codeDigits.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-code.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.verified) {
        setEmailVerified(true);
        setStep(2);
        setError("");
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeInput = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...codeDigits];
    next[idx] = val;
    setCodeDigits(next);
    if (val && idx < 5) codeRefs.current[idx + 1]?.focus();
  };
  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus();
    }
  };

  /* ── Step navigation ── */
  const handleNextFromLocation = () => {
    setError("");
    if (!form.barangay) { setError("Please select a Barangay."); return; }
    if (!form.city) { setError("Please select a City/Municipality."); return; }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(s => Math.max(1, s - 1));
  };

  /* ── Final submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fullName || !form.username || !form.email || !form.contact || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const payload = {
      username: form.username,
      password: form.password,
      full_name: form.fullName,
      brgy_name: mode === 'brgy' ? form.barangay : (form.barangay || ''),
      city: mode === 'brgy' ? form.city : (form.city || ''),
      province: mode === 'brgy' ? form.province : (form.province || ''),
      email: form.email,
      contact_number: form.contact,
      role: mode === 'brgy' ? 'brgy' : 'resident',
      lat: location?.lat,
      lng: location?.lng
    };
    try {
      const response = await fetch("/api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      const data = await response.json();
      setLoading(false);
      if (data.success) {
        setSuccess(mode === 'brgy' ? "Your registration successfully, please wait the approval of MDRRMO admin" : "Registration successful! You can now sign in.");
        if (onSuccess) onSuccess();
      } else {
        if (data.details) {
            const messages = Object.values(data.details).flat().join('. ');
            setError(messages || data.message || "Registration failed.");
        } else {
            setError(data.message || "Registration failed.");
        }
      }
    } catch (err) {
      setLoading(false);
      setError("Server error. Please try again later.");
    }
  };

  // Determine which step is the "location" step vs "account" step
  // For resident: Step 1 = Email Verify, Step 2 = Location, Step 3 = Account
  // For brgy:     Step 1 = Email Verify, Step 2 = Location, Step 3 = Map Pin, Step 4 = Account
  const isEmailStep = step === 1;
  const isLocationStep = step === 2;
  const isMapStep = mode === 'brgy' && step === 3;
  const isAccountStep = step === TOTAL_STEPS;

  return (
    <>
      <form
        className={`w-full max-w-md mx-auto flex flex-col ${formClassName}`}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        {/* Step Indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Title */}
        <div className="mb-8 text-center">
          <h2 className="mb-2 font-black text-white text-xl sm:text-2xl uppercase italic tracking-tighter">
            {isEmailStep && "PHASE 1: VERIFICATION"}
            {isLocationStep && "PHASE 2: SECTOR DATA"}
            {isMapStep && "PHASE 3: GEOSPATIAL PIN"}
            {isAccountStep && "PHASE 4: ACCESS CODE"}
          </h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
            {isEmailStep && "SECURE CHANNEL VERIFICATION REQUIRED VIA EMAIL"}
            {isLocationStep && "SPECIFY GEOGRAPHIC JURISDICTION AND SECTOR"}
            {isMapStep && "PINPOINT COMMAND CENTER COORDINATES"}
            {isAccountStep && "ESTABLISH FINAL ACCESS CREDENTIALS"}
          </p>
        </div>

        <div className="space-y-4">

          {/* ═══════ STEP 1: Email Verification ═══════ */}
          {isEmailStep && (
            <div className="animate-fade-in space-y-5">
              {showPrivacy && <PrivacyBanner onDismiss={() => setShowPrivacy(false)} />}

              {!codeSent ? (
                <>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">
                      EMAIL COORDINATES <span className="text-brand-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="4" width="20" height="16" rx="3" />
                          <path d="M2 7l10 6 10-6" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="IDENTIFY@CHANNEL.COM"
                        className="h-12 w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:border-brand-500/50 focus:ring-brand-500/10 transition-all uppercase font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || !form.email}
                      className="px-8 py-3 rounded-xl border border-brand-500/30 text-[10px] font-black text-brand-500 hover:bg-brand-500/10 transition-all disabled:opacity-30 tracking-widest uppercase"
                    >
                      {sendingCode ? "TRANSMITTING..." : "GENERATE ACCESS CODE"}
                    </button>
                  </div>
                </>
              ) : !emailVerified ? (
                <>
                  {/* Email display card */}
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white tracking-widest uppercase">{form.email}</p>
                      <p className="text-[10px] text-brand-500/60 font-bold uppercase tracking-widest mt-1">PENDING VERIFICATION</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCodeSent(false); setCodeDigits(["","","","","",""]); }}
                      className="text-gray-500 hover:text-white transition-colors p-2"
                    >
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 013.536 3.536L12.535 14.57a2 2 0 01-.878.506l-3.29.914.914-3.29a2 2 0 01.506-.878L9 11z" />
                      </svg>
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 block text-center">
                      INSERT ACCESS KEY
                    </label>
                    <div className="flex gap-2 justify-center mb-6">
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={el => { codeRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={e => handleCodeInput(i, e.target.value)}
                          onKeyDown={e => handleCodeKeyDown(i, e)}
                          className="w-11 h-14 text-center text-xl font-black rounded-xl bg-white/5 border border-white/10 text-brand-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={cooldown > 0 || sendingCode}
                      className="w-full text-center text-[10px] font-black text-gray-500 hover:text-brand-500 disabled:text-gray-700 transition-colors uppercase tracking-[0.2em]"
                    >
                      {cooldown > 0 ? `RE-TRANSMIT IN ${cooldown}S` : "REQUEST NEW KEY"}
                    </button>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifying || codeDigits.join("").length < 6}
                      className="w-full h-12 rounded-xl bg-brand-500 text-black text-xs font-black uppercase tracking-widest hover:bg-brand-600 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,178,53,0.2)]"
                    >
                      {verifying ? "VALIDATING..." : "VALIDATE CLEARANCE"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ═══════ STEP 2: Location Details ═══════ */}
          {isLocationStep && (
            <div className="animate-fade-in space-y-5">
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">BARANGAY UNIT</label>
                  <select name="barangay" value={form.barangay} onChange={handleChange} required
                    className="h-12 w-full bg-white/5 border border-white/10 rounded-xl px-3 text-white text-sm focus:border-brand-500/50 focus:ring-brand-500/10 transition-all">
                    <option value="" className="bg-[#0C0B0A]">SELECT UNIT</option>
                    {barangays.map(b => <option key={b} value={b} className="bg-[#0C0B0A]">{b.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">CITY</label>
                  <select name="city" value={form.city} onChange={handleChange} required
                    className="h-12 w-full bg-white/5 border border-white/10 rounded-xl px-3 text-white text-sm focus:border-brand-500/50 focus:ring-brand-500/10 transition-all">
                    <option value="" className="bg-[#0C0B0A]">SELECT CITY</option>
                    {cities.map(c => <option key={c} value={c} className="bg-[#0C0B0A]">{c.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">PROVINCE</label>
                <input value={form.province} disabled className="h-12 w-full bg-white/5 border border-white/5 rounded-xl px-4 text-sm text-gray-500 font-bold uppercase tracking-widest" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={handleBack}
                  className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  PREVIOUS
                </button>
                <button type="button" onClick={handleNextFromLocation}
                  className="flex-1 py-3 rounded-xl bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-[0_0_20px_rgba(245,178,53,0.2)]">
                  CONTINUE
                </button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 3 (brgy only): Map Pin ═══════ */}
          {isMapStep && (
            <div className="animate-fade-in space-y-5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] block">PIN BRGY HALL COORDINATES</label>
              <div className="h-64 w-full rounded-xl border border-white/10 overflow-hidden relative z-0 grayscale invert contrast-125 brightness-75">
                <MapContainer center={[14.28, 121.42]} zoom={13} minZoom={12} maxBounds={SANTA_CRUZ_BOUNDS} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <LocationPicker position={location} setPosition={setLocation} />
                </MapContainer>
              </div>
              <div className="flex gap-4 pt-1">
                <button type="button" onClick={handleBack}
                  className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  PREVIOUS
                </button>
                <button type="button" onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-3 rounded-xl bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all shadow-[0_0_20px_rgba(245,178,53,0.2)]">
                  LOCK LOCATION
                </button>
              </div>
            </div>
          )}

          {/* ═══════ FINAL STEP: Account Info ═══════ */}
          {isAccountStep && (
            <div className="animate-fade-in space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">IDENTIFICATION (FULL NAME)</label>
                <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="ENTER FULL NAME" className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">TACTICAL USERNAME</label>
                <Input name="username" value={form.username} onChange={handleChange} placeholder="ASSIGN USERNAME" className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">CONTACT INTEL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><EnvelopeIcon className="w-5 h-5" /></span>
                  <Input name="contact" value={form.contact} onChange={handleChange} placeholder="09XX XXX XXXX" className="h-12 pl-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">SECRET KEY</label>
                  <Input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 rounded-xl" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">CONFIRM KEY</label>
                  <Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-brand-500/50 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={handleBack}
                  className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                  PREVIOUS
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-brand-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(245,178,53,0.2)]">
                  {loading ? "PROCESSING..." : "FINALIZE REGISTRATION"}
                </button>
              </div>
            </div>
          )}

          {error && <div className="text-error-500 text-sm mt-2 text-center">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2 text-center">{success}</div>}
        </div>
      </form>
    </>
  );
};

export default BrgyRegisterForm;
