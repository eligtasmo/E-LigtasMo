import React, { useState } from 'react';
import ModernNavBar from '../components/navigation/ModernNavBar';

const NavigationDemo: React.FC = () => {
  const [notificationCount, setNotificationCount] = useState(5);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Emergency Alert', message: 'Flood warning in Barangay San Jose', time: '2 min ago', type: 'emergency' },
    { id: 2, title: 'Route Update', message: 'New safe route available to City Hall', time: '15 min ago', type: 'info' },
    { id: 3, title: 'System Update', message: 'EligTasmo system maintenance scheduled', time: '1 hour ago', type: 'system' },
    { id: 4, title: 'Weather Alert', message: 'Heavy rain expected this afternoon', time: '2 hours ago', type: 'weather' },
    { id: 5, title: 'Community Notice', message: 'Barangay meeting tomorrow at 2 PM', time: '3 hours ago', type: 'community' }
  ]);

  const handleNotificationClick = () => {
    alert(`You have ${notificationCount} notifications!`);
    // In a real app, this would open a notification panel
  };

  const handleProfileClick = () => {
    alert('Opening profile page...');
    // In a real app, this would navigate to profile
  };

  const handleLogout = () => {
    alert('Logging out...');
    // In a real app, this would handle logout
  };

  const clearNotifications = () => {
    setNotificationCount(0);
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'emergency':
        return '🚨';
      case 'weather':
        return '🌧️';
      case 'system':
        return '⚙️';
      case 'community':
        return '👥';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="w-full">
      {/* Navigation Bar */}
      <ModernNavBar
        userRole="admin"
        userName="John Doe"
        userEmail="john.doe@eligtasmo.com"
        notificationCount={notificationCount}
        onNotificationClick={handleNotificationClick}
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="w-full py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Modern Navigation Bar Demo
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Features Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Features</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Responsive design for mobile and desktop
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Notification icon with badge counter next to profile
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Profile dropdown with user information
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Active route highlighting
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Mobile-friendly hamburger menu
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Modern EligTasmo branding
                </li>
              </ul>
            </div>

            {/* Notification Panel */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Notifications ({notificationCount})
                </h2>
                {notificationCount > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {notifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
            <div className="text-blue-800 space-y-2">
              <p>• Click the notification bell icon (🔔) next to the profile to see notification alerts</p>
              <p>• Click on the profile section to access user menu with profile and logout options</p>
              <p>• Navigate through different sections using the main navigation items</p>
              <p>• On mobile devices, use the hamburger menu to access navigation items</p>
              <p>• The notification badge shows the current count of unread notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationDemo;