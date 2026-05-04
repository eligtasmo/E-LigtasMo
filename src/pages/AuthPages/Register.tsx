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
      <div className="w-full max-w-lg mx-auto py-12">
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-8 sm:mb-10 text-center">
            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter uppercase italic">
              {mode === 'brgy' ? 'BARANGAY REGISTRATION' : 'RESIDENT ENROLLMENT'}
            </h1>
            <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">
              ESTABLISH SECTOR CLEARANCE
            </p>
          </div>

          <BrgyRegisterForm formClassName="space-y-4" mode={mode as any} />

          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ALREADY REGISTERED?</span>
                <Link to="/auth/signin" className="text-[10px] font-black text-gray-900 hover:text-brand-500 uppercase tracking-widest transition-colors">
                  SIGN IN
                </Link>
             </div>
             {mode !== 'brgy' && (
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">BARANGAY UNIT?</span>
                   <Link to="/auth/register?mode=brgy" className="text-[10px] font-black text-gray-900 hover:text-brand-500 uppercase tracking-widest transition-colors">
                     SWITCH TO BRGY
                   </Link>
                </div>
             )}
          </div>
        </div>
      </div>
    </>
  );
}
