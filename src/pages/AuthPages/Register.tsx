// src/pages/auth/BrgySignIn.tsx

import PageMeta from "../../components/common/PageMeta";
import BrgyRegisterForm from "../../components/auth/BrgyRegisterForm";
import { Link, useLocation } from "react-router-dom";

export default function BrgySignUp() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const modeParam = (params.get('mode') || 'brgy').toLowerCase();
  const mode = modeParam === 'resident' ? 'resident' : 'brgy';

  return (
    <>
      <PageMeta
        title={mode === 'brgy' ? "Register Barangay | E-LigtasMo" : "Register Resident | E-LigtasMo"}
        description={mode === 'brgy' ? "Barangay registration page for disaster risk management." : "Resident registration page for submitting hazard reports."}
      />
      <div className="min-h-screen w-full flex flex-col bg-[#f0f4ff]">
        {/* ── Compact Header ── */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              C
            </div>
            <span className="font-bold text-sm tracking-widest text-gray-800 uppercase">
              E-LigtasMo
            </span>
          </div>
          <Link to="/signin" className="text-gray-300 hover:text-gray-500 transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Link>
        </div>

        {/* ── Main Content Card ── */}
        <div className="flex-1 flex items-start justify-center px-4 pt-2 pb-8">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-blue-100/50 px-6 py-8 sm:px-8">
            <BrgyRegisterForm formClassName="space-y-4" mode={mode as any} />

            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/signin" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </div>
            {mode !== 'brgy' && (
              <div className="mt-2 text-center text-xs text-gray-400">
                Registering a barangay?{' '}
                 <Link to="/register?mode=brgy" className="text-blue-600 hover:underline">Register Barangay</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
