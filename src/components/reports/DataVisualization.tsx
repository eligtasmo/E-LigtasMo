import React, { useState, useEffect, useMemo } from 'react';
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
  Filler
} from 'chart.js';
import {
  Line,
  Bar,
  Doughnut,
  Pie,
  Radar,
  PolarArea,
  Scatter
} from 'react-chartjs-2';
import {
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaChartArea,
  FaDownload,
  FaShare,
  FaPrint,
  FaFilter,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaRoute,
  FaUsers,
  FaClock,

  FaArrowDown,
  FaEquals,
  FaEye,
  FaExpand,
  FaCompress,
  FaCog,
  FaTable,
  FaFileExport
} from 'react-icons/fa';
import {
  MdDashboard,
  MdAnalytics,
  MdInsights,
  MdTrendingUp,
  MdTrendingDown,
  MdShowChart,
  MdBarChart,
  MdPieChart,
  MdRadar,
  MdScatterPlot,
  MdTimeline,
  MdLocationOn,
  MdWarning,
  MdDirections,
  MdPeople,
  MdAccessTime,
  MdDateRange,
  MdFilterList,
  MdDownload,
  MdShare,
  MdPrint,
  MdFullscreen,
  MdFullscreenExit,
  MdRefresh,
  MdSettings,
  MdTableChart,
  MdFileDownload
} from 'react-icons/md';

// Register Chart.js components
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

interface DataPoint {
  label: string;
  value: number;
  timestamp?: Date;
  category?: string;
  metadata?: Record<string, any>;
}

interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'doughnut' | 'pie' | 'radar' | 'polar' | 'scatter';
  title: string;
  description: string;
  data: DataPoint[];
  options?: any;
  size: 'small' | 'medium' | 'large' | 'full';
  refreshInterval?: number;
}

interface ReportFilter {
  dateRange: {
    start: Date | null;
    end: Date | null;
    preset: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  };
  location: string[];
  category: string[];
  severity: string[];
  status: string[];
}

