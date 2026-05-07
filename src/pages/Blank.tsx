import PageMeta from "../components/common/PageMeta";
import { FiActivity } from "react-icons/fi";

export default function Blank() {
  return (
    <>
      <PageMeta
        title="Blank_Canvas | Command Center"
        description="Standardized tactical template for mission-specific modules."
      />
      
      <div className="min-h-screen bg-white p-8 lg:p-12 font-jetbrains">
        <div className="max-w-[1600px] mx-auto space-y-10">
          
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-slate-900 shadow-[0_0_15px_rgba(15,23,42,0.4)]" />
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                  New_Operational_Module
                </h1>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">
                Strategic Intelligence Module Template & Tactical Layout
              </p>
            </div>

            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ready_For_Initialization</span>
            </div>
          </div>

          <div className="tactical-container bg-white border-gray-100 p-20 flex flex-col items-center text-center shadow-2xl shadow-slate-500/5">
            <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-slate-200 mb-8 border border-gray-100 border-dashed">
               <FiActivity size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-4">
              Module_Awaiting_Deployment
            </h3>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest max-w-md leading-relaxed">
              Initialize strategic intelligence feeds or tactical grids within this operational sector.
            </p>
          </div>

          {/* Footer Telemetry */}
          <div className="pt-10 flex justify-between items-center border-t border-gray-100">
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Telemetry_Registry_Active</span>
                </div>
             </div>
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
                Registry_Protocol_v4.2 • {new Date().toLocaleTimeString()}
             </div>
          </div>

        </div>
      </div>
    </>
  );
}
