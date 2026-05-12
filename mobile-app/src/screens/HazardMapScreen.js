import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Keyboard,
  Linking,
  Platform,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ImageBackground,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
  Image as RNImage,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import {
  Screen,
  Row,
  Col,
  Container,
  Heading,
  DS_FONT_INPUT,
  DS_FONT_UI,
  useResponsive,
  ValidationInput,
  Card,
} from '../components/DesignSystem';
import UniversalWebView from '../components/UniversalWebView';
import { HazardAddControls, HazardModal } from '../components/Map/HazardAddControls';
import { TacticalIntelCard } from '../components/Intelligence/TacticalIntelCard';

const DEFAULT_REGION = { lat: 14.2833, lng: 121.4167 };

const INCIDENT_TYPES = [
  { id: 'Flood', label: 'Flooding', icon: 'Waves', tone: '#F5B235' },
  { id: 'Fire', label: 'Fire', icon: 'Flame', tone: '#EF4444' },
  { id: 'Accident', label: 'Accident', icon: 'Car', tone: '#F59E0B' },
  { id: 'Medical', label: 'Medical', icon: 'HeartPulse', tone: '#F5B235' },
  { id: 'Crime', label: 'Security', icon: 'ShieldAlert', tone: '#F5B235' },
  { id: 'Other', label: 'Other', icon: 'CircleDot', tone: '#64748B' },
];

const HAZARD_ACCENTS = {
  Earthquake: '#FF4B5F',
  Flood: '#FFBE17',
  Fire: '#FF7A2F',
  Landslide: '#F59E0B',
  Storm: '#5AA5FF',
  Road: '#F97316',
  Accident: '#FF5A5A',
  Other: '#A3A3A3',
};

const HAZARD_ICONS = {
  Earthquake: 'Activity',
  Flood: 'Waves',
  Fire: 'Flame',
  Landslide: 'Mountain',
  Storm: 'CloudLightning',
  Road: 'TriangleAlert',
  Accident: 'ShieldAlert',
  Other: 'MapPinned',
};

