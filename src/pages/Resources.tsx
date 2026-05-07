import React, { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import { FiSearch, FiDownload, FiBookOpen, FiChevronDown, FiChevronRight, FiPhone, FiPrinter, FiX, FiActivity, FiShield, FiPackage, FiZap } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { toast } from 'react-hot-toast';

type Guide = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium";
  downloadable?: boolean;
};

type KitCategory = {
  category: string;
  items: string[];
};

type Contact = {
  id?: number;
  category: string;
  number: string;
  description: string;
  type?: string;
  priority?: string;
};

const GUIDES: Guide[] = [
  { id: "earthquake", title: "Earthquake Safety", description: "Essential protocols for seismic activity and home safety.", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "flood", title: "Flood Preparedness", description: "Response plans and evacuation measures for flood hazards.", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "wildfire", title: "Wildfire Evacuation", description: "Fire safety measures and strategic evacuation routes.", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "hurricane", title: "Hurricane Readiness", description: "Comprehensive preparation for high-velocity wind events.", category: "Natural Disaster", priority: "medium", downloadable: true },
  { id: "power-outage", title: "Extended Power Outages", description: "Survival measures and grid failure readiness.", category: "Infrastructure", priority: "medium" },
];

const KIT: KitCategory[] = [
  { category: "Basic Supplies", items: ["Water (1 gallon per person per day for 3+ days)", "Non-perishable food (3+ day supply)", "Battery-powered or hand crank radio", "Flashlight and extra batteries", "First aid kit", "Whistle for signaling help", "Dust masks and plastic sheeting", "Moist towelettes and garbage bags", "Wrench or pliers to turn off utilities", "Manual can opener", "Local maps", "Cell phone with chargers and backup battery"] },
  { category: "Documents & Money", items: ["Copies of important documents (insurance, ID, bank records)", "Cash and credit cards", "Emergency contact information", "Medical information and prescriptions", "Property deeds and insurance papers"] },
  { category: "Clothing & Personal", items: ["Change of clothing and sturdy shoes", "Sleeping bags and blankets", "Personal hygiene items", "Prescription medications", "Glasses and contact lens supplies", "Items for infants/elderly members"] },
];

const DEFAULT_CONTACTS: Contact[] = [
  { category: "Emergency Services", number: "911", description: "Police, Fire, and Medical response" },
  { category: "Poison Control", number: "1-800-222-1222", description: "Toxicological emergencies" },
  { category: "Red Cross", number: "1-800-RED-CROSS", description: "Disaster relief and support" },
];

const GUIDE_CONTENT: Record<string, { title: string; sections: { title: string; items: string[] }[] }> = {
  earthquake: { title: "Earthquake Safety Guide", sections: [{ title: "Before the event", items: ["Secure heavy furniture and appliances", "Prepare emergency kit and supplies", "Plan family meeting places"] }, { title: "During the event", items: ["Drop, Cover, and Hold On", "Stay away from windows and exterior walls", "If outdoors, move to open area"] }, { title: "After the event", items: ["Check for injuries and provide first aid", "Turn off utilities if leaks suspected", "Expect aftershocks and inspect hazards"] }] },
  flood: { title: "Flood Preparedness Guide", sections: [{ title: "Before the event", items: ["Know your flood risk and evacuation routes", "Prepare sandbags and elevate valuables", "Store clean water and supplies"] }, { title: "During the event", items: ["Move to higher ground immediately", "Avoid driving through floodwaters", "Disconnect electricity if safe"] }, { title: "After the event", items: ["Avoid contact with contaminated water", "Document damage and contact authorities", "Dry and disinfect affected areas"] }] },
  wildfire: { title: "Wildfire Response Guide", sections: [{ title: "Before the event", items: ["Create defensible space around home", "Prepare go-bag and fuel vehicles", "Monitor local alerts"] }, { title: "During the event", items: ["Follow official evacuation orders", "Wear protective masks for smoke", "Drive with headlights on"] }, { title: "After the event", items: ["Return only when cleared by authorities", "Check for hotspots and smoldering", "Photograph damage for insurance"] }] },
  hurricane: { title: "Hurricane Readiness Guide", sections: [{ title: "Before the event", items: ["Board windows and secure outdoor items", "Store water, food, and medications", "Identify local shelters"] }, { title: "During the event", items: ["Shelter in small interior room", "Monitor trusted advisories", "Use flashlights, avoid open flames"] }, { title: "After the event", items: ["Beware of downed power lines", "Use generators outdoors only", "Check neighbors and share updates"] }] },
  "power-outage": { title: "Grid Failure Support", sections: [{ title: "Before the event", items: ["Back up batteries and power banks", "Stock shelf-stable food and water", "Acquire coolers and ice packs"] }, { title: "During the event", items: ["Keep refrigerator and freezer closed", "Use flashlights instead of candles", "Unplug sensitive electronics"] }, { title: "After the event", items: ["Check food safety; discard unsafe items", "Restock supplies and update plan", "Report persistent outages"] }] }
};

