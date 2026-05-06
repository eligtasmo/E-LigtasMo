import React from 'react';
import { FiSmartphone, FiShield, FiExternalLink } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const WebAccessRestricted: React.FC = () => {
  const { user, logout } = useAuth();

  // If user is admin or brgy, they shouldn't be here
  if (user && (user.role === 'admin' || user.role === 'brgy')) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/brgy'} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-jetbrains">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-white p-8 flex flex-col items-center text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-blue-600/5 rounded-2xl flex items-center justify-center mb-6 border border-blue-600/10">
            <FiShield className="text-blue-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase mb-2 italic">
            Access Restricted
          </h1>
          <p className="text-gray-500 text-sm font-bold">
            The E-LigtasMo Web Portal is reserved for command-level operations only.
          </p>
        </div>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="bg-blue-50 p-6 rounded-2xl mb-8 border border-blue-100">
            <FiSmartphone className="text-blue-600 w-12 h-12 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Resident Mobile App</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Residents must use our high-fidelity mobile application for real-time reporting, route planning, and emergency alerts.
            </p>
          </div>

          <div className="space-y-4 w-full">
            <button
              onClick={() => logout()}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-black tracking-widest uppercase text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Sign Out and Switch Account
            </button>
            
            <a 
              href="#" 
              className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              Download Mobile App <FiExternalLink />
            </a>
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Security Protocol Active</span>
        </div>
      </div>
    </div>
  );
};

export default WebAccessRestricted;
