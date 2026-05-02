import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FaSearch,
  FaFilter,
  FaMapMarkerAlt,
  FaRoute,
  FaExclamationTriangle,
  FaShieldAlt,
  FaBuilding,
  FaUser,
  FaClock,
  FaCalendarAlt,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes,
  FaHistory,
  FaStar,
  FaBookmark,
  FaShare,
  FaDownload,
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaGlobe,
  FaRoad,
  FaHospital,
  FaSchool,
  FaShoppingCart,
  FaGasPump,
  FaParking
} from 'react-icons/fa';
import {
  MdSearch,
  MdFilterList,
  MdLocationOn,
  MdDirections,
  MdWarning,
  MdSecurity,
  MdBusiness,
  MdPerson,
  MdAccessTime,
  MdDateRange,
  MdSort,
  MdClear,
  MdHistory,
  MdStar,
  MdBookmark,
  MdShare,
  MdDownload,
  MdVisibility,
  MdExpandMore,
  MdExpandLess,
  MdPublic,
  MdDirectionsCar,
  MdLocalHospital,
  MdSchool,
  MdShoppingCart,
  MdLocalGasStation,
  MdLocalParking,
  MdRestaurant,
  MdHotel,
  MdAtm,
  MdLocalPharmacy
} from 'react-icons/md';

interface SearchResult {
  id: string;
  type: 'location' | 'route' | 'incident' | 'shelter' | 'poi' | 'user' | 'report';
  title: string;
  description: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  metadata?: {
    category?: string;
    severity?: string;
    status?: string;
    rating?: number;
    distance?: number;
    duration?: string;
    lastUpdated?: Date;
    tags?: string[];
  };
  thumbnail?: string;
  relevanceScore: number;
}

interface SearchFilters {
  types: string[];
  categories: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  location: {
    center: { lat: number; lng: number } | null;
    radius: number;
  };
  rating: {
    min: number;
    max: number;
  };
  status: string[];
  severity: string[];
  tags: string[];
  sortBy: 'relevance' | 'date' | 'distance' | 'rating' | 'name';
  sortOrder: 'asc' | 'desc';
}

interface SearchHistory {
  id: string;
  query: string;
  filters: Partial<SearchFilters>;
  timestamp: Date;
  resultCount: number;
}

const AdvancedSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SearchHistory[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    categories: [],
    dateRange: { start: null, end: null },
    location: { center: null, radius: 5 },
    rating: { min: 0, max: 5 },
    status: [],
    severity: [],
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc'
  });

  // Mock data
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'location',
      title: 'Quezon City Hall',
      description: 'Government building and administrative center of Quezon City',
      location: {
        lat: 14.6760,
        lng: 121.0437,
        address: 'Quezon City Hall, Quezon City, Metro Manila'
      },
      metadata: {
        category: 'government',
        rating: 4.2,
        distance: 2.5,
        tags: ['government', 'public service', 'landmark']
      },
      relevanceScore: 0.95
    },
    {
      id: '2',
      type: 'incident',
      title: 'Traffic Accident - EDSA Northbound',
      description: 'Multiple vehicle collision causing major traffic delays',
      location: {
        lat: 14.5547,
        lng: 121.0244,
        address: 'EDSA Northbound, Quezon City'
      },
      metadata: {
        category: 'traffic',
        severity: 'high',
        status: 'active',
        lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
        tags: ['accident', 'traffic', 'emergency']
      },
      relevanceScore: 0.88
    },
    {
      id: '3',
      type: 'route',
      title: 'Fastest Route to Makati CBD',
      description: 'Optimized route avoiding current traffic congestion',
      metadata: {
        category: 'navigation',
        duration: '45 minutes',
        distance: 18.5,
        rating: 4.7,
        tags: ['fast', 'optimized', 'business district']
      },
      relevanceScore: 0.82
    },
    {
      id: '4',
      type: 'shelter',
      title: 'Quezon City Emergency Shelter',
      description: 'Designated evacuation center with capacity for 500 people',
      location: {
        lat: 14.6507,
        lng: 121.0494,
        address: 'Barangay Holy Spirit, Quezon City'
      },
      metadata: {
        category: 'emergency',
        status: 'available',
        rating: 4.0,
        tags: ['evacuation', 'emergency', 'shelter']
      },
      relevanceScore: 0.75
    },
    {
      id: '5',
      type: 'poi',
      title: 'SM North EDSA',
      description: 'Large shopping mall and entertainment complex',
      location: {
        lat: 14.6563,
        lng: 121.0291,
        address: 'North Avenue, Quezon City'
      },
      metadata: {
        category: 'shopping',
        rating: 4.5,
        distance: 3.2,
        tags: ['shopping', 'mall', 'entertainment', 'dining']
      },
      relevanceScore: 0.70
    }
  ];

  const searchTypes = [
    { value: 'location', label: 'Locations', icon: MdLocationOn },
    { value: 'route', label: 'Routes', icon: MdDirections },
    { value: 'incident', label: 'Incidents', icon: MdWarning },
    { value: 'shelter', label: 'Shelters', icon: MdSecurity },
    { value: 'poi', label: 'Points of Interest', icon: MdBusiness },
    { value: 'user', label: 'Users', icon: MdPerson },
    { value: 'report', label: 'Reports', icon: MdBusiness }
  ];

  const categories = [
    { value: 'government', label: 'Government', icon: MdBusiness },
    { value: 'healthcare', label: 'Healthcare', icon: MdLocalHospital },
    { value: 'education', label: 'Education', icon: MdSchool },
    { value: 'shopping', label: 'Shopping', icon: MdShoppingCart },
    { value: 'dining', label: 'Dining', icon: MdRestaurant },
    { value: 'accommodation', label: 'Hotels', icon: MdHotel },
    { value: 'transportation', label: 'Transport', icon: MdDirectionsCar },
    { value: 'fuel', label: 'Gas Stations', icon: MdLocalGasStation },
    { value: 'parking', label: 'Parking', icon: MdLocalParking },
    { value: 'banking', label: 'ATM/Banks', icon: MdAtm },
    { value: 'pharmacy', label: 'Pharmacy', icon: MdLocalPharmacy },
    { value: 'emergency', label: 'Emergency', icon: MdWarning }
  ];

  const statusOptions = ['active', 'resolved', 'pending', 'investigating', 'closed'];
  const severityOptions = ['low', 'medium', 'high', 'critical'];

  // Perform search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    setIsSearching(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filteredResults = mockResults.filter(result => {
      // Text search
      if (searchQuery && !result.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !result.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (searchFilters.types.length > 0 && !searchFilters.types.includes(result.type)) {
        return false;
      }
      
      // Category filter
      if (searchFilters.categories.length > 0 && result.metadata?.category &&
          !searchFilters.categories.includes(result.metadata.category)) {
        return false;
      }
      
      // Status filter
      if (searchFilters.status.length > 0 && result.metadata?.status &&
          !searchFilters.status.includes(result.metadata.status)) {
        return false;
      }
      
      // Severity filter
      if (searchFilters.severity.length > 0 && result.metadata?.severity &&
          !searchFilters.severity.includes(result.metadata.severity)) {
        return false;
      }
      
      // Rating filter
      if (result.metadata?.rating &&
          (result.metadata.rating < searchFilters.rating.min ||
           result.metadata.rating > searchFilters.rating.max)) {
        return false;
      }
      
      return true;
    });
    
    // Sort results
    filteredResults.sort((a, b) => {
      let aValue, bValue;
      
      switch (searchFilters.sortBy) {
        case 'date':
          aValue = a.metadata?.lastUpdated?.getTime() || 0;
          bValue = b.metadata?.lastUpdated?.getTime() || 0;
          break;
        case 'distance':
          aValue = a.metadata?.distance || 0;
          bValue = b.metadata?.distance || 0;
          break;
        case 'rating':
          aValue = a.metadata?.rating || 0;
          bValue = b.metadata?.rating || 0;
          break;
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = a.relevanceScore;
          bValue = b.relevanceScore;
      }
      
      if (searchFilters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setResults(filteredResults);
    setIsSearching(false);
    
    // Add to search history
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      query: searchQuery,
      filters: searchFilters,
      timestamp: new Date(),
      resultCount: filteredResults.length
    };
    
    setSearchHistory(prev => [historyItem, ...prev.slice(0, 9)]);
  }, []);

  // Handle search
  const handleSearch = useCallback(() => {
    if (query.trim() || Object.values(filters).some(f => 
      Array.isArray(f) ? f.length > 0 : f !== null && f !== undefined
    )) {
      performSearch(query, filters);
    }
  }, [query, filters, performSearch]);

  // Auto-search on query change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        handleSearch();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const clearFilters = () => {
    setFilters({
      types: [],
      categories: [],
      dateRange: { start: null, end: null },
      location: { center: null, radius: 5 },
      rating: { min: 0, max: 5 },
      status: [],
      severity: [],
      tags: [],
      sortBy: 'relevance',
      sortOrder: 'desc'
    });
  };

  const saveSearch = () => {
    const searchItem: SearchHistory = {
      id: Date.now().toString(),
      query,
      filters,
      timestamp: new Date(),
      resultCount: results.length
    };
    
    setSavedSearches(prev => [searchItem, ...prev]);
  };

  const loadSearch = (searchItem: SearchHistory) => {
    setQuery(searchItem.query);
    setFilters(searchItem.filters as SearchFilters);
    setShowHistory(false);
    performSearch(searchItem.query, searchItem.filters as SearchFilters);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'location': return <MdLocationOn className="text-blue-600" />;
      case 'route': return <MdDirections className="text-green-600" />;
      case 'incident': return <MdWarning className="text-red-600" />;
      case 'shelter': return <MdSecurity className="text-purple-600" />;
      case 'poi': return <MdBusiness className="text-orange-600" />;
      case 'user': return <MdPerson className="text-gray-600" />;
      case 'report': return <MdBusiness className="text-indigo-600" />;
      default: return <MdSearch className="text-gray-600" />;
    }
  };

  const activeFiltersCount = useMemo(() => {
    return filters.types.length + 
           filters.categories.length + 
           filters.status.length + 
           filters.severity.length +
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
           (filters.location.center ? 1 : 0) +
           (filters.rating.min > 0 || filters.rating.max < 5 ? 1 : 0);
  }, [filters]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search locations, routes, incidents, shelters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <MdSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-gray-400" />
            {isSearching && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
              showFilters || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MdFilterList />
            Filters
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <MdHistory />
            History
          </button>
        </div>

        {/* Quick Type Filters */}
        <div className="flex flex-wrap gap-2">
          {searchTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                const newTypes = filters.types.includes(type.value)
                  ? filters.types.filter(t => t !== type.value)
                  : [...filters.types, type.value];
                setFilters(prev => ({ ...prev, types: newTypes }));
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filters.types.includes(type.value)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <type.icon className="text-sm" />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MdExpandLess />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories.map((category) => (
                  <label key={category.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category.value)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, category.value]
                          : filters.categories.filter(c => c !== category.value);
                        setFilters(prev => ({ ...prev, categories: newCategories }));
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <category.icon className="text-sm text-gray-500" />
                    <span className="text-sm text-gray-700">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={(e) => {
                        const newStatus = e.target.checked
                          ? [...filters.status, status]
                          : filters.status.filter(s => s !== status);
                        setFilters(prev => ({ ...prev, status: newStatus }));
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <div className="space-y-2">
                {severityOptions.map((severity) => (
                  <label key={severity} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.severity.includes(severity)}
                      onChange={(e) => {
                        const newSeverity = e.target.checked
                          ? [...filters.severity, severity]
                          : filters.severity.filter(s => s !== severity);
                        setFilters(prev => ({ ...prev, severity: newSeverity }));
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating Range</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.rating.min}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      rating: { ...prev.rating, min: parseFloat(e.target.value) }
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.rating.min}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={filters.rating.max}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      rating: { ...prev.rating, max: parseFloat(e.target.value) }
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{filters.rating.max}</span>
                </div>
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                </select>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      filters.sortOrder === 'asc'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FaSortAmountUp className="inline mr-1" /> Ascending
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      filters.sortOrder === 'desc'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FaSortAmountDown className="inline mr-1" /> Descending
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search History Panel */}
      {showHistory && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Search History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <MdExpandLess />
            </button>
          </div>

          <div className="space-y-3">
            {searchHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No search history yet</p>
            ) : (
              searchHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => loadSearch(item)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.query || 'Advanced Search'}</div>
                    <div className="text-sm text-gray-500">
                      {item.resultCount} results • {item.timestamp.toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavedSearches(prev => [item, ...prev]);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <MdBookmark />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results
              {results.length > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({results.length} found)
                </span>
              )}
            </h3>
            {query && (
              <button
                onClick={saveSearch}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <MdBookmark />
                Save Search
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <MdSearch className="text-4xl text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p>Try adjusting your search terms or filters</p>
            </div>
          ) : (
            results.map((result) => (
              <div key={result.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{result.title}</h4>
                      <div className="flex items-center gap-2">
                        {result.metadata?.rating && (
                          <div className="flex items-center gap-1">
                            <MdStar className="text-yellow-500" />
                            <span className="text-sm text-gray-600">{result.metadata.rating}</span>
                          </div>
                        )}
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                          {result.type}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{result.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {result.location && (
                          <span className="flex items-center gap-1">
                            <MdLocationOn />
                            {result.location.address}
                          </span>
                        )}
                        {result.metadata?.distance && (
                          <span>{result.metadata.distance} km away</span>
                        )}
                        {result.metadata?.lastUpdated && (
                          <span className="flex items-center gap-1">
                            <MdAccessTime />
                            {result.metadata.lastUpdated.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <MdVisibility />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                          <MdShare />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                          <MdBookmark />
                        </button>
                      </div>
                    </div>
                    
                    {result.metadata?.tags && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {result.metadata.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearch;