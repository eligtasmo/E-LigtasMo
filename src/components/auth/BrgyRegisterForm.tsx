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

import { DEFAULT_MAP_STATE, SANTA_CRUZ_BOUNDS_LEAFLET } from '../../constants/geo';
import { apiFetch } from '../../utils/api';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});


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
  <div className="flex items-center justify-center gap-0 mb-6">
    {Array.from({ length: total }).map((_, i) => {
      const stepNum = i + 1;
      const isActive = stepNum === current;
      const isDone = stepNum < current;
      return (
        <React.Fragment key={i}>
          <div
            className={`w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${
              isActive ? 'bg-blue-600 scale-125 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]'
              : isDone ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
          {i < total - 1 && (
            <div className={`w-12 h-0.5 transition-colors duration-300 ${isDone ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* ── Privacy Banner ── */
const PrivacyBanner = ({ onDismiss }: { onDismiss: () => void }) => (
  <div className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 mb-6 relative">
    <div className="mt-0.5 text-gray-400 flex-shrink-0">
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 118 0v4" />
      </svg>
    </div>
    <p className="text-xs text-gray-500 leading-relaxed pr-4">
      We take privacy issues seriously. You can be sure that your personal data is securely protected.
    </p>
    <button onClick={onDismiss} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors" type="button">
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

  // Email verification state
  const [codeSent, setCodeSent] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [dynamicBrgys, setDynamicBrgys] = useState<string[]>([]);

  // Fetch barangays and validate token if present
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
            // If email is already provided and verified via invite, we could skip step 1
            // but the user wants the "exact same flow", so we keep it.
          }
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };
    init();
  }, [token]);

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
    if (!form.brgy) { setError("Please select a Barangay."); return; }
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
      const endpoint = token ? `/api/register-from-invite.php?_t=${Date.now()}` : `/api/register.php?_t=${Date.now()}`;
      
      // Robust name splitting: try comma first, then space, then fallback to whole string as first name
      let fname = form.fullName;
      let lname = "";
      if (form.fullName.includes(',')) {
        [fname, lname] = form.fullName.split(',').map(s => s.trim());
      } else if (form.fullName.includes(' ')) {
        const parts = form.fullName.trim().split(/\s+/);
        lname = parts.pop() || "";
        fname = parts.join(' ');
      }

      const finalPayload = token ? {
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
      } : payload;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
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
        className={`w-full max-w-md mx-auto bg-white flex flex-col ${formClassName}`}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        {/* Step Indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} />

        {/* Title */}
        <div className="mb-5 sm:mb-6 text-center">
          <h1 className="mb-2 font-bold text-gray-800 text-xl sm:text-2xl dark:text-white/90">
            Registration
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-400 leading-relaxed">
            {isEmailStep && "Fill in the registration data. It will take a couple of minutes. All you need is your e-mail."}
            {isLocationStep && "Select your brgy and location details."}
            {isMapStep && "Pin the exact location of your Barangay Hall on the map."}
            {isAccountStep && "Create your account credentials."}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter your email address
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
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
                        placeholder="name@example.com"
                        className="h-12 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || !form.email}
                      className="px-8 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {sendingCode ? "Sending..." : "Send Code"}
                    </button>
                  </div>
                </>
              ) : !emailVerified ? (
                <>
                  {/* Email display card */}
                  <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-800">{form.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Email not confirmed yet</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCodeSent(false); setCodeDigits(["","","","","",""]); }}
                      className="text-gray-300 hover:text-blue-500 transition-colors"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 013.536 3.536L12.535 14.57a2 2 0 01-.878.506l-3.29.914.914-3.29a2 2 0 01.506-.878L9 11z" />
                      </svg>
                    </button>
                  </div>

                  {/* Email display & resend */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                      <span className="text-gray-300">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="4" width="20" height="16" rx="3" />
                          <path d="M2 7l10 6 10-6" />
                        </svg>
                      </span>
                      <span className="text-sm text-gray-400">{form.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={cooldown > 0 || sendingCode}
                      className="text-blue-600 text-xs font-semibold mt-2 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {cooldown > 0 ? `Send again (${cooldown}s)` : "Send again"}
                    </button>
                  </div>

                  {/* Code input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Confirmation code</label>
                    <div className="flex gap-2.5 justify-center mb-3">
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
                          className="w-11 h-12 text-center text-lg font-semibold rounded-xl border-2 border-gray-200 text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      Confirm your e-mail with the verification code we sent.
                    </p>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifying || codeDigits.join("").length < 6}
                      className="flex items-center gap-2 px-10 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      {verifying ? "Verifying..." : "Confirm"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ═══════ STEP 2: Location Details ═══════ */}
          {isLocationStep && (
            <div className="animate-fade-in space-y-4">
              <div className="flex gap-2">
                <div className="w-1/2">
                  <Label>Barangay <span className="text-error-500">*</span></Label>
                  <select name="brgy" value={form.brgy} onChange={handleChange} required
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                    <option value="">Select Barangay</option>
                    {(dynamicBrgys.length > 0 ? dynamicBrgys : brgys).map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="w-1/2">
                  <Label>City/Municipality <span className="text-error-500">*</span></Label>
                  <select name="city" value={form.city} onChange={handleChange} required
                    className="h-11 w-full rounded-xl border border-gray-200 px-3 py-2 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all">
                    <option value="">Select City</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <Label>Province</Label>
                <Input name="province" value={form.province} disabled className="bg-gray-50 rounded-xl" />
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={handleBack}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 border-2 border-gray-200 rounded-xl hover:border-gray-300 text-gray-600 text-sm font-medium transition-all">
                  <ChevronLeftIcon className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={handleNextFromLocation}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* ═══════ STEP 3 (brgy only): Map Pin ═══════ */}
          {isMapStep && (
            <div className="animate-fade-in space-y-4">
              <Label>Pin Barangay Hall Location <span className="text-gray-400 font-normal text-sm ml-1">(Optional)</span></Label>
              <div className="h-64 w-full rounded-xl border overflow-hidden relative z-0">
                <MapContainer 
                  center={[DEFAULT_MAP_STATE.latitude, DEFAULT_MAP_STATE.longitude]} 
                  zoom={DEFAULT_MAP_STATE.zoom} 
                  minZoom={DEFAULT_MAP_STATE.minZoom} 
                  maxBounds={SANTA_CRUZ_BOUNDS_LEAFLET} 
                  attributionControl={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker position={location} setPosition={setLocation} />
                </MapContainer>
              </div>
              <p className="text-xs text-gray-400">Click on the map to pin the exact location.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleBack}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 border-2 border-gray-200 rounded-xl hover:border-gray-300 text-gray-600 text-sm font-medium transition-all">
                  <ChevronLeftIcon className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={() => setStep(s => s + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* ═══════ FINAL STEP: Account Info ═══════ */}
          {isAccountStep && (
            <div className="animate-fade-in space-y-4">
              <div>
                <Label>Full Name {mode === 'brgy' && "(Brgy Official)"} <span className="text-error-500">*</span></Label>
                <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder={mode === 'brgy' ? "Full Name (Brgy Official)" : "Full Name"} className="rounded-xl" />
              </div>
              <div>
                <Label>Username <span className="text-error-500">*</span></Label>
                <Input name="username" value={form.username} onChange={handleChange} placeholder="Username" className="rounded-xl" />
              </div>
              <div>
                <Label>Contact Number <span className="text-error-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><EnvelopeIcon className="w-5 h-5" /></span>
                  <Input name="contact" value={form.contact} onChange={handleChange} placeholder="e.g. 0917 123 4567" className="pl-10 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-1/2">
                  <Label>Password <span className="text-error-500">*</span></Label>
                  <Input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" className="rounded-xl" />
                </div>
                <div className="w-1/2">
                  <Label>Confirm Password <span className="text-error-500">*</span></Label>
                  <Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm" className="rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleBack}
                  className="flex items-center justify-center gap-1.5 px-5 py-2.5 border-2 border-gray-200 rounded-xl hover:border-gray-300 text-gray-600 text-sm font-medium transition-all">
                  <ChevronLeftIcon className="w-4 h-4" /> Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20">
                  {loading ? "Registering..." : (mode === 'brgy' ? "Register Barangay" : "Register Resident")}
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
