import React, { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import { FaSearch, FaDownload, FaBookOpen, FaChevronDown, FaChevronRight, FaPhone, FaPrint } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { logActivity, LogActions, ResourceTypes } from "../utils/logger";

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
  { id: "earthquake", title: "Earthquake Safety", description: "What to do before, during, and after an earthquake", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "flood", title: "Flood Preparedness", description: "Preparation and response for flooding events", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "wildfire", title: "Wildfire Evacuation", description: "Evacuation planning and fire safety measures", category: "Natural Disaster", priority: "high", downloadable: true },
  { id: "hurricane", title: "Hurricane Preparedness", description: "Comprehensive hurricane preparation guide", category: "Natural Disaster", priority: "medium", downloadable: true },
  { id: "power-outage", title: "Extended Power Outages", description: "Surviving and preparing for power outages", category: "Infrastructure", priority: "medium" },
];

const KIT: KitCategory[] = [
  {
    category: "Basic Supplies",
    items: [
      "Water (1 gallon per person per day for 3+ days)",
      "Non-perishable food (3+ day supply)",
      "Battery-powered or hand crank radio",
      "Flashlight and extra batteries",
      "First aid kit",
      "Whistle for signaling help",
      "Dust masks and plastic sheeting",
      "Moist towelettes and garbage bags",
      "Wrench or pliers to turn off utilities",
      "Manual can opener",
      "Local maps",
      "Cell phone with chargers and backup battery",
    ],
  },
  {
    category: "Documents & Money",
    items: [
      "Copies of important documents (insurance, ID, bank records)",
      "Cash and credit cards",
      "Emergency contact information",
      "Medical information and prescriptions",
      "Property deeds and insurance papers",
    ],
  },
  {
    category: "Clothing & Personal Items",
    items: [
      "Change of clothing and sturdy shoes",
      "Sleeping bags and blankets",
      "Personal hygiene items",
      "Prescription medications",
      "Glasses and contact lens supplies",
      "Items for infants/elderly/disabled family members",
    ],
  },
];

const DEFAULT_CONTACTS: Contact[] = [
  { category: "Emergency Services", number: "911", description: "Police, Fire, Medical" },
  { category: "Poison Control", number: "1-800-222-1222", description: "Poisoning emergencies" },
  { category: "Red Cross", number: "1-800-RED-CROSS", description: "Disaster relief" },
  { category: "FEMA", number: "1-800-621-3362", description: "Federal disaster assistance" },
];

type GuideDetailSection = { title: string; items: string[] };
type GuideDetail = { title: string; sections: GuideDetailSection[] };

const GUIDE_CONTENT: Record<string, GuideDetail> = {
  earthquake: {
    title: "Earthquake Safety",
    sections: [
      { title: "Before", items: [
        "Secure heavy furniture and appliances",
        "Prepare an emergency kit and supplies",
        "Plan family meeting places and out-of-area contact"
      ]},
      { title: "During", items: [
        "Drop, Cover, and Hold On",
        "Stay away from windows and exterior walls",
        "If outdoors, move to open area away from buildings"
      ]},
      { title: "After", items: [
        "Check for injuries and provide first aid",
        "Turn off utilities if you suspect leaks or damage",
        "Expect aftershocks and inspect your home for hazards"
      ]}
    ]
  },
  flood: {
    title: "Flood Preparedness",
    sections: [
      { title: "Before", items: [
        "Know your flood risk and evacuation routes",
        "Prepare sandbags and elevate valuables",
        "Store clean water and essential supplies"
      ]},
      { title: "During", items: [
        "Move to higher ground immediately",
        "Avoid driving through floodwaters",
        "Disconnect electricity if safe to do so"
      ]},
      { title: "After", items: [
        "Avoid contact with floodwater due to contamination",
        "Document damage and contact authorities",
        "Dry and disinfect affected areas thoroughly"
      ]}
    ]
  },
  wildfire: {
    title: "Wildfire Evacuation",
    sections: [
      { title: "Before", items: [
        "Create defensible space around your home",
        "Prepare a go-bag and keep vehicles fueled",
        "Monitor alerts and set up multiple notifications"
      ]},
      { title: "During", items: [
        "Follow official evacuation orders promptly",
        "Wear protective masks to reduce smoke inhalation",
        "Drive with headlights on and watch for responders"
      ]},
      { title: "After", items: [
        "Return only when authorities say it is safe",
        "Check for hotspots and smoldering areas",
        "Photograph damage and contact insurance"
      ]}
    ]
  },
  hurricane: {
    title: "Hurricane Preparedness",
    sections: [
      { title: "Before", items: [
        "Board windows and secure loose outdoor items",
        "Store water, food, and medications",
        "Plan evacuation and identify shelters"
      ]},
      { title: "During", items: [
        "Shelter in a small interior room away from windows",
        "Monitor trusted advisories",
        "Avoid using candles; use flashlights"
      ]},
      { title: "After", items: [
        "Beware of downed power lines and standing water",
        "Use generators outdoors and away from openings",
        "Check neighbors and share updates"
      ]}
    ]
  },
  "power-outage": {
    title: "Extended Power Outages",
    sections: [
      { title: "Before", items: [
        "Back up batteries and charge power banks",
        "Stock shelf-stable food and safe water",
        "Acquire coolers and ice packs"
      ]},
      { title: "During", items: [
        "Keep refrigerator and freezer closed",
        "Use flashlights instead of candles",
        "Unplug sensitive electronics"
      ]},
      { title: "After", items: [
        "Check food safety; discard unsafe items",
        "Restock supplies and update your plan",
        "Report persistent outages to utilities"
      ]}
    ]
  }
};

