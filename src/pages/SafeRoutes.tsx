import React from 'react';
import RoutesView from '../components/saferoutes/RoutesView';
import RoutePlannerAdminDashboard from '../components/saferoutes/RoutePlannerAdminDashboard';
import { useAuth } from '../context/AuthContext';

const SafeRoutes = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Full-screen planner: remove page paddings and cards so the planner
  // sits directly under the navbar and next to the sidebar with no gaps.
  return (
    <div className="relative w-full">
      {/* Admin dashboard section shown only for admin role */}
      {isAdmin && (
        <div className="mb-4">
          <RoutePlannerAdminDashboard />
        </div>
      )}
      
      {/* Planner: fullscreen for everyone to show the map immediately */}
      <div className="relative h-full">
        <RoutesView fullscreen={true} initialCollapsed={false} initialTab={isAdmin ? 'planner' : 'saved'} />
      </div>
    </div>
  );
};

export default SafeRoutes;
