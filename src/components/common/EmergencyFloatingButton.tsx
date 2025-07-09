import React, { useState } from 'react';
import { FaPhone, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const EmergencyFloatingButton: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const emergencyNumbers = [
    { name: '911', number: '911', color: 'bg-red-600 hover:bg-red-700', description: 'Emergency Hotline' },
    { name: 'Red Cross', number: '143', color: 'bg-green-600 hover:bg-green-700', description: 'Medical Emergency' },
    { name: 'MMDA', number: '136', color: 'bg-blue-600 hover:bg-blue-700', description: 'Traffic & Rescue' },
    { name: 'PNP', number: '911', color: 'bg-purple-600 hover:bg-purple-700', description: 'Police Emergency' },
  ];

  const handleCall = (number: string) => {
    window.open(`tel:${number}`, '_self');
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Emergency Contacts Panel */}
      {isExpanded && (
        <div className="mb-4 bg-white rounded-lg shadow-lg border border-red-200 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-red-800 flex items-center">
              <FaExclamationTriangle className="mr-2" />
              Emergency Contacts
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="space-y-2">
            {emergencyNumbers.map((contact, index) => (
              <button
                key={index}
                onClick={() => handleCall(contact.number)}
                className={`w-full ${contact.color} text-white p-3 rounded-lg flex items-center justify-between transition-colors`}
              >
                <div className="text-left">
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm opacity-90">{contact.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{contact.number}</div>
                  <FaPhone className="ml-auto" />
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-3 p-2 bg-red-50 rounded text-xs text-red-700">
            <strong>Emergency Tips:</strong> Stay calm, provide your exact location, and follow dispatcher instructions.
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isExpanded 
            ? 'bg-gray-600 hover:bg-gray-700 text-white' 
            : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
        }`}
        aria-label="Emergency Contacts"
      >
        {isExpanded ? <FaTimes size={24} /> : <FaPhone size={24} />}
      </button>
    </div>
  );
};

export default EmergencyFloatingButton; 