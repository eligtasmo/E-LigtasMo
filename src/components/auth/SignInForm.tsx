import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-lg shadow-sm">E</div>
      </div>

      <p className="text-[13px] text-[var(--color-muted)] mb-5 font-sans">
        Welcome back — log in to access the tactical map.
      </p>

      {/* Tab Switcher */}
      <div className="flex border border-[var(--color-border)] rounded-[12px] overflow-hidden mb-5">
        <div className="flex-1 py-2.5 text-[13px] font-medium bg-[var(--color-fuel)] text-[var(--color-on-fuel)] text-center cursor-default">
          Log in
        </div>
        <Link 
          to="/auth/register" 
          className="flex-1 py-2.5 text-[13px] font-medium text-[var(--color-muted)] text-center hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          Sign up
        </Link>
      </div>

      {/* Google Button */}
      <button 
        type="button"
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] font-semibold text-sm mb-5 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-[0.98]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5 text-[11px] text-[var(--color-muted)] font-bold uppercase tracking-[0.08em]">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        or email
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Email or Username
          </label>
          <input
            required
            type="text"
            placeholder="juan@example.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3.5 py-3 rounded-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-brand-500 transition-all font-sans"
          />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Password
            </label>
            <Link to="/auth/forgot-password" size="sm" className="text-[11px] text-[var(--color-muted)] hover:text-brand-500 transition-colors">
              Forgot?
            </Link>
          </div>
          <input
            required
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-3 rounded-[12px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm focus:outline-none focus:border-brand-500 transition-all font-sans"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3.5 mt-1 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {loading ? "Authenticating..." : "Log in to E-LigtasMo →"}
        </button>
      </form>
      
      <p className="text-center text-[12px] text-[var(--color-muted)] mt-4.5 font-sans">
        No account? <Link to="/auth/register" className="text-[var(--color-fuel)] underline">Sign up free</Link>
      </p>
    </div>
  );
}
