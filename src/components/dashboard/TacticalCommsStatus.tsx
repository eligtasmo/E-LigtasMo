import React from 'react';
import { FaShieldAlt, FaCircle } from 'react-icons/fa';

interface SectorStatus {
  name: string;
  status: 'safe' | 'monitor' | 'warning' | 'critical';
  lastPing: string;
  depth?: number;
}

interface TacticalCommsStatusProps {
  sectors: SectorStatus[];
  title?: string;
}

const TacticalCommsStatus: React.FC<TacticalCommsStatusProps> = ({ sectors, title = "Sector Comms" }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-orange-500';
      case 'monitor': return 'text-yellow-500';
      default: return 'text-emerald-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status.toLowerCase()) {
      case 'critical': return 'bg-red-500/10';
      case 'warning': return 'bg-orange-500/10';
      case 'monitor': return 'bg-yellow-500/10';
      default: return 'bg-emerald-500/10';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[10px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2">
          <FaShieldAlt className="text-blue-600" />
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <FaCircle className="text-emerald-500 text-[6px] animate-pulse" />
          <span className="text-[8px] font-black text-slate-400 uppercase">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
        {sectors.map((sector, idx) => (
          <div 
            key={idx} 
            className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(sector.status)} shadow-[0_0_8px_currentColor]`} />
              <div>
                <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                  {sector.name}
                </div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  {sector.lastPing}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-[9px] font-black px-2 py-0.5 rounded ${getStatusBg(sector.status)} ${getStatusColor(sector.status)} uppercase tracking-tighter`}>
                {sector.status}
              </div>
              {sector.depth !== undefined && sector.depth > 0 && (
                <div className="text-[8px] font-mono font-black text-slate-600 mt-0.5">
                  {sector.depth}CM
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
        <span className="text-[8px] font-black tracking-widest uppercase opacity-60">Total Sectors</span>
        <span className="text-[10px] font-black">{sectors.length}</span>
      </div>
    </div>
  );
};

export default TacticalCommsStatus;
