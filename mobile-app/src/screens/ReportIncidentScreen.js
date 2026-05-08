import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator, Image as RNImage, ScrollView, Dimensions, StyleSheet, StatusBar as RNStatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';

import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import { Screen, Row, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';
import UniversalWebView from '../components/UniversalWebView';

const INCIDENT_TYPES = [
  { id: 'Flood', label: 'Flooding', icon: 'Waves', tone: '#F5B235' },
  { id: 'Fire', label: 'Fire', icon: 'Flame', tone: '#EF4444' },
  { id: 'Accident', label: 'Accident', icon: 'Car', tone: '#F59E0B' },
  { id: 'Medical', label: 'Medical', icon: 'HeartPulse', tone: '#F5B235' },
  { id: 'Crime', label: 'Security', icon: 'ShieldAlert', tone: '#F5B235' },
  { id: 'Other', label: 'Other', icon: 'CircleDot', tone: '#64748B' },
];

const SEVERITIES = [
  { id: 'Low', label: 'Low', tone: '#F5B235', desc: 'Minor' },
  { id: 'Moderate', label: 'Moderate', tone: '#F59E0B', desc: 'Significant' },
  { id: 'High', label: 'High', tone: '#EF4444', desc: 'Dangerous' },
];

const VEHICLE_TYPES = [
  { id: 'Walking', label: 'Walking', icon: 'Footprints' },
  { id: 'Motorcycle', label: 'Motorcycle', icon: 'Bike' },
  { id: 'Car', label: 'Car', icon: 'Car' },
  { id: 'Truck', label: 'Truck', icon: 'Truck' },
];

const formatDateTime = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const circleGeoJSON = (lat, lng, radiusM, steps = 64) => {
  const earthR = 6378137;
  const coords = Array.from({ length: steps }, (_, i) => {
    const angle = (i * 360) / steps;
    const rad = (angle * Math.PI) / 180;
    const dLat = (radiusM / earthR) * (180 / Math.PI) * Math.cos(rad);
    const dLng = (radiusM / (earthR * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI) * Math.sin(rad);
    return [lng + dLng, lat + dLat];
  });
  coords.push(coords[0]);
  return { type: 'Polygon', coordinates: [coords] };
};

const buildMapHtml = ({ currentCoords, incidentCoords, isDark, incidentLabel, drawMode, polygonPoints, radiusM, tacticalData }) => {
  const santaCruzLaguna = { lat: 14.2811, lng: 121.4150 };
  const center = incidentCoords || santaCruzLaguna;
  const initialZoom = incidentCoords ? 16.5 : 13.5;
  
  const pointsJson = JSON.stringify(polygonPoints || []);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
      <style>
        html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        body { overflow: hidden; background: ${isDark ? '#0F172A' : '#F5F5F0'}; }
        .mapboxgl-ctrl-bottom-right { display: none; }
        .current-marker {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #F5B235;
          border: 2.5px solid white;
          box-shadow: 0 0 10px rgba(245, 178, 53, 0.5);
        }
        .incident-marker {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #EF4444;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4);
        }
        .poly-node {
          width: 12px;
          height: 12px;
          background: #F59E0B;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .hazard-marker, .shelter-marker, .brgy-marker {
          width: 30px;
          height: 30px;
          border-radius: 15px;
          background: rgba(15, 23, 42, 0.9);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }
      </style>
      <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css" rel="stylesheet" />
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
          center: [${center.lng}, ${center.lat}],
          zoom: ${initialZoom},
          antialias: true
        });

        let currentMarker = null;
        let incidentMarker = null;
        let polyMarkers = [];

        function updateMap() {
          if (currentMarker) currentMarker.remove();
          if (incidentMarker) incidentMarker.remove();
          polyMarkers.forEach(m => m.remove());
          polyMarkers = [];

          if (${!!currentCoords}) {
             const el = document.createElement('div');
             el.className = 'current-marker';
             currentMarker = new mapboxgl.Marker(el)
               .setLngLat([${currentCoords?.lng || 0}, ${currentCoords?.lat || 0}])
               .addTo(map);
          }

          if ('${drawMode}' === 'pinpoint' && ${!!incidentCoords}) {
             const el = document.createElement('div');
             el.className = 'incident-marker';
             incidentMarker = new mapboxgl.Marker(el)
               .setLngLat([${incidentCoords?.lng || 0}, ${incidentCoords?.lat || 0}])
               .addTo(map);

             // Add radius circle
             if (map.getSource('radius')) {
               map.getSource('radius').setData(getCircleGeoJSON(${incidentCoords?.lat || 0}, ${incidentCoords?.lng || 0}, ${radiusM}));
             }
          }

          if ('${drawMode}' === 'polygon') {
             const pts = ${pointsJson};
             pts.forEach((p, i) => {
               const el = document.createElement('div');
               el.className = 'poly-node';
               const m = new mapboxgl.Marker(el)
                 .setLngLat([p.lng, p.lat])
                 .addTo(map);
               polyMarkers.push(m);
             });

             if (map.getSource('poly')) {
               map.getSource('poly').setData(getPolyGeoJSON(pts));
             }
          }
        }

        function getCircleGeoJSON(lat, lng, radiusM) {
          const earthR = 6378137;
          const steps = 64;
          const coords = [];
          for (let i = 0; i < steps; i++) {
            const angle = (i * 360) / steps;
            const rad = (angle * Math.PI) / 180;
            const dLat = (radiusM / earthR) * (180 / Math.PI) * Math.cos(rad);
            const dLng = (radiusM / (earthR * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI) * Math.sin(rad);
            coords.push([lng + dLng, lat + dLat]);
          }
          coords.push(coords[0]);
          return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
        }

        function getPolyGeoJSON(pts) {
          if (pts.length < 2) return { type: 'FeatureCollection', features: [] };
          const coords = pts.map(p => [p.lng, p.lat]);
          if (pts.length >= 3) coords.push(coords[0]);
          return { 
            type: 'Feature', 
            geometry: { 
              type: pts.length >= 3 ? 'Polygon' : 'LineString', 
              coordinates: pts.length >= 3 ? [coords] : coords 
            } 
          };
        }

        map.on('load', () => {
          map.addSource('radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({
            id: 'radius-fill',
            type: 'fill',
            source: 'radius',
            paint: { 'fill-color': '#EF4444', 'fill-opacity': 0.15 }
          });
          map.addLayer({
            id: 'radius-stroke',
            type: 'line',
            source: 'radius',
            paint: { 'line-color': '#EF4444', 'line-width': 2, 'line-dasharray': [2, 1] }
          });

          map.addSource('poly', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({
            id: 'poly-fill',
            type: 'fill',
            source: 'poly',
            paint: { 'fill-color': '#F59E0B', 'fill-opacity': 0.15 }
          });
          map.addLayer({
            id: 'poly-stroke',
            type: 'line',
            source: 'poly',
            paint: { 'line-color': '#F59E0B', 'line-width': 3 }
          });

          updateMap();
          loadTacticalData();
        });

        function centerMapOnPoint(lng, lat, offset = false) {
          const options = {
            center: [lng, lat],
            zoom: 16.5,
            essential: true
          };
          if (offset) {
            // Shift center slightly south so marker appears in top half
            options.padding = { bottom: window.innerHeight * 0.4, top: 0, left: 0, right: 0 };
          }
          map.easeTo(options);
        }

        map.on('click', (e) => {
          const payload = {
            type: 'map_click',
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          };
          
          centerMapOnPoint(e.lngLat.lng, e.lngLat.lat, true);

          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          } else {
            window.parent.postMessage(JSON.stringify(payload), '*');
          }
        });

        window.addEventListener('message', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'fly_to') {
              centerMapOnPoint(data.lng, data.lat, true);
            }
          } catch(err) {}
        });

        // TACTICAL LAYERS
        function loadTacticalData() {
          const hazards = ${JSON.stringify(tacticalData.hazards)};
          const shelters = ${JSON.stringify(tacticalData.shelters)};
          const barangays = ${JSON.stringify(tacticalData.barangays)};

          hazards.forEach(h => {
            if (!h.lng || !h.lat) return;
            const el = document.createElement('div');
            el.className = 'hazard-marker';
            el.title = h.type + ': ' + (h.address || '');
            el.innerHTML = '<span class="mdi mdi-alert" style="color: #EF4444; font-size: 18px; line-height: 1;"></span>';
            new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([parseFloat(h.lng), parseFloat(h.lat)])
              .addTo(map);
          });

          shelters.forEach(s => {
            const lng = parseFloat(s.longitude || s.lng);
            const lat = parseFloat(s.latitude || s.lat);
            if (!lng || !lat) return;
            const el = document.createElement('div');
            el.className = 'shelter-marker';
            el.title = s.name;
            el.innerHTML = '<span class="mdi mdi-home-flood" style="color: #10B981; font-size: 18px; line-height: 1;"></span>';
            new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([lng, lat])
              .addTo(map);
          });

          barangays.forEach(b => {
            if (!b.lng || !b.lat) return;
            const el = document.createElement('div');
            el.className = 'brgy-marker';
            el.title = b.name;
            el.innerHTML = '<span class="mdi mdi-shield-home" style="color: #3B82F6; font-size: 18px; line-height: 1;"></span>';
            new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([parseFloat(b.lng), parseFloat(b.lat)])
              .addTo(map);
          });
        }
      </script>
    </body>
    </html>
  `;
};

const buildStaticMapHtml = ({ lat, lng, isDark }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
      <style>
        html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
        .incident-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #EF4444;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
          center: [${lng}, ${lat}],
          zoom: 17,
          interactive: false
        });
        map.on('load', () => {
          const el = document.createElement('div');
          el.className = 'incident-marker';
          new mapboxgl.Marker(el).setLngLat([${lng}, ${lat}]).addTo(map);
        });
      </script>
    </body>
    </html>
  `;
};

const ReportIncidentScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const isTablet = windowWidth > 600;
  const requestedType = route.params?.type;
  
  const webViewRef = useRef(null);
  const [user, setUser] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [incidentCoords, setIncidentCoords] = useState(null);
  const [drawMode, setDrawMode] = useState('pinpoint'); // 'pinpoint' | 'polygon'
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [radiusM, setRadiusM] = useState(100);
  
  const [address, setAddress] = useState('');
  const [incidentType, setIncidentType] = useState(
    INCIDENT_TYPES.find((item) => item.id.toLowerCase() === String(requestedType || '').toLowerCase())?.id || 'Flood'
  );
  const [severity, setSeverity] = useState('Moderate');
  const [allowedVehicles, setAllowedVehicles] = useState(['Walking', 'Motorcycle', 'Car', 'Truck']);
  const [details, setDetails] = useState('');
  const [mediaList, setMediaList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshingMap, setIsRefreshingMap] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [finalReportId, setFinalReportId] = useState('');
  const [isViewingHistoryReport, setIsViewingHistoryReport] = useState(false);
  const [selectedReportCoords, setSelectedReportCoords] = useState(null);

  // My Reports State
  const [myReports, setMyReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('All');
  const [fetchingReports, setFetchingReports] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [tacticalData, setTacticalData] = useState({ hazards: [], shelters: [], barangays: [] });

  const fetchTacticalData = async () => {
    try {
      const [hRes, sRes, bRes] = await Promise.all([
        fetch(`${API_URL}/list-hazards.php`),
        fetch(`${API_URL}/shelters-list.php`),
        fetch(`${API_URL}/list-barangays.php`)
      ]);
      const [hazardsData, sheltersData, barangaysData] = await Promise.all([
        hRes.json(),
        sRes.json(),
        bRes.json()
      ]);
      setTacticalData({
        hazards: hazardsData.hazards || [],
        shelters: Array.isArray(sheltersData) ? sheltersData : (sheltersData.shelters || []),
        barangays: barangaysData.barangays || []
      });
    } catch (e) {
      console.error('Tactical data fetch error:', e);
    }
  };

  const updateSearchSuggestions = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=ph&proximity=121.4167,14.2833&autocomplete=true`;
      const res = await fetch(url);
      const data = await res.json();
      setSearchResults(data.features || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    updateSearchSuggestions(searchQuery);
  };

  const selectSearchResult = (result) => {
    const [lng, lat] = result.center;
    setIncidentCoords({ lat, lng });
    setAddress(result.place_name);
    setSearchQuery('');
    setSearchResults([]);

    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'fly_to',
        lat,
        lng
      }));
    }
  };

  const fetchMyReports = useCallback(async () => {
    if (!user?.id) return;
    setFetchingReports(true);
    try {
      const res = await fetch(`${API_URL}/list-incident-reports.php?user_id=${user.id}&all_time=true`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setFetchingReports(false);
    }
  }, [user?.id]);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 84600) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const handleReportClick = useCallback((report) => {
    setShowHistory(false);
    setIsViewingHistoryReport(true);
    
    const lat = parseFloat(report.lat || report.latitude);
    const lon = parseFloat(report.lng || report.longitude);
    
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'fly_to',
        lat,
        lng: lon
      }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.directView && route.params?.report) {
         handleReportClick(route.params.report);
         // Clear params after handling
         navigation.setParams({ directView: undefined, report: undefined });
      }
      return () => {
        // Reset state when navigating away
        setIsViewingHistoryReport(false);
        setIncidentCoords(null);
        setPolygonPoints([]);
        setDetails('');
        setMediaList([]);
        setSearchQuery('');
        setSearchResults([]);
      };
    }, [route.params, handleReportClick])
  );

  useEffect(() => {
    if (user?.id) fetchMyReports();
  }, [user?.id, fetchMyReports]);

  const filteredReports = useMemo(() => {
    let base = myReports;
    if (reportFilter !== 'All') {
      base = myReports.filter(r => {
        const status = (r.status || 'Pending').toLowerCase();
        const filter = reportFilter.toLowerCase();
        if (filter === 'approved' && status === 'verified') return true;
        return status === filter;
      });
    }

    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      base = base.filter(r => 
        (r.type || '').toLowerCase().includes(q) || 
        (r.location_text || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [myReports, reportFilter, historySearchQuery]);

  useEffect(() => {
    const init = async () => {
      const u = await AuthService.checkSession();
      setUser(u);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
      fetchTacticalData();
      setLoading(false);
    };
    init();
  }, []);


  const handleMapClick = async (lat, lng) => {
    if (drawMode === 'pinpoint') {
      setIncidentCoords({ lat, lng });
      const addr = await reverseLookup(lat, lng);
      setAddress(addr);
    } else {
      setPolygonPoints(prev => [...prev, { lat, lng }]);
      if (polygonPoints.length === 0) {
        const addr = await reverseLookup(lat, lng);
        setAddress(addr);
      }
    }
    // Briefly toggle to force WebView update
    setIsRefreshingMap(true);
    setTimeout(() => setIsRefreshingMap(false), 50);
  };

  const reverseLookup = async (lat, lng) => {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=address,poi,neighborhood,locality,place`;
      const res = await fetch(url);
      const data = await res.json();
      return data?.features?.[0]?.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (e) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const handleCapture = async () => {
    if (mediaList.length >= 3) {
      Alert.alert('Limit reached', 'Maximum 3 photos per report.');
      return;
    }

    Alert.alert('Evidence Documentation', 'Add a visual context to your report.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
          if (!res.canceled) {
            setMediaList(prev => [...prev, { uri: res.assets[0].uri, base64: res.assets[0].base64 }]);
          }
        }
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
          if (!res.canceled) {
            setMediaList(prev => [...prev, { uri: res.assets[0].uri, base64: res.assets[0].base64 }]);
          }
        }
      }
    ]);
  };

  const handleSubmit = async () => {
    if (drawMode === 'pinpoint' && !incidentCoords) {
      Alert.alert('Location Required', 'Please tap on the map to set the incident location.');
      return;
    }
    if (drawMode === 'polygon' && polygonPoints.length < 3) {
      Alert.alert('Polygon Required', 'Please tap at least 3 points on the map to define the zone.');
      return;
    }

    setSubmitting(true);
    try {
      let areaGeojson = null;
      if (drawMode === 'polygon') {
        const coords = [...polygonPoints.map(p => [p.lng, p.lat]), [polygonPoints[0].lng, polygonPoints[0].lat]];
        areaGeojson = { type: 'Polygon', coordinates: [coords] };
      } else {
        areaGeojson = circleGeoJSON(incidentCoords.lat, incidentCoords.lng, radiusM);
      }

      const payload = {
        user_id: user?.id || 0,
        latitude: drawMode === 'pinpoint' ? incidentCoords.lat : polygonPoints[0].lat,
        longitude: drawMode === 'pinpoint' ? incidentCoords.lng : polygonPoints[0].lng,
        type: incidentType,
        severity: severity,
        allowedVehicles: allowedVehicles,
        medias: mediaList.map(m => `data:image/jpeg;base64,${m.base64}`),
        description: details.trim() || `${incidentType} reported by mobile user`,
        barangay: user?.brgy_name || user?.barangay || '',
        reporter_name: user?.full_name || user?.username || 'Mobile User',
        reporter_contact: user?.contact_number || '',
        reporter_email: user?.email || '',
        role: user?.role || 'resident',
        is_passable: allowedVehicles.length > 0 ? 1 : 0,
        area_geojson: areaGeojson,
        radius_m: drawMode === 'pinpoint' ? radiusM : 0,
        location_text: address,
        status: (user?.role === 'resident' || !user?.role) ? 'Pending' : 'Verified'
      };

      const response = await fetch(`${API_URL}/submit-incident-report.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await response.json();
      if (result.success) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = new Date().toTimeString().slice(0, 5).replace(/:/g, '');
        const randomStr = Math.floor(10000 + Math.random() * 90000);
        const reportId = `REPORT${dateStr}${timeStr}${randomStr}`;
        setFinalReportId(reportId);
        setShowConfirmation(true);
        fetchMyReports(); // Refresh history list
      } else {
        Alert.alert('Sync Error', result.error || 'Failed to submit report.');
      }
    } catch (error) {
      Alert.alert('Network Failure', 'Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVehicle = (id) => {
    setAllowedVehicles(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const renderOption = (item, active, onPress) => {
    const Icon = Lucide[item.icon] || Lucide.CircleDot;
    return (
      <TouchableOpacity
        key={item.id}
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.optionCard,
          active && styles.optionCardActive
        ]}
      >
        <View style={[styles.optionIconBox, active && { backgroundColor: item.tone + '20', borderColor: item.tone }]}>
          <Icon size={22} color={active ? item.tone : 'rgba(255,255,255,0.4)'} strokeWidth={2.2} />
        </View>
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#3B82F6" size="large" />
      </View>
    );
  }

  const stage = (drawMode === 'pinpoint' && incidentCoords) || (drawMode === 'polygon' && polygonPoints.length >= 3) ? 'details' : 'pick';

  return (
    <Screen withOrnament={false} style={styles.container}>
      <StatusBar style="light" />
      
      {/* Map Layer */}
      <View style={styles.mapContainer}>
        {!isRefreshingMap && (
          <UniversalWebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: buildMapHtml({ 
              currentCoords, 
              incidentCoords, 
              isDark: true, 
              drawMode, 
              polygonPoints, 
              radiusM,
              tacticalData
            }) }}
            onMessage={(e) => {
              try {
                const data = JSON.parse(e.nativeEvent.data);
                if (data.type === 'map_click') handleMapClick(data.lat, data.lng);
              } catch (err) {}
            }}
            style={styles.webView}
          />
        )}
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Lucide.ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitle}>
            <Text style={styles.titleText}>Tactical Report</Text>
            <Text style={styles.subtitleText}>{drawMode === 'pinpoint' ? 'Pinpoint Intelligence' : 'Zone Marker'}</Text>
          </View>
          {user?.role && user.role !== 'resident' && (
            <View style={styles.modeSwitch}>
              <TouchableOpacity 
                onPress={() => { setDrawMode('pinpoint'); setIncidentCoords(null); setPolygonPoints([]); }}
                style={[styles.modeBtn, drawMode === 'pinpoint' && styles.modeBtnActive]}
              >
                <Lucide.MapPin size={14} color={drawMode === 'pinpoint' ? '#000' : '#8E8E93'} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => { setDrawMode('polygon'); setIncidentCoords(null); setPolygonPoints([]); }}
                style={[styles.modeBtn, drawMode === 'polygon' && styles.modeBtnActive]}
              >
                <Lucide.Hexagon size={14} color={drawMode === 'polygon' ? '#000' : '#8E8E93'} />
              </TouchableOpacity>
            </View>
          )}
          {user?.role === 'resident' && (
            <TouchableOpacity 
              onPress={() => setShowHistory(true)} 
              style={[styles.backBtn, { marginLeft: 10 }]}
            >
              <Lucide.History size={20} color="#F5B235" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar (Route Planner Style) */}
        <MotiView 
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.searchContainer}
        >
          <View style={styles.searchBarPill}>
            <Lucide.Search size={16} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
            <TextInput
              value={searchQuery}
              onChangeText={updateSearchSuggestions}
              onSubmitEditing={handleSearch}
              placeholder="Search location..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.searchPillInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }} style={{ padding: 4 }}>
                <Lucide.XCircle size={14} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            )}
          </View>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <MotiView 
                from={{ opacity: 0, scale: 0.98, translateY: -10 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.98, translateY: -10 }}
                style={styles.suggestionsDropdown}
              >
                <ScrollView keyboardShouldPersistTaps="handled">
                  {searchResults.map((res, i) => (
                    <TouchableOpacity 
                      key={i} 
                      onPress={() => selectSearchResult(res)}
                      style={styles.suggestionItem}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>{res.text}</Text>
                        <Text style={styles.suggestionSubtitle} numberOfLines={1}>{res.place_name}</Text>
                      </View>
                      <Lucide.ArrowUpLeft size={16} color="rgba(255,255,255,0.3)" strokeWidth={2.1} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </MotiView>
            )}
          </AnimatePresence>
        </MotiView>
      </SafeAreaView>

      <AnimatePresence>
        {stage === 'pick' && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: 20 }} style={styles.overlayHint}>
            <Lucide.Crosshair size={24} color="#3B82F6" strokeWidth={2} />
            <Text style={styles.hintText}>
              {isViewingHistoryReport ? 'Viewing tactical entry' : (drawMode === 'pinpoint' ? 'Tap map to mark incident' : 'Tap 3+ points to define zone')}
            </Text>
          </MotiView>
        )}

        {isViewingHistoryReport && (
          <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.exitViewWrapper}>
            <TouchableOpacity 
              onPress={() => {
                setIsViewingHistoryReport(false);
                if (webViewRef.current && currentCoords) {
                   webViewRef.current.postMessage(JSON.stringify({ type: 'fly_to', lat: currentCoords.lat, lng: currentCoords.lng }));
                }
              }}
              style={styles.exitViewBtn}
            >
              <Lucide.X size={18} color="#000" />
              <Text style={styles.exitViewText}>Exit view</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'details' && (
          <MotiView 
            from={{ translateY: windowHeight * 0.55 }}
            animate={{ translateY: 0 }}
            exit={{ translateY: windowHeight * 0.55 }}
            transition={{ type: 'timing', duration: 350 }}
            style={styles.bottomSheetWrapper}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.sheetTitle}>TACTICAL INTEL</Text>
                  <Text style={styles.sheetSubtitle}>{incidentType.toUpperCase()} REPORT • {severity.toUpperCase()}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setIncidentCoords(null);
                    setPolygonPoints([]);
                  }}
                  style={styles.closeSheetBtn}
                >
                  <Lucide.X size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={styles.bottomSheet} 
              contentContainerStyle={{ paddingBottom: insets.bottom + 250 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetSection}>
                <Text style={styles.sectionTitle}>Incident Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                  {INCIDENT_TYPES.map(item => renderOption(item, incidentType === item.id, () => setIncidentType(item.id)))}
                </ScrollView>
              </View>
              <View style={styles.sheetSection}>
                <Text style={styles.sectionTitle}>Severity Level</Text>
                <View style={styles.severityGrid}>
                  {SEVERITIES.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSeverity(item.id)}
                      style={[styles.severityBtn, { 
                        width: '31.5%',
                        borderColor: severity === item.id ? item.tone : 'rgba(255,255,255,0.03)',
                        backgroundColor: severity === item.id ? item.tone + '15' : 'rgba(255,255,255,0.02)'
                      }]}
                    >
                      <Text style={[styles.severityLabel, { color: severity === item.id ? '#FFF' : 'rgba(255,255,255,0.3)' }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {drawMode === 'pinpoint' && user?.role && user.role !== 'resident' && (
                <View style={styles.sheetSection}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Radius Affected</Text>
                    <Text style={styles.valueText}>{radiusM}m</Text>
                  </View>
                  <View style={styles.radiusControl}>
                    {[50, 100, 250, 500].map(val => (
                      <TouchableOpacity 
                        key={val} 
                        onPress={() => setRadiusM(val)}
                        style={[styles.radiusBtn, radiusM === val && styles.radiusBtnActive]}
                      >
                        <Text style={[styles.radiusBtnText, radiusM === val && styles.radiusBtnTextActive]}>{val}m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sheetSection}>
                <Text style={styles.sectionTitle}>Passable By</Text>
                <View style={styles.vehicleGrid}>
                  {VEHICLE_TYPES.map(v => {
                    const Icon = Lucide[v.icon];
                    const active = allowedVehicles.includes(v.id);
                    return (
                      <TouchableOpacity 
                        key={v.id} 
                        onPress={() => toggleVehicle(v.id)}
                        style={[
                          styles.vehicleBtn, 
                          { 
                            backgroundColor: active ? 'rgba(103,153,73,0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderColor: active ? '#679949' : '#EF4444'
                          }
                        ]}
                      >
                        <Icon size={18} color={active ? '#679949' : '#EF4444'} />
                        <Text style={[
                          styles.vehicleBtnText, 
                          { color: active ? '#679949' : '#EF4444' }
                        ]}>{v.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sectionTitle}>Field Observations</Text>
                <TextInput
                  placeholder="Describe the situation..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  multiline
                  value={details}
                  onChangeText={setDetails}
                  style={styles.detailsInput}
                />
              </View>

              <View style={styles.sheetSection}>
                <Text style={styles.sectionTitle}>Visual Evidence</Text>
                <View style={styles.mediaRow}>
                  <TouchableOpacity onPress={handleCapture} style={styles.addMediaBtn}>
                    <Lucide.Plus size={24} color="#F5B235" />
                  </TouchableOpacity>
                  {mediaList.map((m, idx) => (
                    <View key={idx} style={styles.mediaPreview}>
                      <RNImage source={{ uri: m.uri }} style={styles.previewImg} />
                      <TouchableOpacity 
                        onPress={() => setMediaList(prev => prev.filter((_, i) => i !== idx))}
                        style={styles.removeMedia}
                      >
                        <Lucide.X size={10} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {[...Array(Math.max(0, 2 - mediaList.length))].map((_, i) => (
                    <View key={`slot-${i}`} style={[styles.mediaPreview, { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.05)' }]} />
                  ))}
                </View>
              </View>
        </ScrollView>

        <AnimatePresence>
          {!isViewingHistoryReport && (
            <MotiView 
              from={{ translateY: 150 }} 
              animate={{ translateY: 0 }} 
              exit={{ translateY: 150 }}
              style={[
                styles.footer, 
                { 
                  bottom: Platform.OS === 'ios' ? insets.bottom + 100 : 90,
                  paddingBottom: Math.max(insets.bottom, 16) 
                }
              ]}
            >
              {stage === 'details' ? (
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  disabled={submitting}
                  style={[styles.submitBtn, { backgroundColor: '#F5B235' }]}
                >
                  {submitting ? <ActivityIndicator color="#000" /> : (
                    <>
                      <Text style={styles.submitBtnText}>Sync report</Text>
                      <Lucide.Send size={18} color="#000" strokeWidth={2.5} />
                    </>
                  )}
                </TouchableOpacity>
              ) : (drawMode === 'polygon' && polygonPoints.length > 0) ? (
                <TouchableOpacity 
                  onPress={() => setPolygonPoints([])}
                  style={[styles.submitBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                >
                  <Text style={[styles.submitBtnText, { color: '#FFF' }]}>Reset points</Text>
                </TouchableOpacity>
              ) : null}
            </MotiView>
          )}
        </AnimatePresence>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ── MY REPORTS MODAL (RESIDENTS ONLY) ── */}
      <AnimatePresence>
        {showHistory && (
          <MotiView 
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            style={[styles.historyModal, { paddingTop: insets.top + 20 }]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.trayTitleRow}>
                <Lucide.ClipboardList size={22} color="#F5B235" />
                <View>
                  <Text style={styles.modalTitle}>Mission history</Text>
                  <Text style={styles.modalSubtitle}>{myReports.length} intel packets synced</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowHistory(false)}
                style={styles.modalCloseBtn}
              >
                <Lucide.X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Modal Search Bar */}
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <View style={styles.modalSearchBar}>
                <Lucide.Search size={16} color="rgba(255,255,255,0.3)" />
                <TextInput
                  value={historySearchQuery}
                  onChangeText={setHistorySearchQuery}
                  placeholder="Filter by type or location..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  style={styles.modalSearchInput}
                />
                {historySearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setHistorySearchQuery('')}>
                    <Lucide.XCircle size={14} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filters */}
            <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {['All', 'Pending', 'Approved', 'Resolved', 'Rejected'].map(f => (
                  <TouchableOpacity 
                    key={f}
                    onPress={() => setReportFilter(f)}
                    style={[styles.filterBtn, reportFilter === f && styles.filterBtnActive]}
                  >
                    <Text style={[styles.filterBtnText, reportFilter === f && styles.filterBtnTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* List */}
            <ScrollView 
              style={styles.reportsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
            >
              {fetchingReports ? (
                <View style={styles.listLoading}>
                  <ActivityIndicator color="#F5B235" size="small" />
                </View>
              ) : filteredReports.length === 0 ? (
                <View style={styles.listEmpty}>
                  <Lucide.SearchX size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.listEmptyText}>NO DATA IN SECTOR</Text>
                </View>
              ) : (
                filteredReports.map((report) => {
                  const severity = String(report.severity || 'Moderate').toLowerCase();
                  let color = '#3B82F6';
                  if (severity === 'moderate' || severity === 'warning') color = '#F5B235';
                  if (severity === 'high' || severity === 'critical' || severity === 'severe') color = '#EF4444';
                  
                  const typeInfo = INCIDENT_TYPES.find(t => t.id === report.type) || { icon: 'AlertCircle' };
                  const Icon = Lucide[typeInfo.icon] || Lucide.AlertCircle;

                  return (
                    <TouchableOpacity 
                      key={report.id}
                      activeOpacity={0.8}
                      onPress={() => handleReportClick(report)}
                      style={styles.reportCard}
                    >
                      <View style={[styles.reportIconBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                        <Icon size={20} color={color} strokeWidth={2.2} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Row justify="space-between" align="center">
                          <Text style={styles.reportType}>{report.type || 'Intel packet'}</Text>
                          <Text style={styles.reportTime}>{formatRelativeTime(report.time)}</Text>
                        </Row>
                        <Row align="center" gap={8} style={{ marginTop: 4 }}>
                           <View style={[styles.statusBadgeCompact, { backgroundColor: color + '20', borderColor: color + '30' }]}>
                             <Text style={[styles.statusBadgeTextCompact, { color: color }]}>{(report.status || 'Pending').toUpperCase()}</Text>
                           </View>
                           <Text style={styles.reportAddress} numberOfLines={1}>{report.barangay || 'Unknown Sector'}</Text>
                        </Row>
                      </View>
                      
                      <Lucide.ChevronRight size={16} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* MISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirmation && (
          <MotiView 
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={styles.confirmationOverlay}
          >
            <SafeAreaView style={styles.confirmationContent}>
               <ScrollView 
                 style={{ flex: 1 }} 
                 contentContainerStyle={{ paddingBottom: 60 }}
                 showsVerticalScrollIndicator={false}
               >
                 <View style={styles.confMapWrapper}>
                   <UniversalWebView 
                     source={{ html: buildStaticMapHtml({ 
                       lat: drawMode === 'pinpoint' ? incidentCoords?.lat : polygonPoints[0]?.lat,
                       lng: drawMode === 'pinpoint' ? incidentCoords?.lng : polygonPoints[0]?.lng,
                       isDark: true 
                     }) }}
                     style={styles.confMap}
                   />
                   <LinearGradient 
                     colors={['transparent', 'rgba(8,8,8,0.7)', '#080808']} 
                     style={styles.confMapFade} 
                   />
                   <View style={styles.confMapOverlay}>
                      <Text style={styles.confMapTagText}>{finalReportId}</Text>
                   </View>
                 </View>

                 <View style={styles.confHeader}>
                   <Text style={styles.confTitle}>Report details</Text>
                 </View>

                   <View style={styles.confDetailList}>
                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.AlertCircle size={22} color="#F5B235" />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Incident type</Text>
                         <Text style={styles.confItemValue}>{incidentType}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.Shield size={22} color={SEVERITIES.find(s => s.id === severity)?.tone || '#F5B235'} />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Severity level</Text>
                         <Text style={[styles.confItemValue, { color: SEVERITIES.find(s => s.id === severity)?.tone || '#FFF' }]}>{severity}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.MapPin size={22} color="#94A3B8" />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Location target</Text>
                         <Text style={styles.confItemValue} numberOfLines={2}>{address || 'Situation defined area'}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.Activity size={22} color={(user?.role === 'resident' || !user?.role) ? '#F59E0B' : '#679949'} />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Approval status</Text>
                         <Text style={[styles.confItemValue, { color: (user?.role === 'resident' || !user?.role) ? '#F59E0B' : '#679949' }]}>
                           {(user?.role === 'resident' || !user?.role) ? 'Pending verification' : 'Tactical approved'}
                         </Text>
                       </View>
                     </View>
                   </View>

                   {details ? (
                     <View style={styles.confObsCard}>
                       <Text style={styles.confObsLabel}>Field observations</Text>
                       <Text style={styles.confObsText}>{details}</Text>
                     </View>
                   ) : null}

                   <View style={styles.confStatusCard}>
                     <Lucide.Radar size={20} color="#F5B235" />
                     <Text style={styles.confStatusText}>Intel has been broadcasted to all tactical units. Emergency responders are moving to verify this sector.</Text>
                   </View>

                   <TouchableOpacity 
                      onPress={() => {
                        setShowConfirmation(false);
                        setIncidentCoords(null);
                        setPolygonPoints([]);
                        setDetails('');
                        setMediaList([]);
                        fetchTacticalData();
                      }}
                     style={[styles.confCloseBtn, { marginBottom: Math.max(insets.bottom, 24) + 20 }]}
                  >
                    <Text style={styles.confCloseBtnText}>Acknowledge mission</Text>
                  </TouchableOpacity>
                 </ScrollView>
            </SafeAreaView>
          </MotiView>
        )}
      </AnimatePresence>
    </Screen>
  );
};

const styles = {
  container: { flex: 1, backgroundColor: '#080808' },
  mapContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 },
  webView: { flex: 1, backgroundColor: 'transparent' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { flex: 1, marginLeft: 16 },
  titleText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2, fontFamily: DS_FONT_UI },
  subtitleText: { color: '#F5B235', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2, fontFamily: DS_FONT_UI },
  modeSwitch: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: '#F5B235' },
  overlayHint: { position: 'absolute', top: '25%', alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245, 178, 53, 0.3)' },
  hintText: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginLeft: 10, fontFamily: DS_FONT_UI },
  bottomSheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', backgroundColor: '#0D0D0D', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, overflow: 'hidden' },
  sheetHeader: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dragHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, fontFamily: DS_FONT_UI },
  sheetSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginTop: 4, fontFamily: DS_FONT_UI },
  closeSheetBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bottomSheet: { flex: 1, padding: 24 },
  sheetSection: { marginBottom: 32 },
  sectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 16, fontFamily: DS_FONT_UI, textTransform: 'uppercase' },
  horizontalScroll: { gap: 12 },
  optionCard: { width: 96, height: 100, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, alignItems: 'center', justifyContent: 'center' },
  optionCardActive: { borderColor: '#F5B235', backgroundColor: 'rgba(245, 178, 53, 0.05)' },
  optionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  optionLabel: { fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  optionLabelActive: { color: '#FFF' },
  severityGrid: { flexDirection: 'row', gap: 10 },
  severityBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  severityLabel: { fontSize: 12, fontWeight: '800', fontFamily: DS_FONT_UI, letterSpacing: 0.5 },
  accessibilityRow: { flexDirection: 'row', gap: 10 },
  accessBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.03)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center' },
  accessBtnText: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: DS_FONT_UI },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  valueText: { color: '#FFF', fontSize: 13, fontWeight: '700', fontFamily: DS_FONT_UI },
  radiusControl: { flexDirection: 'row', gap: 8 },
  radiusBtn: { flex: 1, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  radiusBtnActive: { backgroundColor: 'rgba(245, 178, 53, 0.15)', borderColor: '#F5B235' },
  radiusBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', fontFamily: DS_FONT_UI },
  radiusBtnTextActive: { color: '#F5B235' },
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehicleBtn: { flex: 1, minWidth: '47%', height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)' },
  vehicleBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', marginLeft: 12, fontFamily: DS_FONT_UI, letterSpacing: 0.5 },
  detailsInput: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', padding: 16, color: '#FFF', fontSize: 14, minHeight: 120, textAlignVertical: 'top', fontFamily: DS_FONT_INPUT },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  reportIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1 },
  reportType: { color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: DS_FONT_UI },
  reportTime: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: DS_FONT_INPUT },
  reportAddress: { color: 'rgba(255,255,255,0.4)', fontSize: 12, flex: 1, fontFamily: DS_FONT_UI },
  statusBadgeCompact: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  statusBadgeTextCompact: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  exitViewWrapper: { position: 'absolute', top: 120, alignSelf: 'center', zIndex: 1000 },
  exitViewBtn: { height: 44, paddingHorizontal: 20, backgroundColor: '#F5B235', borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  exitViewText: { color: '#000', fontSize: 14, fontWeight: '700' },
  mediaRow: { flexDirection: 'row', gap: 12 },
  addMediaBtn: { width: 68, height: 68, borderRadius: 16, backgroundColor: 'rgba(245, 178, 53, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F5B235' },
  mediaPreview: { width: 68, height: 68, borderRadius: 16, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  removeMedia: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '600', marginTop: 16, fontFamily: DS_FONT_UI },
  footer: { 
    position: 'absolute', 
    // Positioned dynamically in component
    left: 0, 
    right: 0, 
    paddingHorizontal: 24, 
    paddingTop: 12,
    zIndex: 20
  },
  submitBtn: { height: 56, borderRadius: 12, backgroundColor: '#F5B235', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '700', fontFamily: DS_FONT_UI },
  confirmationOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#080808', zIndex: 1000 },
  confirmationContent: { flex: 1, padding: 0 },
  confMapWrapper: { width: '100%', height: 320, overflow: 'hidden' },
  confMap: { width: '100%', height: '100%' },
  confMapFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  confMapOverlay: { position: 'absolute', bottom: 30, left: 24, right: 24, alignItems: 'center' },
  confMapTagText: { color: '#F5B235', fontSize: 18, fontWeight: '900', letterSpacing: 1.5, fontFamily: DS_FONT_UI },
  confDetailsContainer: { flex: 1 },
  wideDetailsContainer: { paddingLeft: 12 },
  confHeader: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  confTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, fontFamily: DS_FONT_UI },
  confDetailList: { paddingHorizontal: 24, gap: 8 },
  confItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 4 },
  confItemIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  confItemContent: { flex: 1 },
  confItemLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', letterSpacing: 0.2, marginBottom: 4, fontFamily: DS_FONT_UI },
  confItemValue: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: DS_FONT_UI },
  confObsCard: { marginHorizontal: 24, marginTop: 16, padding: 24, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 4 },
  confObsLabel: { color: '#F5B235', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12, fontFamily: DS_FONT_UI },
  confObsText: { color: '#FFF', fontSize: 15, lineHeight: 24, fontWeight: '500' },
  confStatusCard: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 4, marginTop: 16 },
  confStatusText: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 20, fontWeight: '500' },
  confCloseBtn: { marginHorizontal: 24, height: 56, backgroundColor: '#F5B235', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  confCloseBtnText: { color: '#000', fontSize: 16, fontWeight: '700', fontFamily: DS_FONT_UI },

  // My Reports Modal Styles
  historyModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080808',
    zIndex: 2000
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: DS_FONT_UI
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    fontFamily: DS_FONT_UI
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  trayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  filterScroll: {
    gap: 8
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  filterBtnActive: {
    backgroundColor: '#F5B235',
    borderColor: '#F5B235'
  },
  filterBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: DS_FONT_UI
  },
  filterBtnTextActive: {
    color: '#000'
  },
  reportsList: {
    flex: 1
  },
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  reportType: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: DS_FONT_UI
  },
  reportTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
    fontFamily: DS_FONT_UI
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4
  },
  statusBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: DS_FONT_UI
  },
  reportAddress: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: DS_FONT_UI
  },
  listLoading: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  listEmpty: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16
  },
  listEmptyText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: DS_FONT_UI
  },

  // Search Styles (Route Planner Aesthetic)
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 5000
  },
  searchBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161412',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  searchPillInput: {
    flex: 1,
    marginLeft: 10,
    color: '#F3EEE6',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: DS_FONT_INPUT
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    backgroundColor: '#161412',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    overflow: 'hidden',
    maxHeight: 320,
    zIndex: 6000
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F2EEE8',
    fontFamily: DS_FONT_UI
  },
  suggestionSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(242,238,232,0.55)',
    marginTop: 2,
    fontFamily: DS_FONT_INPUT
  },

  // Modal Search Styles
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#FFF',
    fontSize: 13,
    fontFamily: DS_FONT_INPUT
  }
};

export default ReportIncidentScreen;
