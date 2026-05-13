import PageMeta from "../../components/common/PageMeta";
import { useState } from "react";
import { Link } from "react-router-dom";

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
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      if (input.match(/@/) || input.match(/^09\d{9}$/)) {
        setSuccess("If an account exists, a recovery link has been sent.");
      } else {
        setError("Please enter a valid email or phone number.");
      }
    }, 1200);
  };

  return (
    <>
      <PageMeta
        title="Forgot Password | E-LigtasMo"
        description="Reset your account password via email or phone."
      />
      <div className="flex flex-col w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-lg shadow-sm">E</div>
        </div>

        <p className="text-[13px] text-[var(--color-muted)] mb-8 font-sans">
          Reset your tactical access.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Email or Phone
            </label>
            <input
              required
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. juan@example.com"
              className="w-full px-3.5 py-3 rounded-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-brand-500 transition-all font-sans"
            />
          </div>

          {error && <p className="text-[11px] font-bold text-red-500 text-center animate-fade-in">{error}</p>}
          {success && <p className="text-[11px] font-bold text-brand-600 text-center animate-fade-in">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Sending..." : "Send recovery link →"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/auth/signin" className="text-[12px] text-[var(--color-muted)] hover:text-brand-500 transition-colors uppercase tracking-[0.1em] font-bold">
            ← Back to login
          </Link>
        </div>
      </div>
    </>
  );
} 