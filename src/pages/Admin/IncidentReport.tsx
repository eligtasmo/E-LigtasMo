import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';

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

  const title = useMemo(() => `Incident Report #${runId}`, [runId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="px-4 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link to="/admin/dispatch-response" className="text-blue-600 hover:underline flex items-center gap-1"><FiArrowLeft /> Back</Link>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md"><FiPrinter /> Print / Save PDF</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 print:p-0">
        <div className="print:p-6">
          <header className="mb-6">
            <div className="text-center">
              <div className="text-xl font-bold">MDRRMO Incident Report</div>
              <div className="text-sm text-gray-600">For submission or auditing</div>
            </div>
          </header>

          <section className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="font-semibold">Incident Details</div>
                <div className="text-sm">
                  <div>Incident ID: {incident?.id ?? run?.incident_id ?? 'N/A'}</div>
                  <div>Type: {incident?.type || run?.type || 'N/A'}</div>
                  <div>Severity: {incident?.severity || run?.severity || 'N/A'}</div>
                  <div>Location: {incident?.address || 'N/A'}</div>
                  <div>Datetime: {incident?.datetime || run?.dispatched_at || 'N/A'}</div>
                </div>
              </div>
              <div>
                <div className="font-semibold">Dispatch Summary</div>
                <div className="text-sm">
                  <div>Team: {run?.team_assigned || 'N/A'}</div>
                  <div>Dispatched: {run?.dispatched_at || 'N/A'}</div>
                  {parsed.hasDest && (
                    <div>Destination: {parsed.destLat.toFixed(5)}, {parsed.destLng.toFixed(5)}</div>
                  )}
                  <div>PPE: {parsed.ppe.length ? parsed.ppe.join(', ') : 'None'}</div>
                  <div>Equipment: {parsed.equipment.length ? parsed.equipment.join(', ') : 'None'}</div>
                  <div>Agencies: {parsed.agencies.length ? parsed.agencies.join(', ') : 'None'}</div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-4">
            <div className="font-semibold">Health Coordination</div>
            <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>MHO Nurse: {parsed.nurse || 'N/A'}</div>
              <div>Hospital: {parsed.hospital || 'N/A'}</div>
              <div>MHO/MESU Contacted: {parsed.mho || 'N/A'}</div>
              <div>Contact Number: {parsed.mhoContact || 'N/A'}</div>
              <div>Departure: {parsed.departure || 'N/A'}</div>
              <div>Arrival: {parsed.arrival || 'N/A'}</div>
            </div>
          </section>

          <section className="mb-4">
            <div className="font-semibold">Outcome / Notes</div>
            <div className="text-sm whitespace-pre-wrap">{run?.notes || 'No notes provided.'}</div>
          </section>

          <section className="mb-4">
            <div className="font-semibold">Timestamp Log</div>
            <div className="text-sm">
              {(logs && logs.length > 0) ? (
                <ul className="list-disc ml-5">
                  {logs.map((l: any, idx: number) => (
                    <li key={idx}>{l.timestamp || l.time || ''} — {l.action || l.event || ''}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500">No detailed logs available. Core timestamps shown above.</div>
              )}
            </div>
          </section>

          <footer className="mt-8 text-xs text-gray-500">
            <div>Generated on {new Date().toLocaleString()}</div>
          </footer>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\:hidden { display: none !important; }
          .print\:p-0 { padding: 0 !important; }
          .print\:p-6 { padding: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default IncidentReport;
