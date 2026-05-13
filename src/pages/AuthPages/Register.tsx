// src/pages/auth/Register.tsx

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
      <div className="w-full max-w-md mx-auto py-4">
        <BrgyRegisterForm formClassName="space-y-4" mode={mode as any} />
        <div className="mt-8 text-center text-sm font-medium text-gray-500">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-brand-600 font-bold hover:text-brand-700 transition-colors uppercase tracking-wide text-[11px]">
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
