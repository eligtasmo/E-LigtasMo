import React from "react";
import { Outlet } from "react-router-dom";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router-dom";

const AuthPageLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left: Full form area, no card */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen bg-white px-4 md:px-16">
        <div className="w-full max-w-lg">
          {children ?? <Outlet />}
        </div>
      </div>
      {/* Right: Branding/graphic (full height, centered) */}
      <div className="hidden md:flex w-1/2 h-screen items-center justify-center bg-brand-950 relative">
        <div className="absolute inset-0 z-0">
          <GridShape />
        </div>
        <div className="flex flex-col items-center max-w-xs z-10">
          <Link to="/" className="block mb-4">
            <img
              width={231}
              height={48}
              src="/images/logo/auth-logo.png"
              alt="Logo"
            />
          </Link>
          <p className="text-center text-gray-400 dark:text-white/60">
            Safe Routes, Safe Escapes for Municipal Disaster Risk Reduction of Santa Cruz, Laguna
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPageLayout;