export default function Resources() {
  const { user } = useAuth();
  const [active, setActive] = useState<string>("guides");
  const [search, setSearch] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

  const downloadGuide = (id: string) => {
    const detail = GUIDE_CONTENT[id];
    if (!detail) return;
    const content = `${detail.title}\n\n${detail.sections.map(s => `${s.title}\n${s.items.map(i => `- ${i}`).join('\n')}`).join('\n\n')}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.title}.txt`;
    a.click();
    toast.success("Packet downloaded successfully");
  };

  const filteredGuides = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GUIDES.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
  }, [search]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await apiFetch("contacts-list.php");
        const data = await res.json();
        if (Array.isArray(data)) setContacts(data);
      } catch (e) { toast.error("Using offline contact list"); }
    };
    fetchContacts();
  }, []);

  return (
    <div className="tactical-page">
      <PageMeta title="Emergency Resources | E-LigtasMo" description="Access safety guides, survival kits, and important contacts." />
      
      <div className="tactical-container">
        
        {/* Header */}
        <div className="tactical-header">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div>
              <div className="tactical-status-pill mb-4">
                <div className="tactical-status-dot bg-blue-500 animate-pulse" />
                <span>INTEL_REPOSITORY: ACTIVE</span>
              </div>
              <h1 className="tactical-title">Emergency Resources</h1>
              <p className="tactical-subtitle">Essential safety guides, survival checklists, and contact intelligence for sector preparedness.</p>
            </div>

            <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
              {[
                { id: 'guides', label: 'SAFETY_GUIDES', icon: <FiBookOpen /> },
                { id: 'kit', label: 'SURVIVAL_KIT', icon: <FiPackage /> },
                { id: 'contacts', label: 'CONTACT_LIST', icon: <FiPhone /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`h-11 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 ${active === tab.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-10">
          {active === 'guides' && (
            <div className="space-y-10">
              <div className="tactical-search-group max-w-xl mb-0">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="SEARCH_INTEL_REPOSITORY..."
                    className="tactical-input w-full pl-12"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="tactical-grid">
                {filteredGuides.map(guide => (
                  <div key={guide.id} className="tactical-card flex flex-col h-full group">
                    <div className="tactical-card-header">
                       <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${guide.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        {guide.priority}_PRIORITY
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">{guide.category}</span>
                    </div>
                    <div className="tactical-card-body flex-grow flex flex-col">
                      <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{guide.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-grow font-medium">{guide.description}</p>
                      
                      <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                        <button onClick={() => setOpenGuideId(guide.id)} className="tactical-button-accent flex-1 h-11 text-[10px]">
                          <FiBookOpen /> READ_PROTOCOL
                        </button>
                        {guide.downloadable && (
                          <button onClick={() => downloadGuide(guide.id)} className="tactical-icon-container hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                            <FiDownload />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'kit' && (
            <div className="tactical-card">
              <div className="tactical-card-header">
                 <div className="flex items-center gap-3">
                    <div className="tactical-icon-container w-8 h-8 bg-amber-50 text-amber-600 border-amber-100"><FiPackage size={16} /></div>
                    <span className="tactical-label mb-0">Survival_Kit_Checklist</span>
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">72_HOUR_PROTOCOL</span>
              </div>
              <div className="tactical-card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {KIT.map(cat => (
                    <div key={cat.category} className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                         {cat.category}
                      </h4>
                      <ul className="space-y-3">
                        {cat.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:bg-white hover:border-blue-100 transition-all">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0 group-hover:bg-blue-400 transition-colors" />
                            <span className="text-xs font-medium text-slate-600 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {active === 'contacts' && (
            <div className="tactical-card">
               <div className="tactical-card-header">
                  <div className="flex items-center gap-3">
                    <div className="tactical-icon-container w-8 h-8 bg-blue-50 text-blue-600 border-blue-100"><FiPhone size={16} /></div>
                    <span className="tactical-label mb-0">Emergency_Comms_Channels</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Global_Reach</span>
               </div>
               <div className="tactical-card-body">
                <div className="tactical-grid">
                   {contacts.map((c, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                         <div>
                            <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{c.category}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">{c.description}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-base font-bold text-slate-900 tabular-nums">{c.number}</span>
                            <button onClick={() => window.open(`tel:${c.number}`)} className="tactical-icon-container bg-slate-900 text-white border-slate-800 hover:bg-blue-600 shadow-md"><FiPhone size={14} /></button>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-12 flex justify-between items-center border-t border-slate-200">
           <div className="flex items-center gap-3">
              <FiShield className="text-slate-300" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Safety Protocol Repository Link Active</span>
           </div>
           <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">
              Updated {new Date().toLocaleDateString()} • v4.2.0
           </div>
        </div>
      </div>

      {/* Guide Detail Modal */}
      {openGuideId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[2000] p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{GUIDE_CONTENT[openGuideId]?.title}</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Emergency Preparedness Protocol</p>
                 </div>
                 <button onClick={() => setOpenGuideId(null)} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm"><FiX size={20} /></button>
              </div>
              <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
                 {GUIDE_CONTENT[openGuideId]?.sections.map((s, idx) => (
                    <div key={idx} className="space-y-4">
                       <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-3 bg-blue-500 rounded-full" />
                          {s.title}
                       </h4>
                       <ul className="space-y-3 ml-3">
                          {s.items.map((item, i) => (
                             <li key={i} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-2 shrink-0" />
                                <span className="text-[15px] text-slate-600 leading-relaxed">{item}</span>
                             </li>
                          ))}
                       </ul>
                    </div>
                 ))}
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex gap-4">
                 <button onClick={() => window.print()} className="flex-1 h-12 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><FiPrinter size={18} /> Print Guide</button>
                 <button onClick={() => downloadGuide(openGuideId)} className="flex-1 h-12 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><FiDownload size={18} /> Download Info</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
