import React from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaPhone, FaMapMarkerAlt, FaClock, FaExclamationTriangle } from 'react-icons/fa';

interface EmergencyContact {
  id: number;
  name: string;
  type: 'police' | 'fire' | 'ambulance' | 'rescue' | 'disaster' | 'other';
  phone: string;
  address: string;
  hours: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const emergencyContacts: EmergencyContact[] = [
  {
    id: 1,
    name: "Philippine National Police (PNP)",
    type: "police",
    phone: "911",
    address: "Camp Crame, Quezon City",
    hours: "24/7",
    description: "National emergency hotline for police assistance",
    priority: "high"
  },
  {
    id: 2,
    name: "Bureau of Fire Protection (BFP)",
    type: "fire",
    phone: "911",
    address: "Agham Road, Quezon City",
    hours: "24/7",
    description: "Fire emergency response",
    priority: "high"
  },
  {
    id: 3,
    name: "Philippine Red Cross",
    type: "ambulance",
    phone: "143",
    address: "Bonifacio Drive, Port Area, Manila",
    hours: "24/7",
    description: "Emergency medical services and disaster response",
    priority: "high"
  },
  {
    id: 4,
    name: "Metro Manila Development Authority (MMDA)",
    type: "rescue",
    phone: "136",
    address: "EDSA, Makati City",
    hours: "24/7",
    description: "Traffic management and emergency response",
    priority: "high"
  },
  {
    id: 5,
    name: "National Disaster Risk Reduction and Management Council (NDRRMC)",
    type: "disaster",
    phone: "911-1406",
    address: "Camp Aguinaldo, Quezon City",
    hours: "24/7",
    description: "National disaster coordination center",
    priority: "high"
  },
  {
    id: 6,
    name: "Department of Health (DOH) Hotline",
    type: "other",
    phone: "1555",
    address: "San Lazaro Compound, Manila",
    hours: "24/7",
    description: "Health-related emergencies and information",
    priority: "medium"
  },
  {
    id: 7,
    name: "Philippine Coast Guard",
    type: "rescue",
    phone: "527-8481",
    address: "Port Area, Manila",
    hours: "24/7",
    description: "Maritime search and rescue",
    priority: "medium"
  },
  {
    id: 8,
    name: "Department of Social Welfare and Development (DSWD)",
    type: "disaster",
    phone: "931-8101",
    address: "Batasan Road, Quezon City",
    hours: "8:00 AM - 5:00 PM",
    description: "Social services and disaster relief",
    priority: "medium"
  }
];

// --- Barangay Coordinators Data (migrated from BarangayCoordinators.tsx)
// Interface is kept for reference but wrapped in comments to avoid linter warnings.
/* interface BarangayCoordinator {
  id: number;
  barangay_name: string;
  city: string;
  province: string;
  coordinator_name: string;
  coordinator_position: string;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'inactive';
  emergency_contact: string;
  responsibilities: string[];
  last_updated: string;
} */

// NOTE: Barangay coordinators are displayed in their dedicated page/sidebar now.
// Keeping the type for potential future imports, but removing the unused dataset.
/* const barangayCoordinators: BarangayCoordinator[] = [
  {
    id: 1,
    barangay_name: "Bagumbayan",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Juan Dela Cruz",
    coordinator_position: "Barangay Captain",
    phone: "0917-123-4567",
    email: "juan.delacruz@bagumbayan.gov.ph",
    address: "123 Bagumbayan St., Taguig City",
    status: "active",
    emergency_contact: "0917-123-4568",
    responsibilities: ["Disaster Response", "Community Safety", "Emergency Coordination"],
    last_updated: "2024-01-15"
  },
  {
    id: 2,
    barangay_name: "Bambang",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Maria Santos",
    coordinator_position: "Barangay Councilor",
    phone: "0917-987-6543",
    email: "maria.santos@bambang.gov.ph",
    address: "456 Bambang Ave., Taguig City",
    status: "active",
    emergency_contact: "0917-987-6544",
    responsibilities: ["Flood Monitoring", "Evacuation Planning", "Shelter Management"],
    last_updated: "2024-01-10"
  },
  {
    id: 3,
    barangay_name: "Calzada",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Pedro Reyes",
    coordinator_position: "Barangay Captain",
    phone: "0918-555-1234",
    email: "pedro.reyes@calzada.gov.ph",
    address: "789 Calzada Road, Taguig City",
    status: "active",
    emergency_contact: "0918-555-1235",
    responsibilities: ["Traffic Management", "Road Safety", "Incident Response"],
    last_updated: "2024-01-12"
  },
  {
    id: 4,
    barangay_name: "Hagonoy",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Ana Garcia",
    coordinator_position: "Barangay Secretary",
    phone: "0919-777-8888",
    email: "ana.garcia@hagonoy.gov.ph",
    address: "321 Hagonoy Blvd., Taguig City",
    status: "inactive",
    emergency_contact: "0919-777-8889",
    responsibilities: ["Documentation", "Communication", "Resource Management"],
    last_updated: "2023-12-20"
  },
  {
    id: 5,
    barangay_name: "Ibayo-Tipas",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Roberto Mendoza",
    coordinator_position: "Barangay Captain",
    phone: "0920-111-2222",
    email: "roberto.mendoza@ibayotipas.gov.ph",
    address: "654 Ibayo St., Taguig City",
    status: "active",
    emergency_contact: "0920-111-2223",
    responsibilities: ["Community Outreach", "Emergency Training", "Coordination"],
    last_updated: "2024-01-08"
  },
  {
    id: 6,
    barangay_name: "Ligid-Tipas",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Carmen Lopez",
    coordinator_position: "Barangay Councilor",
    phone: "0921-333-4444",
    email: "carmen.lopez@ligidtipas.gov.ph",
    address: "987 Ligid Road, Taguig City",
    status: "active",
    emergency_contact: "0921-333-4445",
    responsibilities: ["Health Services", "Sanitation", "Medical Emergency"],
    last_updated: "2024-01-14"
  },
  {
    id: 7,
    barangay_name: "Lower Bicutan",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Fernando Torres",
    coordinator_position: "Barangay Captain",
    phone: "0922-555-6666",
    email: "fernando.torres@lowerbicutan.gov.ph",
    address: "147 Lower Bicutan St., Taguig City",
    status: "active",
    emergency_contact: "0922-555-6667",
    responsibilities: ["Security", "Peace and Order", "Emergency Response"],
    last_updated: "2024-01-11"
  },
  {
    id: 8,
    barangay_name: "New Lower Bicutan",
    city: "Taguig",
    province: "Metro Manila",
    coordinator_name: "Isabel Rodriguez",
    coordinator_position: "Barangay Councilor",
    phone: "0923-777-8888",
    email: "isabel.rodriguez@newlowerbicutan.gov.ph",
    address: "258 New Lower Bicutan Ave., Taguig City",
    status: "active",
    emergency_contact: "0923-777-8889",
    responsibilities: ["Youth Programs", "Education", "Community Development"],
    last_updated: "2024-01-09"
  }
]; */

const getTypeColor = (type: EmergencyContact['type']) => {
  switch (type) {
    case 'police': return 'bg-blue-100 text-blue-800';
    case 'fire': return 'bg-red-100 text-red-800';
    case 'ambulance': return 'bg-green-100 text-green-800';
    case 'rescue': return 'bg-orange-100 text-orange-800';
    case 'disaster': return 'bg-purple-100 text-purple-800';
    case 'other': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: EmergencyContact['priority']) => {
  switch (priority) {
    case 'high': return 'bg-red-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const EmergencyContacts: React.FC = () => {
  const [selectedContact, setSelectedContact] = React.useState<any | null>(null);
  const [hotlines, setHotlines] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchHotlines();
  }, []);

  const fetchHotlines = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/hotlines-list.php`);
      const data = await res.json();
      if (data.success) setHotlines(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <>
      <PageMeta
        title="Emergency Hotlines | E-LigtasMo"
        description="Emergency contact numbers for police, fire, medical, and rescue services."
      />
      <div className="w-full">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-200 rounded-lg px-6 py-4 mb-4">
            <FaExclamationTriangle className="text-red-500 text-xl" />
            <div>
              <div className="font-bold text-xl text-red-800">Emergency Contacts</div>
              <div className="text-sm text-red-700">Important emergency numbers for immediate assistance</div>
            </div>
          </div>

          {/* Quick Call Buttons - Professional Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Quick Emergency Contacts</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                onClick={() => handleCall('911')}
                className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">Emergency</div>
                    <div className="text-xs opacity-90">911</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCall('143')}
                className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">Red Cross</div>
                    <div className="text-xs opacity-90">143</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCall('136')}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">MMDA</div>
                    <div className="text-xs opacity-90">136</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCall('117')}
                className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">Fire Dept</div>
                    <div className="text-xs opacity-90">117</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCall('527-8481')}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">Coast Guard</div>
                    <div className="text-xs opacity-90">527-8481</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCall('931-8101')}
                className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center gap-2">
                  <FaPhone className="text-xl" />
                  <div className="text-center">
                    <div className="font-bold text-sm">DSWD</div>
                    <div className="text-xs opacity-90">931-8101</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Emergency Contacts Cards Grid */}
          <div className="xl:col-span-3">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
              </div>
            ) : hotlines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotlines.map((contact) => (
                    <div
                      key={contact.id}
                      className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 hover:shadow-md cursor-pointer h-full flex flex-col ${
                        selectedContact?.id === contact.id 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="p-5 flex flex-col h-full">
                    {/* Header with badges */}
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-800`}>
                          {contact.category}
                        </span>
                      </div>
                    </div>

