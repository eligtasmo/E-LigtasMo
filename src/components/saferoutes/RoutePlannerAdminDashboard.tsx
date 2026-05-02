import { useEffect, useMemo, useState } from 'react';
import { fetchWeatherPreferred } from '../../utils/weather';

type Incident = { id: number; status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved' | 'Active' };
type Hazard = { id: number; status?: string };
type DangerZone = { id: number };

export default function RoutePlannerAdminDashboard() {
  const [counts, setCounts] = useState({
    approved: 0,
    resolved: 0,
    pending: 0,
    rejected: 0,
    activeHazards: 0,
    dangerZones: 0,
  });
  const [recent, setRecent] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  const [topBarangays, setTopBarangays] = useState<Array<{ name: string; count: number }>>([]);
  const modeUsage = useMemo(() => {
    const d = localStorage.getItem('rp_mode_date');
    const today = new Date().toISOString().slice(0,10);
    const read = (k: string) => Number(localStorage.getItem(k) || 0);
    if (d !== today) {
      return { car: 0, bike: 0, walk: 0, truck: 0 };
    }
    return {
      car: read('rp_mode_driving_car'),
      bike: read('rp_mode_cycling_regular'),
      walk: read('rp_mode_foot_walking'),
      truck: read('rp_mode_driving_hgv'),
    };
  }, []);
  const routesPlannedToday = useMemo(() => {
    const d = localStorage.getItem('rp_count_date');
    const c = localStorage.getItem('rp_count');
    const today = new Date().toISOString().slice(0,10);
    return d === today ? Number(c || 0) : 0;
  }, []);
  const avgRouteMs = useMemo(() => {
    const c = Number(localStorage.getItem('rp_avg_ms') || 0);
    return c;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        // Weather for Santa Cruz, Laguna (route planner area)
        try {
          const w = await fetchWeatherPreferred({ lat: 14.2794, lon: 121.4165 }, import.meta.env.VITE_OPENWEATHER_API_KEY);
          if (!cancelled && w) setWeather({ temp: Math.round(w.temp), desc: w.desc });
          if (!cancelled && !w) {
            setTimeout(async () => {
              if (cancelled) return;
              try {
                const w2 = await fetchWeatherPreferred({ lat: 14.2794, lon: 121.4165 }, import.meta.env.VITE_OPENWEATHER_API_KEY);
                if (w2) setWeather({ temp: Math.round(w2.temp), desc: w2.desc });
              } catch {}
            }, 5000);
          }
        } catch (_) {}

        const [approvedRes, resolvedRes, pendingRes, rejectedRes, hazardsRes, zonesRes] = await Promise.all([
          fetch('/api/list-incidents.php?status=Approved'),
          fetch('/api/list-incidents.php?status=Resolved'),
          fetch('/api/list-incidents.php?status=Pending'),
          fetch('/api/list-incidents.php?status=Rejected'),
          fetch('/api/list-hazards.php'),
          fetch('/api/list-danger-zones.php'),
        ]);
        const [approved, resolved, pending, rejected, hazards, zones] = await Promise.all([
          approvedRes.json(),
          resolvedRes.json(),
          pendingRes.json(),
          rejectedRes.json(),
          hazardsRes.json(),
          zonesRes.json(),
        ]);

        if (cancelled) return;
        const approvedList: Incident[] = Array.isArray(approved?.incidents) ? approved.incidents : [];
        const resolvedList: Incident[] = Array.isArray(resolved?.incidents) ? resolved.incidents : [];
        const pendingList: Incident[] = Array.isArray(pending?.incidents) ? pending.incidents : [];
        const rejectedList: Incident[] = Array.isArray(rejected?.incidents) ? rejected.incidents : [];
        const hazardsList: Hazard[] = Array.isArray(hazards?.hazards) ? hazards.hazards : [];
        const zonesList: DangerZone[] = Array.isArray(zones?.zones) ? zones.zones : [];

        setCounts({
          approved: approvedList.length,
          resolved: resolvedList.length,
          pending: pendingList.length,
          rejected: rejectedList.length,
          activeHazards: hazardsList.filter(h => (h.status || '').toLowerCase() === 'active').length,
          dangerZones: zonesList.length,
        });
        setRecent(approvedList.slice(0, 5));

        // Compute Top affected barangays across statuses
        const allIncidents = [
          ...approvedList,
          ...resolvedList,
          ...pendingList,
          ...rejectedList,
        ];
        const countsByBrgy: Record<string, number> = {};
        allIncidents.forEach((inc: any) => {
          const brgy = inc?.barangay || inc?.brgy_name || inc?.barangay_name || inc?.address_barangay;
          if (brgy && typeof brgy === 'string') {
            const key = brgy.trim();
            countsByBrgy[key] = (countsByBrgy[key] || 0) + 1;
          }
        });
        const top = Object.entries(countsByBrgy)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));
        setTopBarangays(top);
      } catch (e) {
        if (cancelled) return;
        setCounts({ approved: 0, resolved: 0, pending: 0, rejected: 0, activeHazards: 0, dangerZones: 0 });
        setRecent([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Route Planner Admin</h1>
          <p className="text-sm text-gray-600">Operational overview and planning metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {weather && (
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 animate-pop">
              <span className="text-sm font-semibold text-gray-900">{weather.temp}°C</span>
              <span className="text-xs text-gray-600">{capitalize(weather.desc)}</span>
            </div>
          )}
          {loading && (<div className="text-xs text-gray-500">Loading…</div>)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatTile label="Approved" value={counts.approved.toLocaleString()} accent="bg-emerald-500" />
        <StatTile label="Pending" value={counts.pending.toLocaleString()} accent="bg-amber-500" />
        <StatTile label="Rejected" value={counts.rejected.toLocaleString()} accent="bg-rose-500" />
        <StatTile label="Resolved" value={counts.resolved.toLocaleString()} accent="bg-blue-500" />
        <StatTile label="Active Hazards" value={counts.activeHazards.toLocaleString()} accent="bg-red-500" />
        <StatTile label="Danger Zones" value={counts.dangerZones.toLocaleString()} accent="bg-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <OpenIncidentsCard
            title="Incident Snapshot"
            subtitle="Today"
            total={(counts.approved + counts.pending + counts.rejected + counts.resolved)}
            resolved={counts.resolved}
          />
          <DashboardCard
            title="Routes Planned"
            subtitle="Today"
            value={routesPlannedToday > 0 ? `${routesPlannedToday.toLocaleString()}` : '0'}
            description="Routes planned today"
          />
        </div>
        <div className="space-y-4">
          <TransportModeCard
            title="Transport Mode Usage"
            subtitle="Today"
            data={modeUsage}
          />
          <DashboardCard
            title="Avg Route Calc Time"
            subtitle="Today"
            value={avgRouteMs ? formatMs(avgRouteMs) : '—'}
            description="Average time to compute routes"
          />
        </div>
        <div className="space-y-4">
          <TopBarangaysCard
            title="Top Affected Barangays"
            subtitle="Today"
            items={topBarangays}
          />
          <RecentIncidentsCard title="Recent Approved" items={recent} />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, subtitle, value, description }: { title: string; subtitle?: string; value: string; description?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <button className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600">{subtitle || 'Today'}</button>
      </div>
      <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 leading-tight break-words" title={value}>{value}</div>
      {description && <div className="text-xs text-gray-600 mb-3 break-words">{description}</div>}
      <div className="h-24 bg-gray-50 border border-gray-100 rounded-lg" aria-hidden="true" />
    </div>
  );
}

function OpenIncidentsCard({ title, subtitle, total, resolved }: { title: string; subtitle?: string; total: number; resolved: number }) {
  const open = Math.max(total - resolved, 0);
  const pctResolved = total > 0 ? Math.round((resolved / total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <button className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600">{subtitle || 'Today'}</button>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-[10px] border-red-500"></div>
          <div className="absolute inset-0 rounded-full border-[10px] border-transparent" style={{ borderTopColor: '#22c55e', transform: `rotate(${(pctResolved/100)*360}deg)` }}></div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Total Incidents</div>
          <div className="text-lg font-bold text-gray-900">{total}</div>
        </div>
        <div className="ml-auto text-xs text-gray-700 space-y-1 min-w-0">
          <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> {pctResolved}% resolved</div>
          <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-red-500"></span> {open} open</div>
        </div>
      </div>
      <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg mt-3" aria-hidden="true" />
    </div>
  );
}

function TopBarangaysCard({ title, subtitle, items }: { title: string; subtitle?: string; items: Array<{ name: string; count: number }> }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <button className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600">{subtitle || 'Today'}</button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No incident distribution available</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.name} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate">{it.name}</span>
              <span className="font-semibold text-gray-900">{it.count}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg mt-3" aria-hidden="true" />
    </div>
  );
}

function TransportModeCard({ title, subtitle, data }: { title: string; subtitle?: string; data: { car: number; bike: number; walk: number; truck: number } }) {
  const items = [
    { name: 'Car', value: data.car, color: 'bg-blue-500' },
    { name: 'Bike', value: data.bike, color: 'bg-emerald-500' },
    { name: 'Walk', value: data.walk, color: 'bg-amber-500' },
    { name: 'Truck', value: data.truck, color: 'bg-violet-500' },
  ];
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <button className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-600">{subtitle || 'Today'}</button>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-2">
            <span className="w-12 text-xs text-gray-700">{it.name}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded">
              <div className={`h-3 rounded ${it.color}`} style={{ width: `${(it.value / max) * 100}%` }} />
            </div>
            <span className="w-10 text-right text-xs text-gray-800">{it.value}</span>
          </div>
        ))}
      </div>
      <div className="h-6" aria-hidden="true" />
    </div>
  );
}

function capitalize(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(1)} sec`;
  return `${(ms/60000).toFixed(1)} min`;
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md animate-pop">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">{label}</div>
        <span className={`inline-block w-2 h-2 rounded-full ${accent}`}></span>
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 leading-tight" title={value}>{value}</div>
    </div>
  );
}

function RecentIncidentsCard({ title, items }: { title: string; items: Incident[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pop">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-500">No recent items</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">#{it.id}</span>
              <span className="text-gray-900 font-semibold">{it.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
