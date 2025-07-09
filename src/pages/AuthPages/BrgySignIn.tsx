// src/pages/auth/BrgySignIn.tsx

import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import BrgyRegisterForm from "../../components/auth/BrgyRegisterForm";
import { Link } from "react-router-dom";

export default function BrgySignUp() {
  return (
    <>
      <PageMeta
        title="Register Barangay | Eligtasmo"
        description="Barangay registration page for disaster risk management."
      />
      <AuthLayout>
        <div className="w-full max-w-lg mx-auto">
          <div className="w-full mt-2">
            <BrgyRegisterForm formClassName="space-y-4" />
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link to="/signin" className="text-blue-600 hover:underline">Sign In</Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
