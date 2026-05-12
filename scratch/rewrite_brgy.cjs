const fs = require('fs');

const file = fs.readFileSync('scratch/brgyhome_backup.tsx', 'utf8');

// Find the return ( ... ); block
const returnIndex = file.indexOf('return (');
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
        title="Command Center - E-LigtasMo"
        description="Barangay Tactical Operations Dashboard."
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
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  <span className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">Sector Command Active</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-white leading-none">
                  {user?.brgy_name || 'Barangay'}
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
                  <Link 
                    to="/brgy/report-incident"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <FaPlus /> Report
                  </Link>
               </div>
            </div>
          </div>

          {/* Main Interface Area */}
          <div className="flex-1 flex gap-4 min-h-0 relative">
             {/* Sidebar: Metrics & Incident List */}
             <div className={\`w-full lg:w-[380px] flex flex-col gap-4 pointer-events-auto transition-transform duration-500 ease-out \${selectedIncident ? '-translate-x-full lg:translate-x-0 lg:opacity-100 opacity-0' : 'translate-x-0 opacity-100'}\`}>
                
                {/* Floating Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                    <div className="p-2.5 bg-red-500/20 rounded-xl border border-red-500/20"><FaExclamationTriangle className="text-red-400 text-lg" /></div>
                    <div>
                      <div className="text-2xl font-bold leading-none text-white">{metrics.activeIncidents}</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">Active Alerts</div>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/20"><FaHome className="text-emerald-400 text-lg" /></div>
                    <div>
                      <div className="text-2xl font-bold leading-none text-white">{metrics.shelterCapacity}</div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mt-1">Shelters</div>
                    </div>
                  </div>
                </div>

                {/* Incident List Panel */}
                <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-white/5 bg-white/5">
                     <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white"><FaList className="text-slate-400" /> Incident Matrix</h2>
                     <div className="flex bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
                        {['Pending', 'Verified', 'Resolved'].map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={\`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all \${activeTab === tab ? 'bg-slate-800 text-white shadow-md border border-white/10' : 'text-slate-400 hover:text-slate-200'}\`}>
                            {tab}
                          </button>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                     {(filteredIncidents || []).map((incident) => (
                        <div key={\`\${incident.source_table || 'inc'}-\${incident.id}\`} onClick={() => setSelectedBrgyIncident(incident)} className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-2xl cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden">
                           <div className={\`absolute left-0 top-0 bottom-0 w-1 \${incident.severity === 'Critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : incident.severity === 'High' ? 'bg-orange-500' : incident.severity === 'Moderate' ? 'bg-yellow-500' : 'bg-blue-500'}\`} />
                           <div className="flex justify-between items-start pl-2">
                              <div>
                                 <div className="text-sm font-bold text-white flex items-center gap-1.5 mb-1">{incident.type || 'Incident'}</div>
                                 <div className="text-[10px] text-slate-400 flex items-center gap-1"><FiMapPin className="text-slate-500 shrink-0" /> <span className="truncate max-w-[180px]">{incident.location_text || 'Location Unspecified'}</span></div>
                              </div>
                              <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase \${getSeverityColor(incident.severity)}\`}>{incident.severity}</span>
                           </div>
                           <div className="flex justify-between items-center pl-2 pt-3 mt-1 border-t border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center gap-1"><FiClockIcon /> {formatTime(incident.time || incident.created_at)}</div>
                              <FiChevronRight className="text-slate-500 group-hover:text-white transition-colors" />
                           </div>
                        </div>
                     ))}
                     {filteredIncidents.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                           <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500"><FaCheckCircle className="text-xl" /></div>
                           <div className="text-[11px] font-medium text-slate-400">No active reports for this status.</div>
                        </div>
                     )}
                  </div>
                </div>
             </div>

             {/* Slide-in Detail Panel */}
             <div className={\`absolute inset-y-0 right-0 w-full lg:w-[450px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden \${selectedIncident ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 pointer-events-none scale-95'}\`}>
                {selectedIncident && (
                   <>
                      {/* Header */}
                      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                         <button onClick={() => setSelectedBrgyIncident(null)} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                            <FiChevronRight className="rotate-180" /> Close
                         </button>
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Intelligence Report</span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar">
                         {/* Media */}
                         <div className="aspect-[16/9] bg-slate-950 relative">
                            {selectedIncident.media ? (
                              <img src={\`\${import.meta.env.VITE_API_URL || 'http://localhost/eligtasmo-backend/'}\${selectedIncident.media}\`} className="w-full h-full object-cover opacity-90" />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full gap-3 bg-slate-900">
                                <FaWater className="text-slate-700 text-4xl" />
                                <span className="text-[10px] font-medium text-slate-500">No Imagery Provided</span>
                              </div>
                            )}
                            <div className="absolute top-4 left-4"><span className={\`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg \${getSeverityColor(selectedIncident.severity)}\`}>{selectedIncident.severity} Threat</span></div>
                         </div>
                         
                         {/* Info */}
                         <div className="p-6 flex flex-col gap-6">
                            <div>
                               <h3 className="text-2xl font-bold text-white mb-2">{selectedIncident.type || 'Flood Event'}</h3>
                               <p className="text-xs text-slate-400 flex items-center gap-1.5"><FiMapPin className="text-blue-400" /> {selectedIncident.location_text || 'Location Unspecified'}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Status Registry</div>
                                  <div className={\`text-xs font-bold \${selectedIncident.status === 'Pending' ? 'text-yellow-400' : 'text-emerald-400'}\`}>{selectedIncident.status}</div>
                               </div>
                               <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">Reporter</div>
                                  <div className="text-xs font-semibold text-white truncate">{selectedIncident.reporter_name || 'Citizen Report'}</div>
                               </div>
                            </div>

                            <div>
                               <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <div className="w-4 h-[1px] bg-slate-600" />
                                 Situation Narrative
                               </div>
                               <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/5">
                                 {selectedIncident.description || 'No additional narrative provided.'}
                               </p>
                            </div>
                         </div>
                      </div>
                      
                      {/* Action Footer */}
                      <div className="p-5 bg-slate-900 border-t border-white/10">
                         <div className="grid grid-cols-2 gap-3">
                            {selectedIncident.status === 'Pending' ? (
                               <>
                                  <button onClick={() => handleApprove(selectedIncident.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[11px] font-bold shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2 transition-all"><FaCheckCircle/> Verify Threat</button>
                                  <button onClick={() => handleReject(selectedIncident.id)} className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-[11px] font-bold flex justify-center items-center gap-2 transition-all"><FaTimes/> Reject</button>
                               </>
                            ) : (
                               <button onClick={() => handleResolve(selectedIncident.id)} className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[11px] font-bold shadow-lg shadow-blue-900/50 flex justify-center items-center gap-2 transition-all"><FaCheckCircle/> Mark as Resolved</button>
                            )}
                         </div>
                      </div>
                   </>
                )}
             </div>
          </div>

          {/* Bottom Bar: Ticker & Nav */}
          <div className="flex gap-4 pointer-events-auto">
            <div className="flex-1 bg-red-500/20 backdrop-blur-xl rounded-2xl p-4 shadow-2xl flex items-center gap-4 overflow-hidden border border-red-500/30">
               <div className="bg-red-500 text-white px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest shrink-0 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]">Active Broadcast</div>
               <div className="text-xs font-semibold text-red-100 truncate">Tactical dispatch systems are live. Awaiting verification of pending citizen reports in your sector.</div>
            </div>
            
            <div className="flex gap-2">
              <Link to="/brgy/resources" className="bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-300 hover:text-white px-6 flex items-center rounded-2xl text-[11px] font-semibold shadow-2xl transition-all hover:bg-white/10">Guides</Link>
              <Link to="/brgy/shelters" className="bg-slate-900/60 backdrop-blur-xl border border-white/10 text-slate-300 hover:text-white px-6 flex items-center rounded-2xl text-[11px] font-semibold shadow-2xl transition-all hover:bg-white/10">Shelters</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
`;

const finalFile = file.substring(0, returnIndex) + newUI + '};\n\nexport default BrgyHome;\n';
fs.writeFileSync('src/pages/Dashboard/BrgyHome.tsx', finalFile, 'utf8');
console.log('Successfully updated BrgyHome.tsx');
