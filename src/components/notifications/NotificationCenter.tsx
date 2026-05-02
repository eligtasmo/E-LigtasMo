import React, { useState, useEffect, useCallback } from 'react';
import {
  FaBell,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimes,
  FaEye,
  FaTrash,
  FaFilter,
  FaSearch,
  FaCog,
  FaVolumeUp,
  FaVolumeMute,
  FaMapMarkerAlt,
  FaClock,
  FaUser,
  FaRoute,
  FaShieldAlt,
  FaCloudRain,
  FaFire,
  FaAmbulance,
  FaCarCrash
} from 'react-icons/fa';
import {
  MdNotifications,
  MdNotificationsActive,
  MdNotificationsOff,
  MdPriorityHigh,
  MdWarning,
  MdInfo,
  MdCheckCircle,
  MdError,
  MdClose,
  MdSettings,
  MdFilterList,
  MdSearch,
  MdLocationOn,
  MdAccessTime,
  MdPerson
} from 'react-icons/md';

interface Notification {
  id: string;
  type: 'emergency' | 'warning' | 'info' | 'success' | 'route' | 'weather' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  actionUrl?: string;
  metadata?: {
    incidentId?: string;
    routeId?: string;
    userId?: string;
    severity?: string;
  };
  expiresAt?: Date;
  sound?: boolean;
  persistent?: boolean;
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  sms: boolean;
  types: {
    emergency: boolean;
    warning: boolean;
    info: boolean;
    route: boolean;
    weather: boolean;
    system: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    sms: false,
    types: {
      emergency: true,
      warning: true,
      info: true,
      route: true,
      weather: true,
      system: false
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      critical: true
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00'
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock notifications data
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'emergency',
      priority: 'critical',
      title: 'Major Incident Alert',
      message: 'Multiple vehicle collision on EDSA Northbound. Emergency services dispatched.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isRead: false,
      location: {
        lat: 14.5547,
        lng: 121.0244,
        address: 'EDSA Northbound, Quezon City'
      },
      metadata: {
        incidentId: 'INC-2024-001',
        severity: 'major'
      },
      sound: true,
      persistent: true
    },
    {
      id: '2',
      type: 'warning',
      priority: 'high',
      title: 'Heavy Traffic Alert',
      message: 'Unusual traffic congestion detected on C5 Road. Consider alternative routes.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      isRead: false,
      location: {
        lat: 14.5764,
        lng: 121.0851,
        address: 'C5 Road, Pasig City'
      },
      actionUrl: '/routes/alternative'
    },
    {
      id: '3',
      type: 'weather',
      priority: 'medium',
      title: 'Weather Advisory',
      message: 'Thunderstorms expected in Metro Manila. Exercise caution while traveling.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      isRead: true,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
    },
    {
      id: '4',
      type: 'route',
      priority: 'low',
      title: 'Route Optimization',
      message: 'New faster route discovered for your daily commute. Save 8 minutes!',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      isRead: true,
      metadata: {
        routeId: 'ROUTE-001'
      },
      actionUrl: '/routes/optimize'
    },
    {
      id: '5',
      type: 'success',
      priority: 'low',
      title: 'Incident Resolved',
      message: 'Road closure on Ortigas Avenue has been cleared. Normal traffic flow resumed.',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      isRead: true,
      location: {
        lat: 14.5865,
        lng: 121.0644,
        address: 'Ortigas Avenue, Pasig City'
      }
    }
  ];

  // Initialize notifications
  useEffect(() => {
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Simulate real-time notifications
  useEffect(() => {
    if (!settings.enabled) return;

    const interval = setInterval(() => {
      // Simulate new notification
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: ['emergency', 'warning', 'info', 'route'][Math.floor(Math.random() * 4)] as any,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          title: 'New Alert',
          message: 'This is a simulated real-time notification.',
          timestamp: new Date(),
          isRead: false
        };

        addNotification(newNotification);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [settings.enabled]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Play sound if enabled
    if (settings.sound && notification.sound !== false) {
      playNotificationSound();
    }

    // Show desktop notification
    if (settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }, [settings.sound, settings.desktop]);

  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(() => {
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'critical' ? 'text-red-600' : 
                     priority === 'high' ? 'text-orange-600' :
                     priority === 'medium' ? 'text-yellow-600' : 'text-blue-600';

    switch (type) {
      case 'emergency':
        return <FaExclamationTriangle className={iconClass} />;
      case 'warning':
        return <MdWarning className={iconClass} />;
      case 'info':
        return <MdInfo className={iconClass} />;
      case 'success':
        return <MdCheckCircle className="text-green-600" />;
      case 'route':
        return <FaRoute className={iconClass} />;
      case 'weather':
        return <FaCloudRain className={iconClass} />;
      case 'system':
        return <MdSettings className={iconClass} />;
      default:
        return <FaBell className={iconClass} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[priority as keyof typeof colors]}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter !== 'all' && notification.type !== filter) return false;
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          {settings.enabled ? (
            unreadCount > 0 ? (
              <MdNotificationsActive className="text-xl text-blue-600" />
            ) : (
              <MdNotifications className="text-xl" />
            )
          ) : (
            <MdNotificationsOff className="text-xl text-gray-400" />
          )}
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FaBell className="text-blue-600" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <MdSettings />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <MdClose />
                  </button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <MdSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="emergency">Emergency</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                  <option value="route">Route</option>
                  <option value="weather">Weather</option>
                </select>
              </div>

              {/* Quick Actions */}
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FaBell className="text-3xl text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <MdAccessTime />
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              {notification.location && (
                                <span className="flex items-center gap-1">
                                  <MdLocationOn />
                                  {notification.location.address}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                                  title="Mark as read"
                                >
                                  <FaEye className="text-xs" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                title="Delete"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MdClose />
                </button>
              </div>

              <div className="space-y-6">
                {/* General Settings */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">General</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enable notifications</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.sound}
                        onChange={(e) => setSettings(prev => ({ ...prev, sound: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Sound alerts</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.desktop}
                        onChange={(e) => setSettings(prev => ({ ...prev, desktop: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Desktop notifications</span>
                    </label>
                  </div>
                </div>

                {/* Notification Types */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Types</h4>
                  <div className="space-y-2">
                    {Object.entries(settings.types).map(([type, enabled]) => (
                      <label key={type} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            types: { ...prev.types, [type]: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationCenter;
