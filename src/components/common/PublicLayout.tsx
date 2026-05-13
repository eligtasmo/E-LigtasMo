import { Link, useLocation, Outlet } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

export default function PublicLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isSignIn = location.pathname === "/auth/signin" || location.pathname === "/login";

  return (
    <div className="min-h-screen selection:bg-brand-500 selection:text-white overflow-x-hidden flex flex-col transition-colors duration-300 bg-[var(--color-bg)] relative">
      {/* Shared Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="grid-background" />
        
        {/* Animated Blobs */}
        <div 
          className="absolute w-[580px] h-[580px] rounded-full top-[-130px] left-[-130px] opacity-30 blur-[70px] mix-blend-multiply dark:mix-blend-screen"
          style={{ 
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-fuel) 30%, transparent) 0%, transparent 72%)',
            animation: '9s ease-in-out infinite float1'
          }}
        />
        <div 
          className="absolute w-[460px] h-[460px] rounded-full bottom-[-90px] right-[-90px] opacity-24 blur-[70px] mix-blend-multiply dark:mix-blend-screen"
          style={{ 
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-fuel) 24%, transparent) 0%, transparent 72%)',
            animation: '12s ease-in-out infinite float2'
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-[520px] h-[520px] rounded-full -translate-x-1/2 -translate-y-1/2 blur-[78px]"
          style={{ 
            background: 'radial-gradient(circle, color-mix(in srgb, var(--color-fuel) 20%, transparent) 0%, transparent 70%)',
            animation: '8s ease-in-out infinite auraPulse'
          }}
        />

        {/* Grain/Noise Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* Navigation - Shared Header */}
      <header className="nav-header">
        <Link aria-label="Go to home" to="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <div className="w-8 h-8 bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-xl shadow-sm">E</div>
          <span className="font-extrabold text-lg tracking-tighter text-[var(--color-text)] hidden sm:block font-cabinet">E-LigtasMo</span>
        </Link>

        <div className="flex items-center gap-[6px] flex-shrink-0 ml-auto">
          <button 
            type="button" 
            aria-label="Switch theme" 
            onClick={toggleTheme}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] color-[var(--color-text)] w-[36px] h-[36px] p-0 inline-flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8"></circle>
                <path d="M12 2.5V5.2M12 18.8V21.5M21.5 12H18.8M5.2 12H2.5M18.7 5.3L16.8 7.2M7.2 16.8L5.3 18.7M18.7 18.7L16.8 16.8M7.2 7.2L5.3 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"></path>
              </svg>
            )}
          </button>
          <Link 
            to={isSignIn ? "/auth/register" : "/auth/signin"} 
            className="text-[13px] font-medium text-[var(--color-muted)] px-[10px] py-2 rounded-[8px] hover:bg-black/5 dark:hover:bg-white/5 transition-all font-satoshi"
          >
            {isSignIn ? "Sign up" : "Log in"}
          </Link>
          <Link to={isSignIn ? "/auth/register" : "/auth/signin"}>
            <span className="inline-block text-[13px] font-semibold bg-[var(--color-fuel)] text-[var(--color-on-fuel)] px-[14px] py-[9px] rounded-[9px] font-satoshi hover:opacity-90 active:scale-95 transition-all">
              {isSignIn ? "Register" : "Sign in"}
            </span>
          </Link>
        </div>
      </header>

      {/* Dynamic Content */}
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>

      {/* Shared Footer */}
      <footer className="relative z-10 w-full border-t border-[var(--color-border)] px-[48px] py-[32px] pb-[16px] max-w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-left">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-2xl shadow-sm">E</div>
            <span className="font-extrabold text-xl tracking-tighter text-[var(--color-text)] ml-2 font-cabinet">E-LigtasMo</span>
          </div>

          <div className="flex gap-[26px] flex-wrap justify-center">
            {['About', 'Blog', 'API', 'Privacy', 'Terms'].map(link => (
              <a 
                key={link} 
                href="#" 
                className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors no-underline font-satoshi"
              >
                {link}
              </a>
            ))}
          </div>

          <span className="text-[11px] text-[var(--color-muted)] font-satoshi">
            © 2026 E-LigtasMo. All rights reserved.
          </span>
        </div>
        
        <div className="mt-[10px] text-center text-[11px] text-[var(--color-muted)] font-satoshi">
          <a 
            href="https://www.facebook.com/andrewemmanuel.robles/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-inherit no-underline hover:text-brand-500 transition-colors"
          >
            Developed by Andrew Emmanuel Robles
          </a>
        </div>
      </footer>
    </div>
  );
}
