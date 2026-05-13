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
      <div className="w-full animate-fade-in">
        <div className="mb-10">
          <h2 className="text-5xl font-black tracking-tighter mb-4 leading-[0.9]">Official Node.</h2>
          <p className="text-lg font-bold text-foreground/40 leading-tight">
            Complete your onboarding to join the command network.
          </p>
        </div>
        
        <BrgyRegisterForm mode="brgy" token={token} />
      </div>
    </>
  );
}