const HazardMapScreen = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  const mapRef = useRef(null);

  // PRECISION RESPONSIVENESS (COMPACT MODE)
  const contentWidth = pageWidth * 0.94;
  const isWide = pageWidth > 600;

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [hazards, setHazards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHazardId, setSelectedHazardId] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [userRole, setUserRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isAddMode, setIsAddMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: 'Flood',
    description: '',
    severity: 'Medium',
    address: 'Pinned Location',
    allowedVehicles: ['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'],
  });
  const [creating, setCreating] = useState(false);
  const [updatingHazardId, setUpdatingHazardId] = useState(null);
  
  // Mission History State
  const [user, setUser] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [myReports, setMyReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('All');
  const [fetchingReports, setFetchingReports] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const u = await AuthService.checkSession();
    if (u) {
      setUser(u);
      setUserRole(u.role);
    }
    await fetchHazards(u);

    if (route.params?.shelter) {
      const lat = parseFloat(route.params.shelter.lat);
      const lng = parseFloat(route.params.shelter.lng);
      setRegion({ lat, lng });
    } else if (route.params?.focusId) {
      // Deferred focus after hazards are loaded
    }
    if (u?.id) fetchMyReports(u.id);
  };

  const fetchMyReports = async (userId) => {
    const u = user || (await AuthService.checkSession());
    const id = userId || u?.id;
    if (!id) return;
    setFetchingReports(true);
    try {
      // Fetch both personal reports AND all active hazards for situational awareness
      const isAdmin = ['admin', 'coordinator', 'brgy'].includes(u.role);
      let url = `${API_URL}/incident-reports.php?all_time=true`;
      
      // If resident, we show their reports + all active verified reports
      // If admin, we show all for their sector
      if (u.barangay || u.brgy_name) {
         url += `&barangay=${encodeURIComponent(u.barangay || u.brgy_name)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter to only show relevant intel (Active/Pending/Verified)
        setMyReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setFetchingReports(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchMyReports(user.id);
      fetchHazards(user);
    }, [user?.id])
  );

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

  const handleReportClick = (report) => {
    setShowHistory(false);
    focusHazard(report);
  };

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
        (r.barangay || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }

    return base;
  }, [myReports, reportFilter, historySearchQuery]);

  useEffect(() => {
    if (hazards.length > 0 && route.params?.focusId) {
      const match = hazards.find(h => String(h.id) === String(route.params.focusId));
      if (match) {
        setTimeout(() => focusHazard(match, 'map'), 500);
      }
    }
  }, [hazards, route.params?.focusId]);

  const fetchHazards = async (currentUser) => {
    setLoading(true);
    try {
      const u = currentUser || user || (await AuthService.checkSession());
      
      // Fetch only hazard/incident sources for the Hazard Map
      const [hRes, iRes] = await Promise.all([
        fetch(`${API_URL}/list-map-overlays.php`).catch(() => null),
        fetch(`${API_URL}/incident-reports.php?official_only=true?status=All`).catch(() => null)
      ]);
      
      const markers = [];

      if (hRes) {
        const hData = await hRes.json();
        if (hData?.success) {
          const allowedStats = ['ACTIVE', 'APPROVED', 'VERIFIED'];
          (hData.reports || [])
            .filter(h => allowedStats.includes((h.status || '').toUpperCase()))
            .forEach(h => markers.push({
              ...h,
              id: `h${h.id}`, realId: h.id, lat: parseFloat(h.lat), lng: parseFloat(h.lng),
              type: (h.type || 'hazard').toLowerCase(), area_geojson: h.area_geojson,
              severity: h.severity || 'Normal',
              is_passable: h.is_passable === undefined ? true : (h.is_passable === true || h.is_passable === 1 || h.is_passable === "1")
            }));
        }
      }

      if (iRes) {
        const iData = await iRes.json();
        if (iData?.success && iData.incidents) {
          const allowedStats = ['ACTIVE', 'APPROVED', 'VERIFIED'];
          iData.incidents
            .filter(r => allowedStats.includes((r.status || '').toUpperCase()))
            .forEach(r => markers.push({
              ...r,
              id: `i${r.id}`, realId: r.id, lat: parseFloat(r.lat), lng: parseFloat(r.lng),
              type: (r.type || 'incident').toLowerCase(), area_geojson: r.area_geojson,
              severity: r.severity || 'Moderate',
              is_passable: r.is_passable === undefined ? true : (r.is_passable === true || r.is_passable === 1 || r.is_passable === "1"),
              status: r.status,
              description: r.description,
              time: r.time,
              user_id: r.user_id,
              allowed_modes: r.allowed_modes
            }));
        }
      }

      setHazards(markers);
    } catch (error) {
      console.error('Error fetching hazards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHazard = async () => {
    if (!createForm.description) {
      Alert.alert('Incomplete Intelligence', 'Please describe the hazard for tactical awareness.');
      return;
    }

    setCreating(true);
    try {
      const u = user || (await AuthService.checkSession());
      const payload = {
        ...createForm,
        lat: region.lat,
        lng: region.lng,
        barangay: u?.brgy_name || u?.barangay || '',
        user_id: u?.id || 0,
        reporter_name: u?.full_name || u?.username || 'Command'
      };

      const res = await fetch(`${API_URL}/hazards.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Role': u?.role || 'brgy',
          'X-Token': u?.token || ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        Alert.alert('Synchronized', 'Tactical hazard has been broadcasted to all units.');
        setAddModalVisible(false);
        setIsAddMode(false);
        setCreateForm({
          type: 'Flood',
          description: '',
          severity: 'Medium',
          address: 'Pinned Location',
          allowedVehicles: ['driving-car', 'driving-hgv', 'cycling-regular', 'foot-walking'],
          medias: []
        });
        fetchHazards(u);
      } else {
        Alert.alert('Sync Failure', data.error || 'Check tactical connection.');
      }
    } catch (err) {
      Alert.alert('Network Failure', 'Unable to reach tactical command center.');
    } finally {
      setCreating(false);
    }
  };

  const getHazardKind = (hazard) => {
    const type = String(hazard?.type || 'Other');
    const normalized = type.toLowerCase();
    if (normalized.includes('earth')) return 'Earthquake';
    if (normalized.includes('flood')) return 'Flood';
    if (normalized.includes('fire')) return 'Fire';
    if (normalized.includes('landslide')) return 'Landslide';
    if (normalized.includes('storm')) return 'Storm';
    if (normalized.includes('road')) return 'Road';
    if (normalized.includes('accident')) return 'Accident';
    return 'Other';
  };

  const filteredHazards = useMemo(() => {
    const allowed = ['ACTIVE', 'APPROVED', 'VERIFIED'];
    const activeHazards = hazards.filter(h => allowed.includes((h.status || '').toUpperCase()));
    
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeHazards;
    
    return activeHazards.filter((hazard) => {
      const haystack = [
        hazard.type,
        hazard.description,
        hazard.address,
        hazard.severity,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [hazards, searchQuery]);

  const selectedHazard = useMemo(() => {
    if (!hazards.length) return null;
    return hazards.find((item) => item.id === selectedHazardId) || null;
  }, [hazards, selectedHazardId]);

  const centeredHazards = useMemo(() => {
    return filteredHazards
      .filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)))
      .map((item) => ({
        ...item,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }));
  }, [filteredHazards]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim().length <= 1) {
      setSuggestions([]);
      return;
    }

    const matches = hazards
      .filter((item) => {
        const haystack = [item.type, item.description, item.address, item.severity]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(text.toLowerCase());
      })
      .slice(0, 4);

    setSuggestions(matches);
  };

  const focusHazard = (hazard, nextMode = null) => {
    if (!hazard) return;
    const lat = Number(hazard.lat);
    const lng = Number(hazard.lng);
    setSelectedHazardId(hazard.id);
    setRegion({ lat, lng });
    setSuggestions([]);
    Keyboard.dismiss();
    if (nextMode) setViewMode(nextMode);
    else setViewMode('map');

    if (mapRef.current) {
      mapRef.current.postMessage(
        JSON.stringify({
          type: 'FOCUS_HAZARD',
          hazardId: hazard.id,
          lat,
          lng,
          zoom: 13.8,
        })
      );
    }
  };

  const handleMarkSafe = async (hazard) => {
    if (!hazard?.id || updatingHazardId) return;

    setUpdatingHazardId(hazard.id);
    try {
      const user = await AuthService.checkSession();
      const response = await fetch(`${API_URL}/update-hazard.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Role': user?.role || 'resident',
          'X-Token': user?.token || 'RESCUE_PH_TOKEN'
        },
        body: JSON.stringify({
          id: hazard.id,
          status: 'Resolved',
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Failed to update hazard status.');
      }

      setHazards((prev) =>
        prev.map((item) =>
          item.id === hazard.id
            ? {
                ...item,
                status: data.status || 'Resolved',
              }
            : item
        )
      );

      Alert.alert('Hazard updated', 'This hazard has been marked safe.');
    } catch (error) {
      Alert.alert('Unable to update hazard', error.message || 'Please try again.');
    } finally {
      setUpdatingHazardId(null);
    }
  };

  const buildStaticPreview = (hazard) => {
    const lat = Number(hazard?.lat);
    const lng = Number(hazard?.lng);
    const accent = String(hazard?.accent || '#FF4B5F').replace('#', '');
    const styleId = isDark ? 'dark-v11' : 'streets-v12';

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return `https://api.mapbox.com/styles/v1/mapbox/${styleId}/static/pin-s+${accent}(${lng},${lat})/${lng},${lat},11.8,0/900x340?access_token=${MAPBOX_ACCESS_TOKEN}`;
  };
  useEffect(() => {
    if (mapRef.current) {
      const payload = centeredHazards.map((hazard) => {
        const kind = getHazardKind(hazard);
        const accent = HAZARD_ACCENTS[kind] || HAZARD_ACCENTS.Other;
        return {
          id: hazard.id,
          lat: hazard.lat,
          lng: hazard.lng,
          type: hazard.type || kind,
          accent,
          area_geojson: hazard.area_geojson || null,
          is_passable: hazard.is_passable,
          severity: hazard.severity
        };
      });

      mapRef.current.postMessage(
        JSON.stringify({
          type: 'SYNC_HAZARDS',
          hazards: payload,
          region: { lat: region.lat, lng: region.lng }
        })
      );
    }
  }, [centeredHazards, region.lat, region.lng]);

  const mapHTML = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css" rel="stylesheet" />
        <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
        <style>
          html, body { margin: 0; padding: 0; background: #080808; }
          #map { position: absolute; inset: 0; }
          .hazard-marker {
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }
          .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
          const markers = {};
          let hazardData = [];
          let isLoaded = false;
          let pendingMessages = [];

          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
            center: [121.4167, 14.2833],
            zoom: 11,
            antialias: true
          });

          // Circle generator helper
          function createCircle(center, radiusInKm, points = 64) {
            const coords = { lat: center[1], lng: center[0] };
            const earthR = 6378137;
            const radiusM = radiusInKm * 1000;
            const ret = [];
            for (let i = 0; i < points; i++) {
              const angle = (i * 360) / points;
              const rad = (angle * Math.PI) / 180;
              const dLat = (radiusM / earthR) * (180 / Math.PI) * Math.cos(rad);
              const dLng = (radiusM / (earthR * Math.cos((coords.lat * Math.PI) / 180))) * (180 / Math.PI) * Math.sin(rad);
              ret.push([coords.lng + dLng, coords.lat + dLat]);
            }
            ret.push(ret[0]);
            return [ret];
          }

          function post(payload) {
            const data = JSON.stringify(payload);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(data);
            }
          }

          function drawHazards() {
            const polyFeatures = [];
            const currentIds = hazardData.map(h => String(h.id));
            
            hazardData.forEach((hazard) => {
              const markerId = String(hazard.id);
              const isPassable = String(hazard.is_passable) === '1' || hazard.is_passable === true;
              const hazardColor = isPassable ? '#F5B235' : '#EF4444';
              const type = (hazard.type || '').toLowerCase();
              const severity = hazard.severity || 'Moderate';
              
              // 1. Resolve Geometry (Area or Radius)
              let geom = hazard.area_geojson;
              if (typeof geom === 'string') { try { geom = JSON.parse(geom); } catch(e) { geom = null; } }
              
              const finalGeom = geom ? (geom.type === 'Feature' ? geom.geometry : geom) : null;
              
              if (finalGeom) {
                polyFeatures.push({ 
                  type: 'Feature', 
                  properties: { id: hazard.id, type, severity, is_passable: isPassable ? 1 : 0 }, 
                  geometry: finalGeom 
                });
              } else {
                let radius = 0.3;
                const sev = severity.toLowerCase();
                if (sev.includes('critical')) radius = 0.6;
                else if (sev.includes('high')) radius = 0.45;
                else if (sev.includes('moderate')) radius = 0.3;
                else radius = 0.2;

                polyFeatures.push({ 
                  type: 'Feature', 
                  properties: { id: hazard.id, type, severity, is_passable: isPassable ? 1 : 0 }, 
                  geometry: {
                    type: 'Polygon',
                    coordinates: createCircle([hazard.lng, hazard.lat], radius) 
                  } 
                });
              }

              // 2. Draw Points/Markers
              if (!markers[markerId]) {
                const el = document.createElement('div');
                el.className = 'hazard-marker';
                el.onclick = () => post({ type: 'select-hazard', id: hazard.id });
                
                let icon = 'alert';
                if (type.includes('fire')) icon = 'fire';
                else if (type.includes('flood')) icon = 'waves';
                else if (type.includes('shelter')) icon = 'home-heart';
                else if (type.includes('hall') || type.includes('barangay')) icon = 'shield-home';
                else if (type.includes('hazard')) icon = 'alert-octagon';
                else if (type.includes('incident')) icon = 'alert';
                else if (type.includes('earthquake')) icon = 'activity';
                else if (type.includes('storm')) icon = 'cloud-lightning';
                else if (type.includes('landslide')) icon = 'mountain';

                el.innerHTML = '<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">' +
                    '<div style="position: absolute; inset: 0; background: ' + hazardColor + '; opacity: 0.18; border-radius: 50%; filter: blur(1px);"></div>' +
                    '<div style="position: absolute; width: 34px; height: 34px; border: 2px solid ' + hazardColor + '; opacity: 0.35; border-radius: 50%; box-sizing: border-box;"></div>' +
                    '<div style="position: absolute; width: 24px; height: 24px; background: white; border: 2px solid ' + hazardColor + '; opacity: 0.9; border-radius: 50%; box-sizing: border-box;"></div>' +
                    '<div style="position: absolute; width: 14px; height: 14px; background: ' + hazardColor + '; border-radius: 50%; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">' +
                      '<i class="mdi mdi-' + icon + '" style="color: white; font-size: 9px; line-height: 1;"></i>' +
                    '</div>' +
                  '</div>';

                const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                  .setLngLat([hazard.lng, hazard.lat])
                  .addTo(map);
                markers[markerId] = marker;
              } else {
                markers[markerId].setLngLat([hazard.lng, hazard.lat]);
              }
            });

            // Cleanup removed markers
            Object.keys(markers).forEach(id => {
              if (!currentIds.includes(id)) {
                markers[id].remove();
                delete markers[id];
              }
            });

            // 3. Batch Add Polygons
            if (map.getSource('tactical-polygons')) {
                map.getSource('tactical-polygons').setData({ type: 'FeatureCollection', features: polyFeatures });
            } else {
                map.addSource('tactical-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features: polyFeatures } });
                map.addLayer({ 
                    id: 'tactical-polygons-fill', 
                    type: 'fill', 
                    source: 'tactical-polygons', 
                    paint: { 
                      'fill-color': [
                        'case',
                        ['==', ['get', 'is_passable'], 0], '#EF4444',
                        '#F5B235'
                      ], 
                      'fill-opacity': 0.18 
                    } 
                });
                map.addLayer({ 
                    id: 'tactical-polygons-line', 
                    type: 'line', 
                    source: 'tactical-polygons', 
                    paint: { 
                      'line-color': [
                        'case',
                        ['==', ['get', 'is_passable'], 0], '#EF4444',
                        '#F59E0B'
                      ], 
                      'line-width': 2.5, 
                      'line-dasharray': [2, 1.5] 
                    } 
                });
            }
          }

          window.handleSync = function(data) {
            if (!data) return;
            if (!isLoaded) { pendingMessages.push(data); return; }
            
            if (data.type === 'SYNC_HAZARDS') {
              hazardData = data.hazards;
              if (data.region) {
                 map.jumpTo({ center: [data.region.lng, data.region.lat] });
              }
              drawHazards();
            } else if (data.type === 'FOCUS_HAZARD') {
              map.flyTo({
                center: [data.lng, data.lat],
                zoom: data.zoom || 13.8,
                duration: 1500
              });
            }
          };

          const syncHandler = (e) => {
            try {
              const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              if (d) window.handleSync(d);
            } catch(err){}
          };
          window.addEventListener('message', syncHandler);
          document.addEventListener('message', syncHandler);

          map.on('load', () => {
            isLoaded = true;
            while (pendingMessages.length) window.handleSync(pendingMessages.shift());
          });
        </script>
      </body>
      </html>
    `;
  }, [isDark]);

  const selectedAccent = selectedHazard
    ? HAZARD_ACCENTS[getHazardKind(selectedHazard)] || HAZARD_ACCENTS.Other
    : '#FF4B5F';

  const SelectedIcon = Lucide[HAZARD_ICONS[selectedHazard ? getHazardKind(selectedHazard) : 'Other']] || Lucide.MapPinned;

  return (
    <>
    <Screen withOrnament={false} style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />

      {/* 1. IMMERSIVE MAP LAYER */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <UniversalWebView
          ref={mapRef}
          source={{ html: mapHTML }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onMessage={useCallback((event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'select-hazard') {
                const match = hazards.find((item) => String(item.id) === String(data.id));
                if (match) focusHazard(match);
              }
            } catch (error) {
              console.error('Hazard map message error:', error);
            }
          }, [hazards])}
          pointerEvents="auto"
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} pointerEvents="none" />
      </View>


      {/* 2. TACTICAL TOP OVERLAY */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
         <View style={{ width: pageWidth, alignSelf: 'center', paddingHorizontal: 16 }}>
            <Row align="center" justify="space-between" style={styles.headerRow}>
               <Row align="center" gap={12}>
                  <TouchableOpacity 
                    activeOpacity={0.86} 
                    onPress={() => navigation.goBack()} 
                    style={styles.headerBtn}
                  >
                    <Lucide.ChevronLeft size={20} color="#F4F0E8" strokeWidth={2.4} />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Live Hazard Map</Text>
               </Row>
               <Row gap={10}>
                 <TouchableOpacity 
                   onPress={() => setShowHistory(true)}
                   style={styles.headerBtn}
                 >
                   <Lucide.History size={18} color="#F5B235" strokeWidth={2.2} />
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={() => navigation.navigate('RoutePlanner')} 
                   style={styles.headerBtn}
                 >
                   <Lucide.Navigation size={18} color="#F5B235" strokeWidth={2.4} />
                 </TouchableOpacity>
               </Row>
            </Row>

            {viewMode === 'list' && (
              <View style={{ gap: 12 }}>
                <View style={styles.viewToggleContainer}>
                   <TouchableOpacity 
                     onPress={() => { setViewMode('map'); setSelectedHazardId(null); }}
                     style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                   >
                     <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map View</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                     onPress={() => { setViewMode('list'); setSelectedHazardId(null); }}
                     style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                   >
                     <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List View</Text>
                   </TouchableOpacity>
                </View>

                <View style={styles.searchConsole}>
                   <Lucide.Search size={16} color="rgba(255,255,255,0.4)" strokeWidth={2.4} />
                   <TextInput 
                      placeholder="Search Intel..."
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={searchQuery}
                      onChangeText={handleSearch}
                      style={styles.searchInput}
                   />
                </View>
              </View>
            )}
         </View>
      </View>

      {/* 3. TACTICAL BOTTOM OVERLAY */}
      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 20) + 70 }]} pointerEvents="box-none">
          <View style={{ width: pageWidth - 32, alignSelf: 'center' }}>
             
             {viewMode === 'map' && (
                <View style={[styles.viewToggleContainer, { marginBottom: 16, alignSelf: 'center' }]}>
                    <TouchableOpacity 
                        onPress={() => setViewMode('map')}
                        style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
                    >
                        <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setViewMode('list')}
                        style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                    >
                        <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List View</Text>
                    </TouchableOpacity>
                </View>
             )}

             {/* HAZARD DATA CARD */}
            <AnimatePresence>
               {selectedHazard && viewMode === 'map' && (
                 <MotiView
                   from={{ opacity: 0, translateY: 40 }}
                   animate={{ opacity: 1, translateY: 0 }}
                   exit={{ opacity: 0, translateY: 40 }}
                   style={styles.hazardDetailCard}
                 >
                    <Row justify="space-between" align="flex-start" style={{ marginBottom: 12 }}>
                        <Row gap={12} align="center" style={{ flex: 1 }}>
                           <View style={[styles.cardIconBox, { backgroundColor: selectedAccent + "20", borderColor: selectedAccent + "40" }]}>
                              <SelectedIcon size={22} color={selectedAccent} strokeWidth={2.5} />
                           </View>
                           <View style={{ flex: 1 }}>
                              <Row justify="space-between" align="center">
                                <Text style={styles.cardTitle}>{selectedHazard.type || "Earthquake"}</Text>
                                <TouchableOpacity onPress={() => setSelectedHazardId(null)} style={{ padding: 4 }}>
                                   <Lucide.X size={18} color="rgba(255,255,255,0.4)" />
                                </TouchableOpacity>
                              </Row>
                              <Row align="center" gap={4}>
                                 <Lucide.MapPin size={10} color="rgba(255,255,255,0.4)" />
                                 <Text style={styles.cardLoc}>{selectedHazard.address || "Cebu City"}</Text>
                              </Row>
                           </View>
                        </Row>
                       <Col align="flex-end">
                          <View style={[styles.ongoingBadge, { backgroundColor: (selectedHazard.severity === 'High' ? '#EF4444' : selectedHazard.severity === 'Medium' || selectedHazard.severity === 'Moderate' ? '#F59E0B' : '#10B981') + '20' }]}>
                             <View style={[styles.pulseDot, { backgroundColor: selectedHazard.severity === 'High' ? '#EF4444' : selectedHazard.severity === 'Medium' || selectedHazard.severity === 'Moderate' ? '#F59E0B' : '#10B981' }]} />
                             <Text style={[styles.ongoingText, { color: selectedHazard.severity === 'High' ? '#EF4444' : selectedHazard.severity === 'Medium' || selectedHazard.severity === 'Moderate' ? '#F59E0B' : '#10B981' }]}>
                                {selectedHazard.severity || 'Moderate'}
                             </Text>
                          </View>
                          <Text style={styles.cardDate}>Reported: {selectedHazard.created_at || 'Just Now'}</Text>
                       </Col>
                    </Row>

                    <View style={[styles.miniMapBox, { height: 140, marginBottom: 16 }]}>
                        {(() => {
                           const img = selectedHazard.media || selectedHazard.media_path || selectedHazard.photo_url;
                           if (img) {
                             const uri = img.startsWith('http') ? img : `${API_URL}/${img}`;
                             return <RNImage source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />;
                           }
                           return <RNImage source={{ uri: buildStaticPreview(selectedHazard) }} style={{ width: '100%', height: '100%' }} />;
                        })()}
                        <View style={styles.evacBanner}>
                           <Text style={styles.evacText}>{(selectedHazard.media || selectedHazard.media_path || selectedHazard.photo_url) ? 'VISUAL EVIDENCE' : 'PINNED LOCATION INTEL'}</Text>
                        </View>
                    </View>

                    {selectedHazard.description && (
                       <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18, fontFamily: DS_FONT_INPUT }}>
                             {selectedHazard.description}
                          </Text>
                       </View>
                    )}

                    {/* TRANSPORT PASSABILITY STATUS */}
                    <View style={styles.transportContainer}>
                        <Text style={styles.transportLabel}>TRANSPORT PASSABILITY STATUS</Text>
                        <Row justify="space-between" align="center" style={{ marginTop: 10 }}>
                            {[
                                { id: 'Walking', icon: 'Footprints' },
                                { id: 'Motorcycle', icon: 'Bike' },
                                { id: 'Car', icon: 'Car' },
                                { id: 'Truck', icon: 'Truck' }
                            ].map((mode) => {
                                const modesStr = String(selectedHazard.allowed_modes || '');
                                const isPassable = modesStr.toLowerCase().includes(mode.id.toLowerCase());
                                const color = isPassable ? '#10B981' : '#EF4444';
                                const Icon = Lucide[mode.icon];
                                
                                return (
                                    <View key={mode.id} style={styles.transportItem}>
                                        <View style={[styles.transportIconBox, { borderColor: color + '40', backgroundColor: color + '10' }]}>
                                            <Icon size={18} color={color} strokeWidth={2.5} />
                                        </View>
                                        <Text style={[styles.transportText, { color: color }]}>{mode.id}</Text>
                                    </View>
                                );
                            })}
                        </Row>
                    </View>
                 </MotiView>
               )}
            </AnimatePresence>

            {/* FLOATING ACTION BUTTONS */}
            {viewMode === 'map' && (
              <Col align="flex-end" style={{ position: 'absolute', top: -180, right: 0, gap: 12 }}>
                 {['admin', 'coordinator', 'brgy'].includes(userRole) && (
                   <TouchableOpacity 
                     onPress={() => setIsAddMode(true)}
                     style={[styles.fabBtn, { backgroundColor: '#F5B235', borderColor: '#F5B235' }]}
                   >
                     <Lucide.Plus size={24} color="#000" strokeWidth={2.5} />
                   </TouchableOpacity>
                 )}
                 <TouchableOpacity style={styles.fabBtn}><Lucide.Layers size={20} color="#FFF" /></TouchableOpacity>
                 <TouchableOpacity style={styles.fabBtn}><Lucide.Search size={20} color="#FFF" /></TouchableOpacity>
                 <TouchableOpacity 
                   onPress={() => {
                      if (mapRef.current) {
                         mapRef.current.postMessage(JSON.stringify({ type: 'FOCUS_HAZARD', lat: DEFAULT_REGION.lat, lng: DEFAULT_REGION.lng, zoom: 11 }));
                      }
                   }}
                   style={styles.fabBtn}
                 >
                    <Lucide.Crosshair size={20} color="#FFF" />
                 </TouchableOpacity>
              </Col>
            )}
         </View>
         <View style={{ height: insets.bottom, backgroundColor: selectedHazard && viewMode === 'map' ? '#161616' : 'transparent' }} />
      </View>

      {/* 4. LIST VIEW OVERLAY */}
      <AnimatePresence>
        {viewMode === 'list' && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'transparent', paddingTop: insets.top + 240 }]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ width: pageWidth, alignSelf: 'center', paddingBottom: 150, paddingHorizontal: 16 }}
            >
              <View style={{ height: 24 }} />
              {filteredHazards.map((hazard) => (
                  <TacticalIntelCard 
                    key={hazard.id}
                    item={hazard}
                    variant="list"
                    onPress={() => focusHazard(hazard)}
                    onZoom={() => focusHazard(hazard, 'map')}
                  />
                ))}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>


      {/* ── MISSION HISTORY MODAL ── */}
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
                      style={styles.reportCardHistory}
                    >
                      <View style={[styles.reportIconBoxHistory, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                        <Icon size={20} color={color} strokeWidth={2.2} />
                      </View>
                      
                      <View style={{ flex: 1 }}>
                        <Row justify="space-between" align="center">
                          <Text style={styles.reportTypeHistory}>{report.type || 'Intel packet'}</Text>
                          <Text style={styles.reportTimeHistory}>{formatRelativeTime(report.time)}</Text>
                        </Row>
                        <Row align="center" gap={8} style={{ marginTop: 4 }}>
                           <View style={[styles.statusBadgeCompactHistory, { backgroundColor: color + '20', borderColor: color + '30' }]}>
                             <Text style={[styles.statusBadgeTextCompactHistory, { color: color }]}>{(report.status || 'Pending').toUpperCase()}</Text>
                           </View>
                           <Text style={styles.reportAddressHistory} numberOfLines={1}>{report.barangay || 'Unknown Sector'}</Text>
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

    </Screen>{isAddMode && (
      <HazardAddControls 
        onPlace={() => setAddModalVisible(true)}
        onCancel={() => setIsAddMode(false)}
      />
    )}<HazardModal 
      visible={addModalVisible}
      onClose={() => setAddModalVisible(false)}
      form={createForm}
      setForm={setCreateForm}
      onSave={handleSaveHazard}
      saving={creating}
    /></>
  );
};

const styles = StyleSheet.create({
  mapVignette: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  headerRow: { height: 56, marginBottom: 16 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F4F0E8', fontFamily: DS_FONT_UI },
  searchConsole: { height: 54, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 27, marginBottom: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#FFF', fontWeight: '500' },
  viewToggleContainer: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(20,20,20,0.9)', 
    borderRadius: 25, 
    padding: 5, 
    alignSelf: 'center', 
    width: 280, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 9999,
    elevation: 10
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: '#FFF' },
  toggleText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  toggleTextActive: { color: '#000' },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5000, pointerEvents: 'box-none' },
  hazardDetailCard: { 
    backgroundColor: '#161616', 
    borderRadius: 24, 
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -16 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 24,
    elevation: 8,
    width: '100%',
    alignSelf: 'center',
  },
  cardIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', fontFamily: DS_FONT_UI },
  cardLoc: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  ongoingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, marginBottom: 4 },
  pulseDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444', marginRight: 5 },
  ongoingText: { fontSize: 8, fontWeight: '800', color: '#EF4444', letterSpacing: 0.8 },
  cardDate: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  miniMapBox: { flex: 1.5, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  evacBanner: { position: 'absolute', top: 12, left: 12, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  evacText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  graphBox: { flex: 1, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  primaryBtn: { flex: 1, height: 46, backgroundColor: '#FFF', borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2F80ED' },
  primaryBtnText: { fontSize: 13, fontWeight: '900', color: '#000', fontFamily: DS_FONT_UI },
  safeBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', fontFamily: DS_FONT_UI },
  transportContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  transportLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1
  },
  transportItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  transportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  transportText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  fabBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20,20,20,0.8)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listCard: { 
    backgroundColor: 'rgba(20, 20, 20, 0.92)', 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)', 
    overflow: 'hidden',
    alignSelf: 'center'
  },
  cardIconBoxSmall: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  listCardTitle: { fontSize: 15, fontWeight: '800', color: '#FFF', fontFamily: DS_FONT_UI, letterSpacing: -0.2 },
  listCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontWeight: '600' },
  listMiniMap: { height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  listPulseCircle: { position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  listPulseDot: { width: 10, height: 10, borderRadius: 5 },
  listPrimaryBtn: { flex: 1, height: 44, backgroundColor: '#FFF', borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2F80ED' },
  listPrimaryBtnText: { fontSize: 12, fontWeight: '900', color: '#000' },
  listSafeBtn: { flex: 1, height: 44, backgroundColor: 'rgba(20,20,20,0.9)', borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  listSafeBtnText: { fontSize: 12, fontWeight: '800', color: '#FFF' },

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
  reportCardHistory: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center'
  },
  reportIconBoxHistory: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1
  },
  reportTypeHistory: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: DS_FONT_UI
  },
  reportTimeHistory: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 2,
    fontFamily: DS_FONT_UI
  },
  reportAddressHistory: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: DS_FONT_UI,
    flex: 1
  },
  statusBadgeCompactHistory: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1
  },
  statusBadgeTextCompactHistory: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5
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
    color: '#F3EEE6',
    fontSize: 13,
    fontFamily: DS_FONT_INPUT
  },
});

export default HazardMapScreen;
