import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import { useState } from "react";

export default function ForgotPassword() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);
    // Simulate API call (replace with real backend call)
    setTimeout(() => {
      setLoading(false);
      if (input.match(/@/) || input.match(/^09\d{9}$/)) {
        setSuccess("If an account with that email or phone exists, a recovery link/code has been sent.");
      } else {
        setError("Please enter a valid email or phone number.");
      }
    }, 1200);
  };

  return (
    <>
      <PageMeta
        title="Forgot Password | Eligtasmo"
        description="Reset your barangay account password via email or phone."
      />
      <div className="w-full max-w-lg mx-auto py-12">
        <div className="bg-[#0C0B0A]/80 backdrop-blur-xl border border-white/5 p-8 sm:p-10 rounded-2xl shadow-2xl">
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">
              RECOVER ACCESS
            </h1>
            <p className="text-sm text-gray-500 font-medium border-l-2 border-brand-500 pl-3">
              FORGOT PASSWORD? ENTER COORDINATES (EMAIL/PHONE) TO INITIATE RESET.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                EMAIL OR PHONE <span className="text-brand-500">*</span>
              </label>
              <input
                type="text"
                name="recovery"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. brgy@email.com"
                className="h-12 w-full bg-white/5 border border-white/10 rounded-lg px-4 text-sm text-white placeholder:text-white/20 focus:border-brand-500/50 focus:ring-brand-500/10 transition-all"
                required
              />
            </div>
            {error && <div className="text-error-500 text-[11px] font-bold uppercase tracking-wider">{error}</div>}
            {success && <div className="text-green-500 text-[11px] font-bold uppercase tracking-wider">{success}</div>}
            
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-black font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(245,178,53,0.2)] rounded-lg transition-all disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "INITIATING..." : "SEND RECOVERY INTEL"}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">REMEMBERED?</span>
            <Link to="/auth/signin" className="text-[10px] font-black text-white hover:text-brand-500 uppercase tracking-widest transition-colors">
              BACK TO LOGIN
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 