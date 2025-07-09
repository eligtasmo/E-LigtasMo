import React, { useState, useEffect } from 'react';
import PageMeta from "../components/common/PageMeta";
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser, FaSearch, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

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

// Mock data - in real app, this would come from API
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

const statusColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
};

const BarangayCoordinators: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  const userBarangay = user.brgy_name;
  // Only show coordinators for the user's barangay
  const coordinators = barangayCoordinators.filter(c => c.barangay_name === userBarangay);

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <>
      <PageMeta
        title={`Barangay Coordinators for ${userBarangay} | E-LigtasMo`}
        description={`Directory of coordinators for ${userBarangay}.`}
      />
      <div className="px-4 py-6 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Barangay Coordinators for {userBarangay}</h1>
          <p className="text-gray-500">Directory of coordinators and emergency contacts for your barangay.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coordinators.length === 0 && (
            <div className="col-span-full text-gray-400 text-center py-12 text-lg">No coordinators found for your barangay.</div>
          )}
          {coordinators.map(coordinator => (
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
    </>
  );
};

export default BarangayCoordinators; 