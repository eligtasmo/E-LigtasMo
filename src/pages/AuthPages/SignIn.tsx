import React from "react";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";
import { Link } from "react-router-dom";

const SignIn = () => {
  return (
    <>
      <PageMeta
        title="React.js SignIn Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js SignIn Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <AuthLayout>
        <div className="w-full max-w-lg mx-auto">
          <div className="w-full mt-2">
            <SignInForm />
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <Link to="/brgy-signup" className="text-blue-600 hover:underline">Register Barangay</Link>
            </div>
          </div>
        </div>
      </AuthLayout>
    </>
  );
};

export default SignIn;
