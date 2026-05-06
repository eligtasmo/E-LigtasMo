import React from "react";
import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";
import { Link } from "react-router-dom";

const SignIn = () => {
  return (
    <>
      <PageMeta
        title="Sign In | E-LigtasMo Tactical"
        description="Secure access for E-LigtasMo administrators and brgy personnel."
      />
      <div className="w-full max-w-lg mx-auto">
        <div className="w-full mt-2">
          <SignInForm />
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
              Tactical Operations Center • Secured Connection
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignIn;
