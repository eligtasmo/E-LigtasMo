import React from "react";
import { Outlet } from "react-router-dom";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router-dom";

const AuthPageLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white selection:bg-brand-500/30">
      {/* Left: Form Area (White background for clarity) */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 min-h-screen px-6 sm:px-12 lg:px-16 z-10 py-12 bg-white">
        <div className="w-full max-w-[440px]">
          {children ?? <Outlet />}
        </div>
      </div>

      {/* Right: Branding/Graphic (Hidden on mobile/tablet, shown on lg+) */}
      <div className="hidden lg:flex w-1/2 h-screen items-center justify-center bg-[#0C0B0A] relative overflow-hidden border-l border-white/5">
        <div className="absolute inset-0 z-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent"></div>
          <GridShape />
        </div>

        <div className="flex flex-col items-center max-w-sm z-10 p-8">
          <Link to="/" className="block mb-8 transition-transform hover:scale-105 active:scale-95">
            <img
              width={180}
              height={180}
              src="/images/logo/auth-logo.png"
              alt="Logo"
              className="drop-shadow-[0_0_30px_rgba(245,178,53,0.3)]"
            />
          </Link>
          <h2 className="text-2xl font-black text-white mb-4 tracking-tighter uppercase italic">E-LIGTASMO</h2>
          <p className="text-center text-gray-400 font-medium leading-relaxed max-w-xs">
            Safe Routes, Safe Escapes for Municipal Disaster Risk Reduction of Santa Cruz, Laguna
          </p>

          <div className="mt-12 flex gap-4 opacity-50">
            <div className="h-1 w-8 bg-brand-500 rounded-full"></div>
            <div className="h-1 w-8 bg-white/10 rounded-full"></div>
            <div className="h-1 w-8 bg-white/10 rounded-full"></div>
          </div>
        </div>

        {/* Tactical Corner accents */}
        <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-brand-500/30"></div>
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-brand-500/30"></div>
      </div>
    </div>
  );
};

export default AuthPageLayout;
