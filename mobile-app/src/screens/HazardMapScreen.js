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
    const id = userId || user?.id;
    if (!id) return;
    setFetchingReports(true);
    try {
      const res = await fetch(`${API_URL}/list-incident-reports.php?user_id=${id}&all_time=true`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMyReports(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setFetchingReports(false);
    }
  };

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

  const fetchHazards = async (user) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/list-hazards.php`, {
        headers: { 
          'X-Role': user?.role || 'resident',
          'X-Token': user?.token || 'RESCUE_PH_TOKEN'
        }
      });
      const data = await response.json();
      if (data?.success && Array.isArray(data.hazards)) {
        setHazards(data.hazards);
        if (data.hazards.length > 0) {
          // No auto-selection as requested
        }
      }
    } catch (error) {
      console.error('Error fetching hazards:', error);
    } finally {
      setLoading(false);
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
    const query = searchQuery.trim().toLowerCase();
    if (!query) return hazards;
    return hazards.filter((hazard) => {
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

  const mapHTML = useMemo(() => {
    const payload = centeredHazards.map((hazard) => {
      const kind = getHazardKind(hazard);
      const accent = HAZARD_ACCENTS[kind] || HAZARD_ACCENTS.Other;
      return {
        id: hazard.id,
        lat: hazard.lat,
        lng: hazard.lng,
        type: hazard.type || kind,
        accent,
        area: hazard.area_geojson || null,
        is_passable: hazard.is_passable,
        severity: hazard.severity
      };
    });

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
          const hazards = ${JSON.stringify(payload)}.map(h => ({
            ...h,
            area: typeof h.area === 'string' ? JSON.parse(h.area) : h.area
          }));
          const markers = [];

          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
            center: [${region.lng}, ${region.lat}],
            zoom: ${selectedHazard ? 12.7 : 10.8},
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
            return { type: 'Polygon', coordinates: [ret] };
          }

          function post(payload) {
            const data = JSON.stringify(payload);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(data);
            }
          }

          function drawHazards() {
            markers.forEach((m) => m.remove());
            hazards.forEach((hazard) => {
              const isPassable = String(hazard.is_passable) === '1' || hazard.is_passable === true;
              const hazardColor = isPassable ? '#F59E0B' : '#EF4444';
              
              // 1. Draw Area Polygons / Pinpoint Radius
              const sourceId = 'source-' + hazard.id;
              const layerId = 'layer-' + hazard.id;
              const borderId = 'border-' + hazard.id;

              if (!map.getSource(sourceId)) {
                let geometry = hazard.area;
                if (!geometry) {
                  // Fallback to pinpoint radius
                  geometry = createCircle([hazard.lng, hazard.lat], 0.35);
                }

                map.addSource(sourceId, {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: { id: hazard.id },
                    geometry: geometry
                  }
                });

                map.addLayer({
                  id: layerId,
                  type: 'fill',
                  source: sourceId,
                  paint: {
                    'fill-color': hazardColor,
                    'fill-opacity': 0.22
                  }
                });

                map.addLayer({
                  id: borderId,
                  type: 'line',
                  source: sourceId,
                  paint: {
                    'line-color': hazardColor,
                    'line-width': 2,
                    'line-dasharray': [3, 2]
                  }
                });

                map.on('click', layerId, () => post({ type: 'select-hazard', id: hazard.id }));
              }

              // 2. Draw Points/Markers
              const el = document.createElement('div');
              el.className = 'hazard-marker';
              el.onclick = () => post({ type: 'select-hazard', id: hazard.id });
              
              const type = (hazard.type || '').toLowerCase();
              let icon = 'alert';
              if (type.includes('fire')) icon = 'fire';
              else if (type.includes('flood')) icon = 'waves';
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
              markers.push(marker);
            });
          }

          window.handleSync = function(data) {
            if (!data) return;
            if (data.type === 'FOCUS_HAZARD') {
              map.flyTo({
                center: [data.lng, data.lat],
                zoom: data.zoom || 13.8,
                duration: 1500
              });
            }
          };

          map.on('load', () => {
            drawHazards();
          });
        </script>
      </body>
      </html>
    `;
  }, [centeredHazards, isDark, region.lat, region.lng, selectedHazard]);

  const selectedAccent = selectedHazard
    ? HAZARD_ACCENTS[getHazardKind(selectedHazard)] || HAZARD_ACCENTS.Other
    : '#FF4B5F';

  const SelectedIcon = Lucide[HAZARD_ICONS[selectedHazard ? getHazardKind(selectedHazard) : 'Other']] || Lucide.MapPinned;

  return (
    <Screen withOrnament={false} style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />

      {/* 1. IMMERSIVE MAP LAYER */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <UniversalWebView
          ref={mapRef}
          source={{ html: mapHTML }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'select-hazard') {
                const match = hazards.find((item) => item.id === data.id);
                if (match) focusHazard(match);
              }
            } catch (error) {
              console.error('Hazard map message error:', error);
            }
          }}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} />
      </View>


      {/* 2. TACTICAL TOP OVERLAY */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
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
                   onPress={() => fetchHazards()} 
                   style={styles.headerBtn}
                 >
                   {loading ? <ActivityIndicator size="small" color="#F5B235" /> : <Lucide.RefreshCw size={18} color="#F4F0E8" strokeWidth={2.2} />}
                 </TouchableOpacity>
                 <TouchableOpacity 
                   onPress={() => setShowHistory(true)}
                   style={styles.headerBtn}
                 >
                   <Lucide.History size={18} color="#F5B235" strokeWidth={2.2} />
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.headerBtn}>
                   <Lucide.Layers size={18} color="#F4F0E8" strokeWidth={2.2} />
                 </TouchableOpacity>
               </Row>
            </Row>

            {viewMode === 'list' && (
              <View style={styles.searchConsole}>
                 <Lucide.Search size={16} color="rgba(255,255,255,0.4)" strokeWidth={2.4} />
                 <TextInput 
                    placeholder="Search"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    style={styles.searchInput}
                 />
              </View>
            )}

            {viewMode === 'list' && (
              <View style={styles.viewToggleContainer}>
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
         </View>
      </View>

      {/* 3. TACTICAL BOTTOM OVERLAY */}
      <View style={[styles.bottomOverlay, { paddingBottom: 0 }]}>
         <View style={{ width: pageWidth - 32, alignSelf: 'center' }}>
            
            {/* VIEW TOGGLE (FLOATING ON MAP) */}
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
                       <Row gap={12} align="center">
                          <View style={[styles.cardIconBox, { backgroundColor: selectedAccent + '20', borderColor: selectedAccent + '40' }]}>
                             <SelectedIcon size={22} color={selectedAccent} strokeWidth={2.5} />
                          </View>
                          <View>
                             <Text style={styles.cardTitle}>{selectedHazard.type || 'Earthquake'}</Text>
                             <Row align="center" gap={4}>
                                <Lucide.MapPin size={10} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.cardLoc}>{selectedHazard.address || 'Cebu City'}</Text>
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

                    <View style={[styles.miniMapBox, { height: 120, marginBottom: 16 }]}>
                       <RNImage source={{ uri: buildStaticPreview(selectedHazard) }} style={{ width: '100%', height: '100%' }} />
                       <View style={styles.evacBanner}>
                          <Text style={styles.evacText}>Pinned Location Intelligence</Text>
                       </View>
                    </View>

                     <Row style={{ marginTop: 8 }}>
                        <TouchableOpacity 
                          onPress={() => handleMarkSafe(selectedHazard)}
                          style={styles.safeBtn}
                        >
                           <Lucide.CheckCircle size={18} color="#FFF" />
                           <Text style={styles.safeBtnText}>Mark Safe</Text>
                        </TouchableOpacity>
                     </Row>
                 </MotiView>
               )}
            </AnimatePresence>

            {/* FLOATING ACTION BUTTONS */}
            {viewMode === 'map' && (
              <Col align="flex-end" style={{ position: 'absolute', top: -180, right: 0, gap: 12 }}>
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
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'transparent', paddingTop: insets.top + 180 }]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ width: pageWidth, alignSelf: 'center', paddingBottom: 150 }}
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

    </Screen>
  );
};

const styles = StyleSheet.create({
  mapVignette: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.1)' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerRow: { height: 56, marginBottom: 16 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#F4F0E8', fontFamily: DS_FONT_UI },
  searchConsole: { height: 54, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 27, marginBottom: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#FFF', fontWeight: '500' },
  viewToggleContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 25, padding: 4, alignSelf: 'center', width: '100%', marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: '#FFF' },
  toggleText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  toggleTextActive: { color: '#000' },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
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
  safeBtn: { flex: 1, height: 46, backgroundColor: 'rgba(20,20,20,0.9)', borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  safeBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF', fontFamily: DS_FONT_UI },
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
