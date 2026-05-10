import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FiShield, FiUser, FiLock, FiCheckCircle, FiAlertCircle, FiArrowRight, FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { apiFetch } from "../../utils/api";
import PageMeta from "../../components/common/PageMeta";
import { toast } from "react-hot-toast";

export default function RegisterOfficial() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [brgys, setBrgys] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    brgy_name: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    fetchBrgys();
    if (!token) {
      setError("No invitation token found. Please contact your administrator.");
      setLoading(false);
      return;
    }
    validateInvite();
  }, [token]);

  const fetchBrgys = async () => {
    try {
      const res = await apiFetch("list-barangays.php");
      const data = await res.json();
      if (data.success) {
        setBrgys(data.barangays.map((b: any) => b.name));
      }
    } catch {}
  };

  const validateInvite = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`validate-invite.php?token=${token}`);
      const data = await res.json();
      if (data.success) {
        setInvite(data.invite);
        // Pre-fill if invite has data
        setFormData(prev => ({
          ...prev,
          first_name: data.invite.first_name || "",
          last_name: data.invite.last_name || "",
          email: data.invite.email || "",
          contact_number: data.invite.contact_number || "",
          brgy_name: data.invite.brgy_name || ""
        }));
      } else {
        setError(data.message || "Invalid or expired invitation.");
      }
    } catch {
      setError("Comms failure. Please check your connection.");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 10) {
        toast.error("Password must be at least 10 characters");
        return;
    }

    setValidating(true);
    try {
      const res = await apiFetch("register-from-invite.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...formData
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Account claimed successfully!");
        navigate("/auth/signin");
      } else {
        toast.error(data.message || "Failed to create account");
      }
    } catch {
      toast.error("Server error during registration");
    }
    setValidating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isGeneric = !invite.first_name || !invite.brgy_name;

  return (
    <>
      <PageMeta title="Claim Official Account | E-LigtasMo" />
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-outfit py-12">
        <div className="w-full max-w-md">
          {error ? (
            <div className="bg-white rounded-[32px] p-10 shadow-2xl text-center border border-red-100">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Invalid Mission Link</h2>
              <p className="text-slate-500 mb-8 text-sm">{error}</p>
              <Link to="/auth/signin" className="block w-full py-4 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
                Back to Command Center
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <FiShield size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Claim Account</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Official Personnel Activation</p>
                </div>
              </div>

              {!isGeneric && (
                <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                      <FiCheckCircle />
                    </div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Identity Verified</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-black text-slate-900">{invite.first_name}, {invite.last_name}</p>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">BARANGAY {invite.brgy_name}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {isGeneric && (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">01. Personal Identity</span>
                      <div className="h-px flex-1 bg-slate-100"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">First Name</label>
                        <input 
                          required
                          className="w-full h-11 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={formData.first_name}
                          onChange={e => setFormData({...formData, first_name: e.target.value})}
                          placeholder="Juan"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Last Name</label>
                        <input 
                          required
                          className="w-full h-11 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={formData.last_name}
                          onChange={e => setFormData({...formData, last_name: e.target.value})}
                          placeholder="Dela Cruz"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
                        <input 
                          required
                          type="email"
                          className="w-full h-11 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="official@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Phone</label>
                        <input 
                          required
                          className="w-full h-11 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          value={formData.contact_number}
                          onChange={e => setFormData({...formData, contact_number: e.target.value})}
                          placeholder="09XXXXXXXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Barangay Assignment</label>
                      <select 
                        required
                        className="w-full h-11 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                        value={formData.brgy_name}
                        onChange={e => setFormData({...formData, brgy_name: e.target.value})}
                      >
                        <option value="">Select Barangay...</option>
                        {brgys.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 mb-1 pt-2">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">02. System Access</span>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Username</label>
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      required
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      placeholder="Official Username"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Password</label>
                    <input 
                      required
                      type="password"
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="Min. 10 chars"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Confirm</label>
                    <input 
                      required
                      type="password"
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl px-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Re-type"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={validating}
                  className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
                >
                  {validating ? "Processing..." : (
                    <>
                      Activate Official Account <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Official registration requires <br/> administrator situational approval.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
