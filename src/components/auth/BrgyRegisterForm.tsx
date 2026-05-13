import React, { useState, useRef, useEffect } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { ChevronLeftIcon } from '../../icons';
import { FiShield } from "react-icons/fi";
import Map, { NavigationControl, GeolocateControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import TacticalMarker from '../maps/TacticalMarker';

import { DEFAULT_MAP_STATE } from '../../constants/geo';
import { apiFetch } from '../../utils/api';

const brgys = [
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
  token?: string | null;
}

const MapPicker = ({ location }: { location: { lat: number, lng: number } | null, setLocation: (pos: { lat: number, lng: number }) => void }) => {
  return (
    <>
      <GeolocateControl position="top-right" />
      <NavigationControl position="top-right" />
      {location && (
        <TacticalMarker 
          latitude={location.lat} 
          longitude={location.lng} 
          type="brgy" 
          label="Barangay Hall"
        />
      )}
    </>
  );
};

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2 mb-10">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 rounded-full transition-all duration-500 ${
          i + 1 === current 
            ? 'w-8 bg-brand-500' 
            : i + 1 < current 
              ? 'w-4 bg-brand-500/40' 
              : 'w-4 bg-foreground/5 dark:bg-white/5'
        }`}
      />
    ))}
  </div>
);

const PrivacyBanner = ({ onDismiss }: { onDismiss: () => void }) => (
  <div className="flex items-start gap-4 bg-brand-500/5 border border-brand-500/10 rounded-2xl px-5 py-4 mb-8 relative group animate-fade-in transition-colors">
    <div className="mt-0.5 text-brand-500 flex-shrink-0">
      <FiShield size={18} />
    </div>
    <p className="text-[13px] text-foreground/50 font-bold leading-relaxed pr-6">
      Your personal data is encrypted and securely protected within the municipal command network.
    </p>
    <button onClick={onDismiss} className="absolute top-4 right-4 text-foreground/10 hover:text-brand-500 transition-colors" type="button">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
);

const BrgyRegisterForm = (props: BrgyRegisterFormProps) => {
  const { onSuccess, formClassName = "space-y-6", mode = 'brgy', token } = props;
  const TOTAL_STEPS = mode === 'brgy' ? 4 : 3;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    brgy: "",
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

  const [codeSent, setCodeSent] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [dynamicBrgys, setDynamicBrgys] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const brgyRes = await apiFetch("list-barangays.php");
        const brgyData = await brgyRes.json();
        if (brgyData.success) {
          const names = brgyData.barangays.map((b: any) => b.name);
          setDynamicBrgys(names);
        }

        if (token) {
          const inviteRes = await apiFetch(`validate-invite.php?token=${token}`);
          const inviteData = await inviteRes.json();
          if (inviteData.success) {
            const { first_name, last_name, email, contact_number, brgy_name } = inviteData.invite;
            setForm(prev => ({
              ...prev,
              fullName: (first_name && last_name) ? `${first_name}, ${last_name}` : "",
              email: email || "",
              contact: contact_number || "",
              brgy: brgy_name || "",
            }));
          }
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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

  const handleNextFromLocation = () => {
    setError("");
    if (!form.brgy) { setError("Please select a Barangay."); return; }
    if (!form.city) { setError("Please select a City/Municipality."); return; }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(s => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.fullName || !form.username || !form.email || !form.contact || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(form.fullName)) {
      setError("Name must only contain letters and spaces.");
      return;
    }

    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(form.contact)) {
      setError("Contact number must be exactly 11 digits and start with 09.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    let fname = form.fullName;
    let lname = "";
    if (form.fullName.includes(',')) {
      [fname, lname] = form.fullName.split(',').map(s => s.trim());
    } else if (form.fullName.includes(' ')) {
      const parts = form.fullName.trim().split(/\s+/);
      lname = parts.pop() || "";
      fname = parts.join(' ');
    }

    const payload = token ? {
      token,
      username: form.username,
      password: form.password,
      first_name: fname,
      last_name: lname,
      email: form.email,
      contact_number: form.contact,
      brgy_name: form.brgy,
      city: form.city,
      province: form.province
    } : {
      username: form.username,
      password: form.password,
      full_name: form.fullName,
      brgy_name: mode === 'brgy' ? form.brgy : (form.brgy || ''),
      city: mode === 'brgy' ? form.city : (form.city || ''),
      province: mode === 'brgy' ? form.province : (form.province || ''),
      email: form.email,
      contact_number: form.contact,
      role: mode === 'brgy' ? 'brgy' : 'resident',
      lat: location?.lat,
      lng: location?.lng
    };

    try {
      const endpoint = token ? "/api/register-from-invite.php" : "/api/register.php";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      const data = await response.json();
      setLoading(false);
      if (data.success) {
        setSuccess((mode === 'brgy' && !token) ? "Registration successful. Please wait for approval from MDRRMO." : "Registration successful! You can now sign in.");
        if (onSuccess) onSuccess();
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      setLoading(false);
      setError("Server error. Please try again later.");
    }
  };

  const isEmailStep = step === 1;
  const isLocationStep = step === 2;
  const isMapStep = mode === 'brgy' && step === 3;
  const isAccountStep = step === TOTAL_STEPS;

  return (
    <div className="flex flex-col w-full">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-lg shadow-sm">E</div>
      </div>

      <p className="text-[13px] text-[var(--color-muted)] mb-5 font-sans">
        Join the network — secure your community.
      </p>

      {/* Tab Switcher */}
      <div className="flex border border-[var(--color-border)] rounded-[12px] overflow-hidden mb-8">
        <Link 
          to="/auth/signin" 
          className="flex-1 py-2.5 text-[13px] font-medium text-[var(--color-muted)] text-center hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          Log in
        </Link>
        <div className="flex-1 py-2.5 text-[13px] font-medium bg-[var(--color-fuel)] text-[var(--color-on-fuel)] text-center cursor-default">
          Sign up
        </div>
      </div>

      <StepIndicator current={step} total={TOTAL_STEPS} />

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
        {/* Step 1: Email */}
        {isEmailStep && (
          <div className="animate-fade-in space-y-8">
            {showPrivacy && <PrivacyBanner onDismiss={() => setShowPrivacy(false)} />}
            {!codeSent ? (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] px-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-3 rounded-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-brand-500 transition-all font-sans"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || !form.email}
                  className="w-full py-3.5 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {sendingCode ? "Sending Code..." : "Continue with Email →"}
                </button>
              </>
            ) : !emailVerified ? (
              <div className="space-y-8">
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground/40 mb-8 leading-relaxed">
                    Enter the code sent to <br />
                    <span className="text-foreground font-black">{form.email}</span>
                  </p>
                  <div className="flex gap-2.5 justify-center mb-8">
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
                        className="w-12 h-14 text-center text-xl font-black rounded-2xl border border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/5 text-foreground focus:outline-none focus:border-brand-500 transition-all"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={cooldown > 0 || sendingCode}
                    className="text-[11px] font-black text-brand-500 hover:text-brand-600 uppercase tracking-widest transition-colors"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || codeDigits.join("").length < 6}
                  className="w-full py-3.5 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {verifying ? "Verifying..." : "Verify Code →"}
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 2: Location */}
        {isLocationStep && (
          <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Barangay</label>
                <select 
                  name="brgy" 
                  value={form.brgy} 
                  onChange={handleChange} 
                  required
                  className="input-field font-bold text-sm h-[46px] appearance-none"
                >
                  <option value="">Select</option>
                  {(dynamicBrgys.length > 0 ? dynamicBrgys : brgys).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">City</label>
                <select 
                  name="city" 
                  value={form.city} 
                  onChange={handleChange} 
                  required
                  className="input-field font-bold text-sm h-[46px] appearance-none"
                >
                  <option value="">Select</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Province</label>
              <input name="province" value={form.province} disabled className="input-field font-bold text-sm opacity-50" />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={handleBack} className="w-1/3 py-3 rounded-[12px] text-sm font-bold border border-[var(--color-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                Back
              </button>
              <button type="button" onClick={handleNextFromLocation} className="flex-1 py-3 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 (brgy only): Map Pin */}
        {isMapStep && (
          <div className="animate-fade-in space-y-6 text-center">
            <p className="text-sm font-bold text-foreground/40 mb-8">Pin the exact location of your Barangay Hall.</p>
            <div className="h-64 w-full rounded-[32px] border border-gray-200 dark:border-white/5 overflow-hidden relative shadow-sm">
              <Map
                initialViewState={{
                  latitude: DEFAULT_MAP_STATE.latitude,
                  longitude: DEFAULT_MAP_STATE.longitude,
                  zoom: DEFAULT_MAP_STATE.zoom
                }}
                mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                mapStyle={document.documentElement.classList.contains('dark') ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => setLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
                maxBounds={DEFAULT_MAP_STATE.maxBounds}
              >
                <MapPicker location={location} setLocation={setLocation} />
              </Map>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={handleBack} className="w-1/3 py-3 rounded-[12px] text-sm font-bold border border-[var(--color-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                Back
              </button>
              <button type="button" onClick={() => setStep(s => s + 1)} className="flex-1 py-3 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Final Step: Account */}
        {isAccountStep && (
          <div className="animate-fade-in space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="John Doe" className="input-field font-bold text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Username</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="jdoe24" className="input-field font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Contact</label>
                <input name="contact" value={form.contact} onChange={handleChange} placeholder="0917..." className="input-field font-bold text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" className="input-field font-bold text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30 px-1">Confirm</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className="input-field font-bold text-sm" />
              </div>
            </div>
            
            <div className="flex gap-4 pt-6 border-t border-[var(--color-border)]">
              <button type="button" onClick={handleBack} className="w-1/3 py-3 rounded-[12px] text-sm font-bold border border-[var(--color-border)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                Back
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                {loading ? "Processing..." : (mode === 'brgy' ? "Register Official →" : "Complete Registration →")}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-center text-[12px] font-bold text-red-500 animate-fade-in bg-red-50 dark:bg-red-950/20 py-3 rounded-lg border border-red-100 dark:border-red-900/30">{error}</p>}
        {success && <p className="text-center text-[12px] font-bold text-brand-600 animate-fade-in bg-brand-50 dark:bg-brand-950/20 py-3 rounded-lg border border-brand-100 dark:border-brand-900/30">{success}</p>}
      </form>
    </div>
  );
};

export default BrgyRegisterForm;
