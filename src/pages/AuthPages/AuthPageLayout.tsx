import React from "react";
import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";

const AuthPageLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-25 p-6">
      {/* Simple Logo/Header */}
      <div className="mb-12 text-center">
        <Link to="/" className="inline-block transition-transform hover:scale-105">
          <img
            width={240}
            src="/images/logo/auth-logo.png"
            alt="E-LigtasMo Logo"
            className="drop-shadow-sm"
          />
        </Link>
        <div className="mt-4">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            E-LigtasMo
          </h2>
          <p className="text-sm font-medium text-brand-600 mt-1 uppercase tracking-wider">
            Safe Routes, Safe Escapes
          </p>
        </div>
      </div>

      {/* Simplified Auth Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-brand-100 shadow-premium-lg overflow-hidden transition-all hover:shadow-premium-xl">
        <div className="p-8 sm:p-10">
          {children ?? <Outlet />}
        </div>
        
        {/* Simple Footer inside card */}
        <div className="px-8 py-6 bg-brand-50/50 border-t border-brand-100 text-center">
          <p className="text-[10px] text-brand-700 font-bold tracking-widest uppercase opacity-70">
            Tactical Operations Center • Secured Connection
          </p>
        </div>
      </div>

      {/* External Footer */}
      <div className="mt-12 text-center max-w-xs">
        <p className="text-[11px] text-gray-400 leading-relaxed">
          A Municipal Disaster Risk Reduction & Management Project for Santa Cruz, Laguna
        </p>
      </div>
    </div>
  );
};

export default AuthPageLayout;
