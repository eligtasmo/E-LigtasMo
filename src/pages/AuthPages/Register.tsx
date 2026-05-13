import PageMeta from "../../components/common/PageMeta";
import BrgyRegisterForm from "../../components/auth/BrgyRegisterForm";
import { useLocation } from "react-router-dom";

export default function BrgySignUp() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const modeParam = (params.get('mode') || 'brgy').toLowerCase();
  const mode = modeParam === 'resident' ? 'resident' : 'brgy';

  return (
    <>
      <PageMeta
        title={mode === 'brgy' ? "Register Barangay | E-LigtasMo" : "Register Resident | E-LigtasMo"}
        description={mode === 'brgy' ? "Barangay registration page." : "Resident registration page."}
      />
      <div className="w-full animate-fade-in">
        <div className="mb-10">
          <h2 className="text-5xl font-black tracking-tighter mb-4 leading-[0.9]">Sign up.</h2>
          <p className="text-lg font-bold text-foreground/40 leading-tight">
            {mode === 'brgy' 
              ? 'Join the municipal command network today.' 
              : 'Protect yourself and your community with live maps.'}
          </p>
        </div>

        <BrgyRegisterForm formClassName="space-y-6" mode={mode as any} />
      </div>
    </>
  );
}
