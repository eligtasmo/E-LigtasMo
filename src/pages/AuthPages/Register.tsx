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
      <div className="w-full max-w-md mx-auto py-8">
        <BrgyRegisterForm formClassName="space-y-4" mode={mode as any} />
        <div className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}
