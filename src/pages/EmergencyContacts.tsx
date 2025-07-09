import React from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaPhone, FaMapMarkerAlt, FaClock, FaExclamationTriangle, FaUser, FaEnvelope } from 'react-icons/fa';

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

// --- Barangay Coordinators Data (migrated from BarangayCoordinators.tsx) ---
interface BarangayCoordinator {
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
}

const barangayCoordinators: BarangayCoordinator[] = [
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
];

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
  const [tab, setTab] = React.useState<'all' | 'coordinators' | 'contacts'>('all');
  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  // Filtering logic
  const filteredContacts = tab === 'all'
    ? emergencyContacts
    : tab === 'contacts'
      ? emergencyContacts
      : [];
  const filteredCoordinators = tab === 'all'
    ? barangayCoordinators
    : tab === 'coordinators'
      ? barangayCoordinators
      : [];

  return (
    <>
      <PageMeta
        title="Emergency Contacts | E-LigtasMo"
        description="Emergency contact numbers for police, fire, ambulance, and other emergency services."
      />
      <div className="min-h-screen w-full bg-[#fafbfc] space-y-6 px-2 py-4 md:px-8">
        {/* Tabs for filtering */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
          <button onClick={() => setTab('contacts')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'contacts' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Emergency Contacts</button>
          <button onClick={() => setTab('coordinators')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'coordinators' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Barangay Coordinators</button>
        </div>

        {/* Compact Header Widget */}
        <div className="flex items-center gap-3 bg-red-50 border-l-4 border-red-200 rounded-lg px-4 py-2 mb-2">
          <FaExclamationTriangle className="text-red-500 text-lg" />
          <div>
            <div className="font-bold text-base text-red-800">Emergency Contacts</div>
            <div className="text-xs text-red-700">Important emergency numbers for immediate assistance</div>
          </div>
        </div>

        {/* Compact Quick Call Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => handleCall('911')}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors min-h-[48px]"
          >
            <FaPhone className="text-base" /> Call 911
          </button>
          <button
            onClick={() => handleCall('143')}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors min-h-[48px]"
          >
            <FaPhone className="text-base" /> Red Cross 143
          </button>
          <button
            onClick={() => handleCall('136')}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-sm transition-colors min-h-[48px]"
          >
            <FaPhone className="text-base" /> MMDA 136
          </button>
        </div>

        {/* All Emergency Contacts List */}
        {filteredContacts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">All Emergency Contacts</h2>
            <p className="text-sm text-gray-500">Click on any contact to call immediately</p>
          </div>
          <div>
            {filteredContacts.map((contact, idx) => (
              <div key={contact.id} className={`flex flex-col sm:flex-row items-start sm:items-center px-4 py-4 ${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900 text-base">{contact.name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getTypeColor(contact.type)}`}>{contact.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getPriorityColor(contact.priority)}`}>{contact.priority}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{contact.description}</div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2"><FaMapMarkerAlt className="text-xs" /> {contact.address}</div>
                    <div className="flex items-center gap-2"><FaClock className="text-xs" /> {contact.hours}</div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-4 w-full sm:w-auto">
                  <button
                    onClick={() => handleCall(contact.phone)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors min-h-[44px]"
                  >
                    <FaPhone className="text-sm" /> {contact.phone}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Barangay Coordinators List */}
        {filteredCoordinators.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-1">Barangay Coordinators</h2>
            <p className="text-sm text-gray-500">Directory of coordinators and emergency contacts for your barangay.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoordinators.map(coordinator => (
              <div key={coordinator.id} className="bg-white rounded-xl shadow p-6 flex flex-col gap-3 border-t-4 border-blue-600">
                <div className="flex items-center gap-3 mb-2">
                  <FaUser className="text-blue-600 text-2xl" />
                  <div>
                    <div className="font-bold text-lg">{coordinator.coordinator_name}</div>
                    <div className="text-sm text-gray-500">{coordinator.coordinator_position}</div>
                  </div>
                  <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${coordinator.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{coordinator.status.toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2"><FaPhone className="text-gray-400" /> {coordinator.phone}</div>
                  <div className="flex items-center gap-2"><FaEnvelope className="text-gray-400" /> {coordinator.email}</div>
                  <div className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400" /> {coordinator.address}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-red-700 font-semibold">
                    <FaExclamationTriangle className="text-red-500" /> Emergency Contact:
                    <span className="font-bold text-lg">{coordinator.emergency_contact}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold text-xs text-gray-500 mb-1">Responsibilities:</div>
                  <div className="flex flex-wrap gap-2">
                    {coordinator.responsibilities.map((resp, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium">{resp}</span>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Last updated: {new Date(coordinator.last_updated).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Emergency Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Emergency Tips</h3>
          <ul className="space-y-2 text-blue-700">
            <li>• Stay calm and speak clearly when calling emergency services</li>
            <li>• Provide your exact location and describe the emergency</li>
            <li>• Follow the dispatcher's instructions</li>
            <li>• Keep emergency numbers saved in your phone</li>
            <li>• Share your location with emergency responders if possible</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default EmergencyContacts; 