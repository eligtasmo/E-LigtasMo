import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
} from 'chart.js';
import {
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaUsers,
  FaExclamationTriangle,
  FaShieldAlt,
  FaRoute,
  FaClock,
  FaMapMarkerAlt,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaDownload,
  FaFilter,
  FaCalendarAlt,
  FaBell,
  FaSync,
  FaExpand,

  FaEquals
} from 'react-icons/fa';
import {
  MdDashboard,
  MdAnalytics,
  MdInsights,
  MdTrendingUp,
  MdWarning,
  MdSecurity,
  MdTraffic,
  MdLocationOn
} from 'react-icons/md';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType;
  color: string;
  description: string;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AnalyticsDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['incidents', 'routes', 'safety', 'traffic']);
  const [isRealTime, setIsRealTime] = useState(true);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Mock data for analytics
  const keyMetrics: MetricCard[] = [
    {
      id: 'incidents',
      title: 'Active Incidents',
      value: 12,
      change: -15.2,
      trend: 'down',
      icon: FaExclamationTriangle,
      color: 'red',
      description: 'Total active emergency incidents'
    },
    {
      id: 'routes',
      title: 'Routes Planned',
      value: '2.4K',
      change: 23.1,
      trend: 'up',
      icon: FaRoute,
      color: 'blue',
      description: 'Routes planned today'
    },
    {
      id: 'safety',
      title: 'Safety Score',
      value: '94.2%',
      change: 2.8,
      trend: 'up',
      icon: FaShieldAlt,
      color: 'green',
      description: 'Overall safety rating'
    },
    {
      id: 'response',
      title: 'Avg Response Time',
      value: '4.2 min',
      change: -8.5,
      trend: 'down',
      icon: FaClock,
      color: 'orange',
      description: 'Average emergency response time'
    },
    {
      id: 'users',
      title: 'Active Users',
      value: '1.8K',
      change: 12.3,
      trend: 'up',
      icon: FaUsers,
      color: 'purple',
      description: 'Currently active users'
    },
    {
      id: 'coverage',
      title: 'Area Coverage',
      value: '98.7%',
      change: 0.5,
      trend: 'stable',
      icon: FaMapMarkerAlt,
      color: 'indigo',
      description: 'Geographic coverage area'
    }
  ];

  const recentAlerts: AlertItem[] = [
    {
      id: '1',
      type: 'error',
      title: 'Major Incident Detected',
      message: 'Multiple vehicle accident on EDSA Northbound',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      location: 'EDSA, Quezon City',
      severity: 'critical'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Heavy Traffic Alert',
      message: 'Unusual traffic congestion detected',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      location: 'C5 Road, Pasig',
      severity: 'medium'
    },
    {
      id: '3',
      type: 'info',
      title: 'Route Optimization',
      message: 'New optimal route discovered',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      location: 'Makati CBD',
      severity: 'low'
    },
    {
      id: '4',
      type: 'success',
      title: 'Incident Resolved',
      message: 'Road closure has been cleared',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      location: 'Ortigas Avenue',
      severity: 'low'
    }
  ];

  // Chart data
  const incidentTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Incidents',
        data: [12, 19, 8, 15, 6, 9, 14],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Resolved',
        data: [8, 15, 12, 18, 9, 11, 16],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const routeUsageData = {
    labels: ['Highway', 'City Roads', 'Residential', 'Expressway', 'Coastal'],
    datasets: [{
      data: [35, 25, 20, 15, 5],
      backgroundColor: [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6'
      ],
      borderWidth: 0,
    }]
  };

  const safetyMetricsData = {
    labels: ['Safety Score', 'Response Time', 'Coverage', 'User Satisfaction', 'Incident Prevention'],
    datasets: [{
      label: 'Current',
      data: [94, 85, 98, 92, 88],
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: '#22c55e',
      borderWidth: 2,
    }, {
      label: 'Target',
      data: [95, 90, 99, 95, 90],
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3b82f6',
      borderWidth: 2,
    }]
  };

  const trafficFlowData = {
    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Traffic Volume',
      data: [20, 15, 10, 8, 12, 25, 45, 65, 80, 75, 70, 72, 78, 82, 85, 88, 92, 95, 85, 70, 55, 40, 30, 25],
      backgroundColor: 'rgba(249, 115, 22, 0.8)',
      borderColor: '#f97316',
      borderWidth: 1,
    }]
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <FaArrowUp className="text-green-500" />;
      case 'down': return <FaArrowDown className="text-red-500" />;
      default: return <FaEquals className="text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <FaExclamationTriangle className="text-red-500" />;
      case 'warning': return <MdWarning className="text-orange-500" />;
      case 'info': return <MdInsights className="text-blue-500" />;
      case 'success': return <FaShieldAlt className="text-green-500" />;
      default: return <FaBell className="text-gray-500" />;
    }
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

  return (
    <div className="flex flex-col">
      {/* Strategic Intelligence Header */}
      <div className="bg-slate-900 -mx-4 -mt-4 mb-8 p-8 border-b border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <FaShieldAlt size={160} className="text-white" />
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-600/40 border border-emerald-500/30 group hover:scale-105 transition-transform duration-500">
              <MdAnalytics className="text-3xl text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">
                Strategic <span className="text-emerald-500">Intelligence</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                Data Analysis Matrix // LIVE_TELEMETRY
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="bg-slate-800/50 rounded-xl px-4 py-2 border border-slate-700/50 backdrop-blur-md flex items-center gap-3">
               <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Scope:</span>
               <select
                 className="text-[10px] bg-transparent text-white font-black uppercase outline-none cursor-pointer"
                 value={selectedTimeRange}
                 onChange={(e) => setSelectedTimeRange(e.target.value)}
               >
                 <option value="1d">24 Hours</option>
                 <option value="7d">Week</option>
                 <option value="30d">Month</option>
               </select>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRealTime(!isRealTime)}
                className={`px-6 py-3 rounded-xl font-black tracking-widest text-[10px] uppercase transition-all flex items-center gap-3 shadow-lg ${
                  isRealTime 
                    ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isRealTime ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                {isRealTime ? 'Real_Time_Sync' : 'Analysis_Paused'}
              </button>
              
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black tracking-widest text-[10px] uppercase shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                <FaDownload className="text-xs" /> Export_Packet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tactical Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
        {keyMetrics.map((metric) => {
          const IconComponent = metric.icon as any;
          const color = metric.color === 'red' ? 'rose' : metric.color === 'green' ? 'emerald' : metric.color;
          
          return (
            <div
              key={metric.id}
              className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform`} />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 flex items-center justify-center text-${color}-600 border border-${color}-100/30 group-hover:bg-${color}-600 group-hover:text-white transition-all`}>
                  <IconComponent size={18} />
                </div>
                <div className={`flex items-center gap-1 text-[9px] font-black tracking-widest uppercase ${metric.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {metric.trend === 'up' ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1 tabular-nums">{metric.value}</div>
                <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{metric.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        {/* Incident Trends */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[11px] font-black text-slate-900 tracking-[0.2em] uppercase flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FaChartLine />
              </div>
              Temporal_Incident_Trends
            </h3>
            <button
              onClick={() => setExpandedChart(expandedChart === 'incidents' ? null : 'incidents')}
              className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <FaExpand size={12} />
            </button>
          </div>
          <div className="h-48 sm:h-56">
            <Line 
              data={incidentTrendData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      font: {
                        size: 10
                      }
                    }
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: '#f3f4f6'
                    },
                    ticks: {
                      font: {
                        size: 10
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 9
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>

        {/* Route Usage Distribution */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FaChartPie className="text-green-600 text-sm" />
              Route Usage
            </h3>
            <button
              onClick={() => setExpandedChart(expandedChart === 'routes' ? null : 'routes')}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaExpand className="text-xs" />
            </button>
          </div>
          <div className="h-48">
            <Doughnut 
              data={routeUsageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      font: {
                        size: 10
                      },
                      padding: 15
                    }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Safety Metrics Radar */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MdSecurity className="text-purple-600 text-sm" />
              Safety Metrics
            </h3>
            <button
              onClick={() => setExpandedChart(expandedChart === 'safety' ? null : 'safety')}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaExpand className="text-xs" />
            </button>
          </div>
          <div className="h-48">
            <Radar 
              data={safetyMetricsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                    labels: {
                      usePointStyle: true,
                      pointStyle: 'circle',
                      font: {
                        size: 10
                      }
                    }
                  },
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: '#f3f4f6'
                    },
                    pointLabels: {
                      font: {
                        size: 9
                      }
                    },
                    ticks: {
                      font: {
                        size: 8
                      }
                    }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Traffic Flow */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <MdTraffic className="text-orange-600 text-sm" />
              Traffic Flow (24h)
            </h3>
            <button
              onClick={() => setExpandedChart(expandedChart === 'traffic' ? null : 'traffic')}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaExpand className="text-xs" />
            </button>
          </div>
          <div className="h-48">
            <Bar 
              data={trafficFlowData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: '#f3f4f6'
                    },
                    ticks: {
                      font: {
                        size: 10
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      font: {
                        size: 9
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FaBell className="text-red-600" />
            Recent Alerts
          </h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-sm ${
                alert.severity === 'critical' ? 'border-red-500 bg-red-50/50' :
                alert.severity === 'high' ? 'border-orange-500 bg-orange-50/50' :
                alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50/50' :
                'border-blue-500 bg-blue-50/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 p-1.5 rounded-full ${
                  alert.severity === 'critical' ? 'bg-red-100' :
                  alert.severity === 'high' ? 'bg-orange-100' :
                  alert.severity === 'medium' ? 'bg-yellow-100' :
                  'bg-blue-100'
                }`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{alert.title}</h4>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{formatTimestamp(alert.timestamp)}</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{alert.message}</p>
                  {alert.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                      <MdLocationOn className="text-xs" />
                      <span className="truncate">{alert.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
