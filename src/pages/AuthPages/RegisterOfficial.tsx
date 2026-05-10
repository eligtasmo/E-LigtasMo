import React from "react";
import { useLocation } from "react-router-dom";
import BrgyRegisterForm from "../../components/auth/BrgyRegisterForm";
import PageMeta from "../../components/common/PageMeta";

export default function RegisterOfficial() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get("token");

  return (
    <>
      <PageMeta title="Official Registration | E-LigtasMo" />
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-outfit py-12">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
           {/* Re-using the standard BrgyRegisterForm for consistent "Old Flow" experience */}
           <BrgyRegisterForm mode="brgy" token={token} />
        </div>
      </div>
    </>
  );
}
