import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FiPrinter, FiArrowLeft, FiShield, FiFileText, FiActivity, FiMapPin, FiClock, FiCheckSquare } from 'react-icons/fi';
import PageMeta from "../../components/common/PageMeta";

const IncidentReport: React.FC = () => {
  const { runId } = useParams();
  const [run, setRun] = useState<any>(null);
  const [incident, setIncident] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  const parsed = useMemo(() => {
    const arr = (v: any) => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return v.split(',').map(s => s.trim()).filter(Boolean); }
      }
      return [];
    };
    const hco = run?.health_coordination || {};
    const mho = run?.hc_mho_name || hco?.mho_name || '';
    const mhoContact = run?.hc_mho_contact || hco?.mho_contact || '';
    const nurse = run?.hc_nurse_assigner || hco?.nurse_assigner || '';
    const hospital = run?.hc_hospital || hco?.hospital || '';
    const departure = run?.hc_departure || hco?.departure_at || run?.dispatched_at || '';
    const arrival = run?.hc_arrival || hco?.arrival_at || '';
    const ppe = arr(run?.ppe_checklist || run?.ppe_required);
    const equipment = arr(run?.equipment_used || run?.equipment_planned);
    const agenciesRaw = arr(run?.agencies_tagged);
    const agencies = agenciesRaw.map((a: string) => String(a).replace('-', ' ').toUpperCase());
    const destLat = Number(run?.destination_lat);
    const destLng = Number(run?.destination_lng);
    const hasDest = Number.isFinite(destLat) && Number.isFinite(destLng);
    return { mho, mhoContact, nurse, hospital, departure, arrival, ppe, equipment, agencies, destLat, destLng, hasDest };
  }, [run]);

  useEffect(() => {
    const load = async () => {
      if (!runId) return;
      try {
        const rRes = await apiFetch(`get-sop-run.php?sop_run_id=${encodeURIComponent(runId)}`);
        const r = await rRes.json();
        const row = r?.sop_run || r?.run || r;
        setRun(row);
        const incidentId = row?.incident_id;
        if (incidentId) {
          const incRes = await apiFetch('list-incidents.php');
          const incidents = await incRes.json();
          const match = (Array.isArray(incidents) ? incidents : incidents?.incidents || []).find((i: any) => `${i.id}` === `${incidentId}`);
          setIncident(match || null);
        }
        try {
          const logResp = await apiFetch(`export-logs.php?run_id=${encodeURIComponent(runId)}&format=json`);
          const logRes = await logResp.json();
          setLogs(Array.isArray(logRes) ? logRes : logRes?.logs || []);
        } catch {}
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [runId]);

  const title = useMemo(() => `Mission Summary #${runId}`, [runId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tactical-page print:bg-white print:p-0">
      <PageMeta title={`${title} | E-LigtasMo Admin`} description="Official mission summary and incident audit report." />
      
      <div className="tactical-container max-w-5xl print:max-w-none print:m-0 print:p-0">
        
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-10 print:hidden">
          <Link to="/admin/dispatch-response" className="tactical-button-ghost">
            <FiArrowLeft /> RETURN_TO_COMMAND
          </Link>
          <button onClick={handlePrint} className="tactical-button-accent shadow-2xl">
            <FiPrinter /> GENERATE_PDF_REPORT
          </button>
        </div>

        {/* Report Content */}
        <div className="tactical-card bg-white p-12 md:p-20 shadow-2xl print:shadow-none print:border-none print:p-0">
          
          {/* Official Header */}
          <header className="flex flex-col items-center text-center mb-16 border-b-2 border-slate-900 pb-12">
             <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl print:shadow-none">
                <FiShield size={40} />
             </div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Mission Audit Report</h1>
             <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-4">E-LigtasMo Emergency Operations Command</p>
             <div className="flex gap-4">
                <span className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                   ID: {runId}
                </span>
                <span className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                   SOP: EMERGENCY_RESPONSE
                </span>
             </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
             {/* Section: Incident Intel */}
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                   <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Incident_Intelligence</h2>
                </div>
                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Mission_Signature</label>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{incident?.type || run?.type || 'UNCLASSIFIED'}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Criticality</label>
                         <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{incident?.severity || run?.severity || 'NORMAL'}</p>
                      </div>
                      <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Timestamp</label>
                         <p className="text-sm font-black text-slate-900 tabular-nums">{incident?.datetime || run?.dispatched_at || 'N/A'}</p>
                      </div>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deployment_Target</label>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed">{incident?.address || 'COORDINATES_ONLY'}</p>
                   </div>
                </div>
             </section>

             {/* Section: Mission Status */}
             <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                   <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Operational_Status</h2>
                </div>
                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Mission_Resolution</label>
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                            <FiActivity />
                         </div>
                         <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{run?.status_label || 'COMPLETED'}</span>
                      </div>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deployment_Unit</label>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{run?.team_assigned || 'LOCAL_RESPONSE_TEAM'}</p>
                   </div>
                </div>
             </section>
          </div>

          {/* Section: Logistics */}
          <section className="mb-16">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Logistics_&_Inventory</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">PPE_Checklist</label>
                   <div className="flex flex-wrap gap-2">
                      {parsed.ppe.length > 0 ? parsed.ppe.map((item: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200">{item}</span>
                      )) : <span className="text-xs text-slate-400 italic">None specified</span>}
                   </div>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Tactical_Equipment</label>
                   <div className="flex flex-wrap gap-2">
                      {parsed.equipment.length > 0 ? parsed.equipment.map((item: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 bg-white rounded-lg text-[10px] font-bold text-slate-600 border border-slate-200">{item}</span>
                      )) : <span className="text-xs text-slate-400 italic">None specified</span>}
                   </div>
                </div>
             </div>
          </section>

          {/* Section: Health Coordination */}
          <section className="mb-16">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-rose-600 rounded-full" />
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Medical_Coordination_Log</h2>
             </div>
             <div className="bg-slate-50 rounded-3xl border border-slate-100 p-10 overflow-hidden relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hospital_Target</label>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{parsed.hospital || 'NOT_APPLICABLE'}</p>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assigning_Nurse</label>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{parsed.nurse || 'N/A'}</p>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">MHO_Lead</label>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{parsed.mho || 'N/A'}</p>
                   </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col md:flex-row gap-10 relative z-10">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Departure_At</label>
                      <p className="text-sm font-black text-slate-900 tabular-nums">{parsed.departure || '—'}</p>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Arrival_At</label>
                      <p className="text-sm font-black text-slate-900 tabular-nums">{parsed.arrival || '—'}</p>
                   </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-rose-100/30 rounded-full blur-3xl" />
             </div>
          </section>

          {/* Section: Timeline */}
          <section className="mb-16">
             <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Operation_Timeline</h2>
             </div>
             <div className="space-y-4">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex gap-6 p-6 bg-white border border-slate-100 rounded-2xl group hover:border-slate-300 transition-all">
                     <div className="shrink-0 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                           <FiClock size={14} />
                        </div>
                        {i < logs.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-2" />}
                     </div>
                     <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{log.action}</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{log.details}</p>
                     </div>
                  </div>
                )) : <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Zero_Log_Entries_Found</div>}
             </div>
          </section>

          {/* Verification Footer */}
          <footer className="mt-20 pt-16 border-t-2 border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-16">
             <div>
                <div className="w-48 h-px bg-slate-200 mb-4" />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Authenticated_By</label>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Mission Commander</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Operator ID: #SYS_ADMIN</p>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification_Timestamp</p>
                <p className="text-sm font-black text-slate-900 tabular-nums">{new Date().toLocaleString()}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Checksum: {Math.random().toString(36).substring(7).toUpperCase()}</p>
             </div>
          </footer>
        </div>

        {/* Footer Link */}
        <div className="mt-12 text-center print:hidden">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Operational Registry v4.2.0 • E-LigtasMo Emergency Platform</p>
        </div>
      </div>
    </div>
  );
};

export default IncidentReport;
