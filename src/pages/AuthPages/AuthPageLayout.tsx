import React from "react";
import { Outlet } from "react-router-dom";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router-dom";

const AuthPageLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Left: E-LigtasMo Intro Branding (Capstone Showcase) */}
      <div className="hidden md:flex w-1/2 h-screen items-center justify-center bg-gray-900 relative overflow-hidden">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0 opacity-40">
          <GridShape />
        </div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full -ml-48 -mt-48"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-500/10 blur-[100px] rounded-full -mr-48 -mb-48"></div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center text-center px-8 lg:px-12">
          <div className="mb-8 p-4 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl transition-transform duration-500 hover:scale-105">
            <Link to="/" className="block">
              <img
                width={280}
                src="/images/logo/auth-logo.png"
                alt="E-LigtasMo Logo"
                className="drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              />
            </Link>
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight italic">
              E-LigtasMo
            </h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
            <p className="text-lg font-medium text-blue-200/80 leading-relaxed tracking-wide">
              Safe Routes, Safe Escapes
            </p>
            <div className="pt-6 border-t border-white/5 mt-6">
              <p className="text-sm text-gray-400 leading-relaxed max-w-[320px] mx-auto">
                A Municipal Disaster Risk Reduction & Management Capstone Project for Santa Cruz, Laguna
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Input Forms (Operations Area) */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 min-h-screen px-6 sm:px-12 md:px-20 z-10 bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default AuthPageLayout;
