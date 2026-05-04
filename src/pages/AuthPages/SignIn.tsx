import React from "react";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { Link } from "react-router-dom";

const SignIn = () => {
  return (
    <>
      <PageMeta
        title="Sign In | E-LigtasMo Tactical"
        description="Access the E-LigtasMo tactical dashboard for disaster risk reduction and management."
      />
      <div className="w-full max-w-lg mx-auto">
        <div className="w-full mt-2">
          <SignInForm />
        </div>
      </div>
    </>
  );
};

export default SignIn;
