import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { FiShield, FiUser, FiLock, FiCheckCircle, FiAlertCircle, FiArrowRight } from "react-icons/fi";
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
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (!token) {
      setError("No invitation token found. Please contact your administrator.");
      setLoading(false);
      return;
    }
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`validate-invite.php?token=${token}`);
      const data = await res.json();
      if (data.success) {
        setInvite(data.invite);
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
          username: formData.username,
          password: formData.password
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

  return (
    <>
      <PageMeta title="Claim Official Account | E-LigtasMo" />
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-outfit">
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
            <div className="bg-white rounded-[32px] p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <FiShield size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Claim Account</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Official Personnel Activation</p>
                </div>
              </div>

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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Set Username</label>
                  <div className="relative">
                    <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      required
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                      placeholder="e.g. brgy_official_01"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Set Private Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      required
                      type="password"
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="Min. 10 characters"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Confirm Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      required
                      type="password"
                      className="w-full h-12 bg-slate-50 border-slate-200 rounded-2xl pl-11 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      placeholder="Re-type password"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={validating}
                  className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {validating ? "Processing..." : (
                    <>
                      Activate Account <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                By activating, you agree to follow strict <br/> operational confidentiality protocols.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