                    {/* Contact Name */}
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{contact.name}</h3>
                    
                    {/* Contact Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FaPhone className="text-xs flex-shrink-0" />
                        <span>{contact.number}</span>
                      </div>
                    </div>

                    {/* Call Button - Always at bottom */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCall(contact.number); }}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md transform hover:scale-[1.02] mt-auto"
                    >
                      <FaPhone className="text-sm" /> Call Now
                    </button>
                  </div>
                     </div>
                   ))}
                 </div>
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 italic">No emergency contacts found.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="xl:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Selected Contact Details */}
              {selectedContact && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Details</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{selectedContact.name}</h4>
                      <p className="text-sm text-gray-600">{selectedContact.description}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <FaMapMarkerAlt className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{selectedContact.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaClock className="text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{selectedContact.hours}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCall(selectedContact.phone)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 transition-colors mt-4"
                    >
                      <FaPhone className="text-sm" /> Call {selectedContact.phone}
                    </button>
                  </div>
                </div>
              )}

              {/* Emergency Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-blue-800 mb-3">Emergency Tips</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Stay calm and speak clearly when calling emergency services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Provide your exact location and describe the emergency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Follow the dispatcher's instructions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Keep emergency numbers saved in your phone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>Share your location with responders if possible</span>
                  </li>
                </ul>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Contacts</span>
                    <span className="font-semibold text-gray-900">{filteredContacts.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">24/7 Services</span>
                    <span className="font-semibold text-gray-900">
                      {filteredContacts.filter(c => c.hours === '24/7').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High Priority</span>
                    <span className="font-semibold text-red-600">
                      {filteredContacts.filter(c => c.priority === 'high').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default EmergencyContacts;