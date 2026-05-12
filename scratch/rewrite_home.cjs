const fs = require('fs');

const file = fs.readFileSync('scratch/home_backup.tsx', 'utf8');

const returnIndex = file.indexOf('return (', 250);
const mapboxStartIndex = file.indexOf('<MapboxMap');
const mapboxEndIndex = file.lastIndexOf('</MapboxMap>') + '</MapboxMap>'.length;

if (returnIndex === -1 || mapboxStartIndex === -1 || mapboxEndIndex === -1) {
    console.error("Could not find required blocks");
    process.exit(1);
}

const mapboxContent = file.substring(mapboxStartIndex, mapboxEndIndex);

const newUI = `
  return (
    <>
      <PageMeta
        title="MMDRMO Command Center"
        description="Global Tactical Operations Dashboard."
      />
      <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden font-inter bg-slate-950 text-white flex">
        
        {/* Absolute Map Background */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          ${mapboxContent}
        </div>

        {/* Floating HUD Container */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col p-4 lg:p-6 gap-4">
          
          {/* Top Header HUD */}
          <div className="flex justify-between items-start">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-inner">
                <FaShieldAlt className="text-blue-400 text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">System Stability Confirmed</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                  Strategic Command
                </h1>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 pointer-events-auto">
               <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-white leading-none">
                      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mt-1">Local Time</div>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <TacticalCommsStatus />
               </div>
            </div>
          </div>

          {/* Main Interface Area */}
          <div className="flex-1 flex justify-between gap-4 min-h-0 relative">
             
             {/* Left Sidebar: Metrics & Sector Status */}
             <div className="w-full lg:w-[320px] flex flex-col gap-4 pointer-events-auto">
                {/* Global Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/admin/incident-reports" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaFire className="text-red-400" /><span className="text-2xl font-bold text-white">{keyMetrics.activeIncidents.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Active Incidents</div>
                  </Link>
                  <Link to="/admin/hazards" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaSkullCrossbones className="text-orange-400" /><span className="text-2xl font-bold text-white">{keyMetrics.hazardZones.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Hazard Zones</div>
                  </Link>
                  <Link to="/admin/shelters" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaHome className="text-blue-400" /><span className="text-2xl font-bold text-white">{keyMetrics.sheltersAvailable.value}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Shelters</div>
                  </Link>
                  <Link to="/admin/weather" className="bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 transition-all">
                    <div className="flex justify-between items-center"><FaWind className="text-cyan-400" /><span className="text-xl font-bold text-white truncate max-w-[50px]">{keyMetrics.weatherAlert.type}</span></div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest">Weather Alert</div>
                  </Link>
                </div>

                {/* Sector Status Matrix */}
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                   <div className="p-4 border-b border-white/5 flex justify-between items-center">
                      <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Sector Matrix</h2>
                      <span className="text-[9px] text-slate-400">Flood Levels</span>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                     {brgyLevels.length > 0 ? brgyLevels.map((b, i) => (
                       <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border-b border-white/5 last:border-0 transition-colors">
                         <div className="flex items-center gap-2">
                           <div className={\`w-2 h-2 rounded-full \${b.status_level === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : b.status_level === 'warning' ? 'bg-orange-400' : 'bg-emerald-500'}\`} />
                           <span className="text-[11px] font-medium text-slate-200">{b.barangay_name}</span>
                         </div>
                         <div className="text-[10px] font-bold text-blue-300">{b.flood_depth_cm || 0}cm</div>
                       </div>
                     )) : (
                       <div className="text-center p-4 text-[10px] text-slate-500">Loading Sectors...</div>
                     )}
                   </div>
                </div>
             </div>

             {/* Right Sidebar: Live Reports */}
             <div className="w-full lg:w-[360px] flex flex-col gap-4 pointer-events-auto">
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                     <h2 className="text-sm font-semibold flex items-center gap-2 text-white"><FaList className="text-slate-400" /> Live Feed</h2>
                     <Link to="/admin/incident-reports" className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest font-bold transition-colors">Matrix View</Link>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                     {recentIncidents.map((incident, index) => (
                        <div key={\`\${incident.source_table || 'inc'}-\${incident.id || index}\`} onClick={() => { setSelectedIncident(incident); setIsViewingDetails(true); }} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden">
                           <div className={\`absolute left-0 top-0 bottom-0 w-1 \${incident.type === 'Flood' ? 'bg-blue-500' : incident.type === 'Accident' ? 'bg-orange-500' : incident.type === 'Fire' ? 'bg-red-500' : 'bg-slate-400'}\`} />
                           <div className="flex justify-between items-start pl-2">
                              <div>
                                 <div className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">{incident.type || 'Incident'}</div>
                                 <div className="text-[10px] text-slate-400 flex items-center gap-1"><FiMapPin className="text-slate-500 shrink-0" /> <span className="truncate max-w-[180px]">{incident.location || 'Location Unspecified'}</span></div>
                              </div>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">Active</span>
                           </div>
                           <div className="flex justify-between items-center pl-2 pt-3 mt-1 border-t border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon /> {incident.time.toUpperCase()}</div>
                              <FiChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
             </div>

          </div>

          {/* Bottom Bar: Charts & Ticker */}
          <div className="flex gap-4 pointer-events-auto h-36">
             <div className="w-[320px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center">
                 <Doughnut 
                  data={incidentTypeData} 
                  options={{ 
                    plugins: { legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 9 } } } }, 
                    maintainAspectRatio: false, 
                    cutout: '70%' 
                  }} 
                />
             </div>
             
             <div className="flex-1 bg-blue-600/20 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex flex-col justify-center border border-blue-500/30">
               <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-2"><FaBullhorn /> Global Broadcast Channel</div>
               <div className="text-sm font-semibold text-blue-100">All local government units and response teams are currently on standby. Tactical dispatch matrix is fully operational.</div>
             </div>

             <div className="w-[360px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center">
                <Line 
                  data={responseTimeData} 
                  options={{ 
                    plugins: { legend: { display: false } }, 
                    scales: { x: { display: false }, y: { display: false } }, 
                    maintainAspectRatio: false 
                  }} 
                />
             </div>
          </div>

        </div>
        
        {/* Incident Detail Modal (Admin) */}
        {isViewingDetails && selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                 <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><FaList className="text-blue-400"/> Incident Overview</span>
                 <button onClick={() => setIsViewingDetails(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 text-[10px] uppercase font-bold"><FaTimes className="inline mr-1"/> Close</button>
               </div>
               <div className="p-6 grid grid-cols-2 gap-6">
                 <div>
                   <h2 className="text-2xl font-bold text-white mb-2">{selectedIncident.type}</h2>
                   <div className="text-xs text-slate-400 flex items-center gap-2 mb-4"><FiMapPin /> {selectedIncident.location}</div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 border-t border-white/10 pt-4">Timeline</div>
                   <div className="text-sm font-medium text-white mb-4">{selectedIncident.time}</div>
                 </div>
                 <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center items-center gap-2">
                   <FaShieldAlt className="text-3xl text-emerald-400" />
                   <div className="text-[10px] text-slate-400 uppercase tracking-widest">Status</div>
                   <div className="text-lg font-bold text-emerald-400">{selectedIncident.status}</div>
                 </div>
               </div>
               <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-end gap-3">
                 <Link to="/admin/incident-reports" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl shadow-lg transition-all uppercase tracking-wider">Manage in Matrix</Link>
               </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
`;

const finalFile = file.substring(0, returnIndex) + newUI + '};\n\nexport default Home;\n';
fs.writeFileSync('src/pages/Dashboard/Home.tsx', finalFile, 'utf8');
console.log('Successfully updated Home.tsx');