const DataVisualization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'reports'>('dashboard');
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'month'
    },
    location: [],
    category: [],
    severity: [],
    status: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for different chart types
  const mockChartConfigs: ChartConfig[] = [
    {
      id: 'incidents-trend',
      type: 'line',
      title: 'Incident Trends',
      description: 'Daily incident reports over time',
      size: 'large',
      data: Array.from({ length: 30 }, (_, i) => ({
        label: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: Math.floor(Math.random() * 50) + 10,
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
      })),
      refreshInterval: 300000 // 5 minutes
    },
    {
      id: 'incident-types',
      type: 'doughnut',
      title: 'Incident Types Distribution',
      description: 'Breakdown of incident types this month',
      size: 'medium',
      data: [
        { label: 'Traffic Accidents', value: 45, category: 'traffic' },
        { label: 'Road Closures', value: 23, category: 'infrastructure' },
        { label: 'Weather Related', value: 18, category: 'weather' },
        { label: 'Emergency Services', value: 14, category: 'emergency' }
      ]
    },
    {
      id: 'severity-levels',
      type: 'bar',
      title: 'Incident Severity Levels',
      description: 'Distribution of incident severity over the past week',
      size: 'medium',
      data: [
        { label: 'Low', value: 120, category: 'low' },
        { label: 'Medium', value: 85, category: 'medium' },
        { label: 'High', value: 45, category: 'high' },
        { label: 'Critical', value: 12, category: 'critical' }
      ]
    },
    {
      id: 'response-times',
      type: 'line',
      title: 'Average Response Times',
      description: 'Emergency response times by hour of day',
      size: 'large',
      data: Array.from({ length: 24 }, (_, i) => ({
        label: `${i}:00`,
        value: Math.floor(Math.random() * 20) + 5,
        category: 'response'
      }))
    },
    {
      id: 'location-hotspots',
      type: 'radar',
      title: 'Location Hotspots',
      description: 'Incident frequency by major areas',
      size: 'medium',
      data: [
        { label: 'EDSA', value: 85 },
        { label: 'C5', value: 72 },
        { label: 'SLEX', value: 68 },
        { label: 'NLEX', value: 55 },
        { label: 'Ortigas', value: 48 },
        { label: 'Makati CBD', value: 42 }
      ]
    },
    {
      id: 'route-efficiency',
      type: 'scatter',
      title: 'Route Efficiency Analysis',
      description: 'Distance vs. Travel Time correlation',
      size: 'large',
      data: Array.from({ length: 50 }, (_, i) => ({
        label: `Route ${i + 1}`,
        value: Math.random() * 100,
        metadata: {
          x: Math.random() * 50,
          y: Math.random() * 120 + 10
        }
      }))
    },
    {
      id: 'user-activity',
      type: 'bar',
      title: 'User Activity',
      description: 'Daily active users and route requests',
      size: 'medium',
      data: Array.from({ length: 7 }, (_, i) => ({
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        value: Math.floor(Math.random() * 1000) + 500
      }))
    },
    {
      id: 'safety-metrics',
      type: 'polar',
      title: 'Safety Metrics',
      description: 'Overall safety indicators',
      size: 'medium',
      data: [
        { label: 'Route Safety', value: 85 },
        { label: 'Response Time', value: 78 },
        { label: 'Coverage Area', value: 92 },
        { label: 'User Satisfaction', value: 88 },
        { label: 'System Reliability', value: 95 }
      ]
    }
  ];

  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>(mockChartConfigs);

  // Chart color schemes
  const colorSchemes = {
    primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
    secondary: ['#93C5FD', '#6EE7B7', '#FCD34D', '#FCA5A5', '#C4B5FD', '#67E8F9'],
    gradient: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(139, 92, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)'
    ]
  };

  // Generate chart data based on configuration
  const generateChartData = (config: ChartConfig) => {
    const { type, data } = config;
    
    switch (type) {
      case 'line':
        return {
          labels: data.map(d => d.label),
          datasets: [{
            label: config.title,
            data: data.map(d => d.value),
            borderColor: colorSchemes.primary[0],
            backgroundColor: colorSchemes.gradient[0],
            fill: true,
            tension: 0.4
          }]
        };
      
      case 'bar':
        return {
          labels: data.map(d => d.label),
          datasets: [{
            label: config.title,
            data: data.map(d => d.value),
            backgroundColor: colorSchemes.primary.slice(0, data.length),
            borderColor: colorSchemes.primary.slice(0, data.length),
            borderWidth: 1
          }]
        };
      
      case 'doughnut':
      case 'pie':
        return {
          labels: data.map(d => d.label),
          datasets: [{
            data: data.map(d => d.value),
            backgroundColor: colorSchemes.primary.slice(0, data.length),
            borderColor: colorSchemes.secondary.slice(0, data.length),
            borderWidth: 2
          }]
        };
      
      case 'radar':
        return {
          labels: data.map(d => d.label),
          datasets: [{
            label: config.title,
            data: data.map(d => d.value),
            backgroundColor: colorSchemes.gradient[0],
            borderColor: colorSchemes.primary[0],
            borderWidth: 2,
            pointBackgroundColor: colorSchemes.primary[0]
          }]
        };
      
      case 'polar':
        return {
          labels: data.map(d => d.label),
          datasets: [{
            data: data.map(d => d.value),
            backgroundColor: colorSchemes.gradient.slice(0, data.length),
            borderColor: colorSchemes.primary.slice(0, data.length),
            borderWidth: 1
          }]
        };
      
      case 'scatter':
        return {
          datasets: [{
            label: config.title,
            data: data.map(d => ({
              x: d.metadata?.x || d.value,
              y: d.metadata?.y || Math.random() * 100
            })),
            backgroundColor: colorSchemes.primary[0],
            borderColor: colorSchemes.primary[0]
          }]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  // Chart options
  const getChartOptions = (config: ChartConfig) => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: config.title,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      }
    };

    if (config.type === 'line' || config.type === 'bar') {
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      };
    }

    return baseOptions;
  };

  // Render chart component
  const renderChart = (config: ChartConfig) => {
    const data = generateChartData(config);
    const options = getChartOptions(config);

    switch (config.type) {
      case 'line':
        return <Line data={data as any} options={options as any} />;
      case 'bar':
        return <Bar data={data as any} options={options as any} />;
      case 'doughnut':
        return <Doughnut data={data as any} options={options as any} />;
      case 'pie':
        return <Pie data={data as any} options={options as any} />;
      case 'radar':
        return <Radar data={data as any} options={options as any} />;
      case 'polar':
        return <PolarArea data={data as any} options={options as any} />;
      case 'scatter':
        return <Scatter data={data as any} options={options as any} />;
      default:
        return null;
    }
  };

  // Get chart size classes
  const getChartSizeClass = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1 h-64';
      case 'medium':
        return 'col-span-1 md:col-span-2 h-80';
      case 'large':
        return 'col-span-1 md:col-span-3 h-96';
      case 'full':
        return 'col-span-1 md:col-span-4 h-[500px]';
      default:
        return 'col-span-1 md:col-span-2 h-80';
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update chart data with new mock data
    setChartConfigs(prev => prev.map(config => ({
      ...config,
      data: config.data.map(d => ({
        ...d,
        value: Math.floor(Math.random() * 100) + 10
      }))
    })));
    
    setRefreshing(false);
  };

  // Export data
  const exportData = (format: 'csv' | 'json' | 'pdf') => {
    // Implementation would depend on the format
  };

  // Key metrics calculation
  const keyMetrics = useMemo(() => {
    const totalIncidents = chartConfigs.find(c => c.id === 'incidents-trend')?.data.reduce((sum, d) => sum + d.value, 0) || 0;
    const responseTimeSum = chartConfigs.find(c => c.id === 'response-times')?.data?.reduce((sum, d) => sum + d.value, 0) || 0;
    const avgResponseTime = responseTimeSum / 24 || 0;
    const activeUsers = chartConfigs.find(c => c.id === 'user-activity')?.data.reduce((sum, d) => sum + d.value, 0) || 0;
    
    return {
      totalIncidents,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      activeUsers,
      safetyScore: 85.4
    };
  }, [chartConfigs]);

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <MdAnalytics className="text-blue-600" />
              Data Analytics & Reports
            </h1>
            <p className="text-gray-600 mt-1">Comprehensive insights and visualizations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <MdFilterList />
              Filters
            </button>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <MdRefresh className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => exportData('csv')}
                className="p-2 text-gray-600 hover:text-green-600 transition-colors"
                title="Export CSV"
              >
                <MdFileDownload />
              </button>
              <button
                onClick={() => exportData('pdf')}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="Export PDF"
              >
                <MdPrint />
              </button>
              <button
                onClick={() => exportData('json')}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Share"
              >
                <MdShare />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: MdDashboard },
            { id: 'analytics', label: 'Analytics', icon: MdShowChart },
            { id: 'reports', label: 'Reports', icon: MdTableChart }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.totalIncidents.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <MdWarning className="text-xl text-red-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <MdTrendingUp className="text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-600 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.avgResponseTime} min</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <MdAccessTime className="text-xl text-blue-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <MdTrendingDown className="text-green-500 mr-1" />
            <span className="text-green-600 font-medium">-8%</span>
            <span className="text-gray-600 ml-1">improvement</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.activeUsers.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <MdPeople className="text-xl text-green-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <MdTrendingUp className="text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+24%</span>
            <span className="text-gray-600 ml-1">this week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Score</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.safetyScore}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <MdInsights className="text-xl text-purple-600" />
            </div>
          </div>
          <div className="flex items-center mt-4 text-sm">
            <MdTrendingUp className="text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+3.2%</span>
            <span className="text-gray-600 ml-1">this quarter</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {chartConfigs.map((config) => (
          <div
            key={config.id}
            className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${getChartSizeClass(config.size)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
                <p className="text-sm text-gray-600">{config.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedChart(selectedChart === config.id ? null : config.id)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {selectedChart === config.id ? <MdFullscreenExit /> : <MdFullscreen />}
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <MdSettings />
                </button>
              </div>
            </div>
            
            <div className="h-full">
              {renderChart(config)}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Chart Modal */}
      {selectedChart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {chartConfigs.find(c => c.id === selectedChart)?.title}
              </h3>
              <button
                onClick={() => setSelectedChart(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MdFullscreenExit />
              </button>
            </div>
            <div className="p-6 h-full">
              {chartConfigs.find(c => c.id === selectedChart) && 
                renderChart(chartConfigs.find(c => c.id === selectedChart)!)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;