const Tabs = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const btn = (v: string, label: string) => (
    <button
      onClick={() => onChange(v)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
        value === v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn("guides", "Emergency Guides")}
      {btn("kit", "Emergency Kit")}
      {btn("contacts", "Important Contacts")}
      
    </div>
  );
};

export default function Resources() {
  const { user } = useAuth();
  const role = user?.role || "resident";
  const isAdmin = role === "admin";

  const [active, setActive] = useState<string>("guides");
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [newContact, setNewContact] = useState<Contact>({ category: "", number: "", description: "" });
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

  const openGuide = (id: string) => setOpenGuideId(id);
  const closeGuide = () => setOpenGuideId(null);
  const getGuideDetail = (id: string) => GUIDE_CONTENT[id];
  const downloadGuide = (id: string) => {
    const detail = getGuideDetail(id);
    if (!detail) return;
    const lines: string[] = [];
    lines.push(detail.title);
    detail.sections.forEach((s) => {
      lines.push(`\n${s.title}`);
      s.items.forEach((i) => lines.push(`- ${i}`));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printGuide = (id: string) => {
    const detail = getGuideDetail(id);
    if (!detail) return;
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${detail.title}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #111827; padding: 24px; }
        h1 { font-size: 24px; margin: 0 0 16px; }
        h2 { font-size: 18px; margin: 20px 0 8px; }
        ul { margin: 0; padding-left: 18px; }
        li { margin: 6px 0; }
        .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
      </style>
    </head><body>
      <h1>${detail.title}</h1>
      <div class="meta">Emergency Guides</div>
      ${detail.sections.map(s => `<section><h2>${s.title}</h2><ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul></section>`).join('')}
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 300);
  };

  const filteredGuides = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GUIDES;
    return GUIDES.filter(
      (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleCat = (cat: string) => setOpen((p) => ({ ...p, [cat]: !p[cat] }));

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await apiFetch("contacts-list.php");
        const data = await res.json();
        if (Array.isArray(data)) {
          setContacts(
            data.map((c: any) => ({
              id: c.id,
              category: c.category,
              number: c.number,
              description: c.description || "",
              type: c.type || undefined,
              priority: c.priority || undefined,
            }))
          );
        }
      } catch (e) {
        // Fallback to defaults if API unavailable
        setContacts(DEFAULT_CONTACTS);
      }
    };
    fetchContacts();
  }, []);


  const addContact = async () => {
    if (!newContact.category || !newContact.number) return;
    try {
      const res = await apiFetch("contacts-add.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newContact.category,
          number: newContact.number,
          description: newContact.description,
          created_by: user?.username,
          created_brgy: user?.brgy_name,
        }),
      });
      const saved = await res.json();
      if (saved && saved.id) {
        setContacts((prev) => [saved, ...prev]);
        // Log contact creation
        logActivity(
          LogActions.CONTACT_CREATE,
          `Added contact ${saved.category} (${saved.number})`,
          ResourceTypes.EMERGENCY_CONTACT,
          String(saved.id)
        );
      }
      setNewContact({ category: "", number: "", description: "" });
    } catch (e) {
      alert("Error: Could not save contact to the database.");
    }
  };

  const deleteContact = async (id?: number) => {
    if (!id) return;
    try {
      await apiFetch("contacts-delete.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setContacts((prev) => prev.filter((c) => c.id !== id));
      // Log contact deletion
      logActivity(
        LogActions.CONTACT_DELETE,
        `Deleted contact ${id}`,
        ResourceTypes.EMERGENCY_CONTACT,
        String(id)
      );
    } catch (e) {
      alert("Error: Could not delete contact from the database.");
    }
  };

  return (
    <div className="w-full">
      <PageMeta title="Emergency Guides | E-LigtasMo" description="Guides, emergency kit, and contacts for preparedness" />

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Guides</h1>
        <p className="text-gray-600">Essential guides and checklists to help you prepare for emergencies</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <Tabs value={active} onChange={setActive} />
      </div>

      {active === "guides" && (
        <section className="space-y-6">
          <div className="relative">
            <input
              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search emergency guides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <div key={guide.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{guide.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${guide.priority === "high" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {guide.priority === "high" ? "HIGH PRIORITY" : "MEDIUM"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{guide.description}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{guide.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openGuide(guide.id)} className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg hover:bg-black">
                    <FaBookOpen />
                    Read Guide
                  </button>
                  {guide.downloadable && (
                    <button onClick={() => downloadGuide(guide.id)} className="inline-flex items-center justify-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" title="Download">
                      <FaDownload />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      

      {active === "kit" && (
        <section className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 text-orange-600">⚠️</span>
                <h2 className="text-lg font-semibold">Emergency Kit Checklist</h2>
              </div>
              <p className="text-sm text-gray-600">Build a comprehensive emergency kit to sustain your family for at least 72 hours</p>
            </div>
            <div className="p-4 space-y-4">
              {KIT.map((cat) => (
                <div key={cat.category} className="border rounded-lg">
                  <button onClick={() => toggleCat(cat.category)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">{cat.items.length} items</span>
                    </div>
                    {open[cat.category] ? <FaChevronDown className="text-gray-500" /> : <FaChevronRight className="text-gray-500" />}
                  </button>
                  {open[cat.category] && (
                    <div className="px-6 pb-3">
                      <ul className="space-y-2">
                        {cat.items.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">Tip: Store your emergency kit in an easily accessible location and check/update supplies every 6 months.</div>
            </div>
          </div>
        </section>
      )}

      {active === "contacts" && (
        <section className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-2">Emergency Contact Numbers</h2>
            <p className="text-sm text-gray-600 mb-4">Keep these important numbers readily available</p>

            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.id ?? `${c.category}-${c.number}`} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.category}</div>
                    <div className="text-xs text-gray-500">{c.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tracking-wide">{c.number}</span>
                    <a href={`tel:${c.number}`} className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black">
                      <FaPhone />
                      Call
                    </a>
                    {isAdmin && c.id !== undefined && (
                      <button
                        onClick={() => deleteContact(c.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">Add Contact (admin)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Category" value={newContact.category} onChange={(e) => setNewContact({ ...newContact, category: e.target.value })} />
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Number" value={newContact.number} onChange={(e) => setNewContact({ ...newContact, number: e.target.value })} />
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Description" value={newContact.description} onChange={(e) => setNewContact({ ...newContact, description: e.target.value })} />
                </div>
                <div className="mt-3">
                  <button onClick={addContact} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Contact</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-2">Personal Emergency Contacts</h3>
            <div className="border-2 border-dashed rounded-lg p-4 text-gray-500 text-sm">Add your emergency contacts</div>
            {isAdmin && (
              <div className="mt-3">
                <button className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black">
                  <FaPhone />
                  Add Contact
                </button>
              </div>
            )}
          </div>
        </section>
      )}
      {openGuideId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={closeGuide} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-gray-200">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="text-lg font-semibold">{getGuideDetail(openGuideId)?.title}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadGuide(openGuideId)} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FaDownload />
                    Download
                  </button>
                  <button onClick={() => printGuide(openGuideId)} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FaPrint />
                    Print/PDF
                  </button>
                  <button onClick={closeGuide} className="inline-flex items-center px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black">Close</button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {getGuideDetail(openGuideId)?.sections.map((s, idx) => (
                  <div key={`${s.title}-${idx}`} className="border rounded-lg">
                    <div className="px-4 py-3 font-medium">{s.title}</div>
                    <div className="px-6 pb-3">
                      <ul className="space-y-2">
                        {s.items.map((item, iidx) => (
                          <li key={`${iidx}`} className="flex items-center gap-2 text-sm">
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
