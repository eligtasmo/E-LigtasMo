import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaMapMarkerAlt, FaClock, FaUser, FaTrash, FaEye, FaSync, FaTruck } from 'react-icons/fa';
import { BiError, BiTime, BiMap } from 'react-icons/bi';

interface Incident {
  id: number;
  type: string;
  lat: number;
  lng: number;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  address: string;
  datetime: string;
  description: string;
  reporter: string;
  status: string;
  // Added PH flood-related fields for consistency
  flood_level_cm?: number;
  allowed_vehicles?: string;
}

interface DuplicateGroup {
  incident1: Incident;
  incident2: Incident;
  similarity_score: number;
  distance_meters: number;
  time_diff_minutes: number;
}

const DuplicateIncidentManager: React.FC = () => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/detect-duplicate-incidents.php?action=detect');
      const data = await response.json();
      if (data.success) {
        setDuplicateGroups(data.duplicate_groups || []);
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
    }
    setLoading(false);
  };

  const mergeDuplicates = async (incident1Id: number, incident2Id: number) => {
    const groupKey = `${incident1Id}_${incident2Id}`;
    setMerging(groupKey);
    try {
      const response = await fetch(`/api/detect-duplicate-incidents.php?action=merge&merge_ids=${incident1Id},${incident2Id}`);
      const data = await response.json();
      if (data.success) {
        // Remove the merged group from the list
        setDuplicateGroups(prev => prev.filter(group => 
          !(group.incident1.id === incident1Id && group.incident2.id === incident2Id) &&
          !(group.incident1.id === incident2Id && group.incident2.id === incident1Id)
        ));
        alert(`Incidents merged successfully! Primary incident: #${data.primary_id}`);
      } else {
        alert(`Error merging incidents: ${data.error}`);
      }
    } catch (error) {
      console.error('Error merging incidents:', error);
      alert('Error merging incidents');
    }
    setMerging(null);
  };

  const getSeverityColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 80) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString();
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters.toFixed(0)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-orange-500 text-2xl" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Duplicate Incident Manager</h2>
                <p className="text-gray-600 mt-1">Detect and manage duplicate incident reports</p>
              </div>
            </div>
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FaSync className={loading ? 'animate-spin' : ''} />
              {loading ? 'Scanning...' : 'Scan for Duplicates'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Scanning for duplicate incidents...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <BiError className="text-gray-400 text-6xl mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Duplicates Found</h3>
              <p className="text-gray-600">Great! No duplicate incidents were detected in the system.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <FaExclamationTriangle className="text-yellow-600" />
                  <span className="font-semibold text-yellow-800">
                    {duplicateGroups.length} potential duplicate group(s) found
                  </span>
                </div>
                <p className="text-yellow-700 text-sm">
                  Review each group carefully before merging. Merging will combine the incidents and mark duplicates as resolved.
                </p>
              </div>

              {duplicateGroups.map((group, index) => {
                const groupKey = `${group.incident1.id}_${group.incident2.id}`;
                const isMerging = merging === groupKey;
                
                return (
                  <div key={groupKey} className={`border rounded-lg p-6 ${getSeverityColor(group.similarity_score)}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">Group #{index + 1}</span>
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white">
                          {group.similarity_score}% similarity
                        </span>
                        <span className="text-sm text-gray-600">
                          {formatDistance(group.distance_meters)} apart • {group.time_diff_minutes}min difference
                        </span>
                      </div>
                      <button
                        onClick={() => mergeDuplicates(group.incident1.id, group.incident2.id)}
                        disabled={isMerging}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {isMerging ? 'Merging...' : 'Merge Incidents'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Incident 1 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Incident #{group.incident1.id}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            group.incident1.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            group.incident1.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {group.incident1.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <BiError className="text-gray-400" />
                            <span className="font-medium">{group.incident1.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaUser className="text-gray-400" />
                            <span>{group.incident1.reporter}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BiTime className="text-gray-400" />
                            <span>{formatDateTime(group.incident1.datetime)}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <BiMap className="text-gray-400 mt-0.5" />
                            <span>{group.incident1.address}</span>
                          </div>
                          <div className="mt-3 p-3 bg-gray-50 rounded text-gray-700">
                            {group.incident1.description}
                          </div>
                          {group.incident1.type && group.incident1.type.toLowerCase() === 'flood' && typeof group.incident1.flood_level_cm === 'number' && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                              <BiError className="text-blue-500" />
                              <span>Flood level: {group.incident1.flood_level_cm} cm</span>
                            </div>
                          )}
                          {group.incident1.type && group.incident1.type.toLowerCase() === 'flood' && group.incident1.allowed_vehicles && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FaTruck className="text-green-500" />
                              <span>Passable vehicles: {group.incident1.allowed_vehicles}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Incident 2 */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">Incident #{group.incident2.id}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            group.incident2.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            group.incident2.status === 'Approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {group.incident2.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <BiError className="text-gray-400" />
                            <span className="font-medium">{group.incident2.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaUser className="text-gray-400" />
                            <span>{group.incident2.reporter}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BiTime className="text-gray-400" />
                            <span>{formatDateTime(group.incident2.datetime)}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <BiMap className="text-gray-400 mt-0.5" />
                            <span>{group.incident2.address}</span>
                          </div>
                          <div className="mt-3 p-3 bg-gray-50 rounded text-gray-700">
                            {group.incident2.description}
                          </div>
                          {group.incident2.type && group.incident2.type.toLowerCase() === 'flood' && typeof group.incident2.flood_level_cm === 'number' && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                              <BiError className="text-blue-500" />
                              <span>Flood level: {group.incident2.flood_level_cm} cm</span>
                            </div>
                          )}
                          {group.incident2.type && group.incident2.type.toLowerCase() === 'flood' && group.incident2.allowed_vehicles && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <FaTruck className="text-green-500" />
                              <span>Passable vehicles: {group.incident2.allowed_vehicles}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuplicateIncidentManager;
