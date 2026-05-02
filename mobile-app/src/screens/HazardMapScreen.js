import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from '../components/DesignSystem';
import UniversalWebView from '../components/UniversalWebView';
import { HazardAddControls, HazardModal } from '../components/Map/HazardAddControls';

const DEFAULT_REGION = { lat: 14.2833, lng: 121.4167 };

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

  // PRECISION RESPONSIVENESS
  const contentWidth = pageWidth - 32;
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

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = await AuthService.checkSession();
    if (user) setUserRole(user.role);
    await fetchHazards(user);

    if (route.params?.shelter) {
      const lat = parseFloat(route.params.shelter.lat);
      const lng = parseFloat(route.params.shelter.lng);
      setRegion({ lat, lng });
    }
  };

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
      if (Array.isArray(data)) {
        setHazards(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedHazardId(first.id);
          if (first.lat && first.lng) {
            setRegion({ lat: Number(first.lat), lng: Number(first.lng) });
          }
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
    if (!filteredHazards.length && !hazards.length) return null;
    const pool = filteredHazards.length ? filteredHazards : hazards;
    return pool.find((item) => item.id === selectedHazardId) || pool[0] || null;
  }, [filteredHazards, hazards, selectedHazardId]);

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
        area: hazard.area_geojson || null
      };
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
        <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
        <style>
          html, body { margin: 0; padding: 0; background: #080808; }
          #map { position: absolute; inset: 0; }
          .hazard-marker {
            width: 28px;
            height: 28px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2.5px solid #FFF;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            cursor: pointer;
          }
          .hazard-marker::after {
            content: '';
            width: 8px;
            height: 8px;
            border-radius: 4px;
            background: #FFF;
          }
          .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
          const hazards = ${JSON.stringify(payload)};
          const markers = [];

          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
            center: [${region.lng}, ${region.lat}],
            zoom: ${selectedHazard ? 12.7 : 10.8},
            antialias: true
          });

          function post(payload) {
            const data = JSON.stringify(payload);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(data);
            }
          }

          function drawHazards() {
            markers.forEach((m) => m.remove());
            hazards.forEach((hazard) => {
              // 1. Draw Area Polygons if present
              if (hazard.area) {
                const sourceId = 'source-' + hazard.id;
                const layerId = 'layer-' + hazard.id;
                const borderId = 'border-' + hazard.id;

                if (!map.getSource(sourceId)) {
                  map.addSource(sourceId, {
                    type: 'geojson',
                    data: hazard.area
                  });

                  map.addLayer({
                    id: layerId,
                    type: 'fill',
                    source: sourceId,
                    paint: {
                      'fill-color': hazard.accent,
                      'fill-opacity': 0.35
                    }
                  });

                  map.addLayer({
                    id: borderId,
                    type: 'line',
                    source: sourceId,
                    paint: {
                      'line-color': hazard.accent,
                      'line-width': 2.5
                    }
                  });

                  map.on('click', layerId, () => post({ type: 'select-hazard', id: hazard.id }));
                  map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
                  map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
                }
              }

              // 2. Draw Points/Markers
              const el = document.createElement('div');
              el.className = 'hazard-marker';
              el.style.background = hazard.accent;
              el.onclick = () => post({ type: 'select-hazard', id: hazard.id });

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
         <View style={{ width: contentWidth, alignSelf: 'center' }}>
            <Row align="center" justify="space-between" style={styles.headerRow}>
               <Row align="center" gap={12}>
                  <TouchableOpacity 
                    activeOpacity={0.86} 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                  >
                    <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.4} />
                  </TouchableOpacity>
                  <View>
                     <Text style={styles.radarLabel}>RADAR COMMAND</Text>
                     <Text style={styles.headerTitle}>Hazard Intelligence Map</Text>
                  </View>
               </Row>
               <TouchableOpacity 
                 activeOpacity={0.86} 
                 onPress={() => fetchHazards()} 
                 style={styles.refreshBtn}
               >
                 {loading ? <ActivityIndicator size="small" color="#F5B235" /> : <Lucide.RefreshCw size={18} color="#F4F0E8" strokeWidth={2.2} />}
               </TouchableOpacity>
            </Row>

            {/* SEARCH CONSOLE */}
            <View style={styles.searchConsole}>
               <Lucide.Search size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
               <TextInput 
                  placeholder="Scan Sector for Hazards..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  style={styles.searchInput}
               />
               <TouchableOpacity onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}>
                  <Lucide.Layers size={16} color="#F5B235" />
               </TouchableOpacity>
            </View>

            {/* SUGGESTIONS OVERLAY */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <MotiView 
                  from={{ opacity: 0, translateY: -10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: -10 }}
                  style={styles.suggestionsBox}
                >
                  {suggestions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => focusHazard(item, 'map')}
                      style={styles.suggestionItem}
                    >
                      <Lucide.Circle size={8} color={HAZARD_ACCENTS[getHazardKind(item)]} fill={HAZARD_ACCENTS[getHazardKind(item)]} />
                      <Col style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.suggestionTitle}>{item.type || 'Unknown'}</Text>
                        <Text style={styles.suggestionSub} numberOfLines={1}>{item.address || 'Locating...'}</Text>
                      </Col>
                    </TouchableOpacity>
                  ))}
                </MotiView>
              )}
            </AnimatePresence>
         </View>
      </View>

      {/* 3. TACTICAL BOTTOM OVERLAY */}
      <View style={[styles.bottomOverlay, { paddingBottom: Math.max(insets.bottom, 24) }]}>
         <View style={{ width: contentWidth, alignSelf: 'center' }}>
            
            {/* HAZARD DATA CARD */}
            <AnimatePresence>
               {selectedHazard && viewMode === 'map' && (
                 <MotiView
                   from={{ opacity: 0, translateY: 40 }}
                   animate={{ opacity: 1, translateY: 0 }}
                   exit={{ opacity: 0, translateY: 40 }}
                   style={styles.hazardCard}
                 >
                    <Row align="center" justify="space-between" style={{ marginBottom: 16 }}>
                       <Row align="center" gap={12}>
                          <View style={[styles.cardIconBox, { backgroundColor: selectedAccent + '20', borderColor: selectedAccent + '40' }]}>
                             <SelectedIcon size={20} color={selectedAccent} strokeWidth={2.5} />
                          </View>
                          <View>
                             <Text style={styles.cardTypeLabel}>{selectedHazard.type?.toUpperCase() || 'HAZARD'}</Text>
                             <Text style={styles.cardTitle} numberOfLines={1}>{selectedHazard.address || 'Sector Alert'}</Text>
                          </View>
                       </Row>
                       <View style={styles.liveTag}>
                          <View style={styles.livePulse} />
                          <Text style={styles.liveText}>LIVE</Text>
                       </View>
                    </Row>

                    <Text style={styles.cardDesc} numberOfLines={2}>
                       {selectedHazard.description || 'Sector teams are monitoring this hazard for public safety.'}
                    </Text>

                    <View style={styles.telemetryGrid}>
                       <View style={styles.telItem}>
                          <Text style={styles.telLabel}>SEVERITY</Text>
                          <Text style={[styles.telValue, { color: selectedAccent }]}>{selectedHazard.severity?.toUpperCase() || 'MEDIUM'}</Text>
                       </View>
                       <View style={styles.telItem}>
                          <Text style={styles.telLabel}>STATUS</Text>
                          <Text style={styles.telValue}>{selectedHazard.status?.toUpperCase() || 'ACTIVE'}</Text>
                       </View>
                       <View style={styles.telItem}>
                          <Text style={styles.telLabel}>REPORTED</Text>
                          <Text style={styles.telValue}>
                             {selectedHazard.datetime ? new Date(selectedHazard.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </Text>
                       </View>
                    </View>

                    <Row gap={12} style={{ marginTop: 20 }}>
                       <TouchableOpacity 
                         onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selectedHazard.lat},${selectedHazard.lng}`)}
                         style={styles.primaryBtn}
                       >
                          <Text style={styles.primaryBtnText}>NAVIGATE TO SECTOR</Text>
                       </TouchableOpacity>
                       <TouchableOpacity 
                         onPress={() => handleMarkSafe(selectedHazard)}
                         style={styles.secondaryBtn}
                       >
                          <Lucide.CheckCircle size={14} color="#FFF" />
                          <Text style={styles.secondaryBtnText}>MARK SAFE</Text>
                       </TouchableOpacity>
                    </Row>
                 </MotiView>
               )}
            </AnimatePresence>

            {/* FLOATING ACTION BUTTONS */}
            <Row justify="space-between" align="center" style={{ marginTop: 16 }}>
               <TouchableOpacity 
                  onPress={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
                  style={styles.modeToggle}
               >
                  <Lucide.LayoutList size={18} color="#FFF" />
                  <Text style={styles.modeToggleText}>{viewMode === 'map' ? 'LIST VIEW' : 'MAP VIEW'}</Text>
               </TouchableOpacity>
               
               <Row gap={12}>
                  <TouchableOpacity 
                    onPress={() => {
                       if (mapRef.current) {
                          mapRef.current.postMessage(JSON.stringify({ type: 'FOCUS_HAZARD', lat: DEFAULT_REGION.lat, lng: DEFAULT_REGION.lng, zoom: 11 }));
                       }
                    }}
                    style={styles.roundBtn}
                  >
                     <Lucide.Crosshair size={20} color="#FFF" />
                  </TouchableOpacity>
                  {userRole !== 'resident' && (
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('AddHazard')}
                      style={[styles.roundBtn, { backgroundColor: '#F5B235' }]}
                    >
                       <Lucide.Plus size={24} color="#000" strokeWidth={3} />
                    </TouchableOpacity>
                  )}
               </Row>
            </Row>
         </View>
      </View>

      {/* 4. LIST VIEW OVERLAY */}
      <AnimatePresence>
        {viewMode === 'list' && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: '#080808', paddingTop: insets.top + 80 }]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ width: contentWidth, alignSelf: 'center', paddingBottom: 100 }}
            >
              {filteredHazards.map((hazard) => {
                const kind = getHazardKind(hazard);
                const accent = HAZARD_ACCENTS[kind];
                const Icon = Lucide[HAZARD_ICONS[kind]];
                return (
                  <TouchableOpacity 
                    key={hazard.id}
                    onPress={() => focusHazard(hazard, 'map')}
                    style={styles.listItem}
                  >
                    <View style={[styles.listItemIcon, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
                       <Icon size={20} color={accent} strokeWidth={2.5} />
                    </View>
                    <Col style={{ flex: 1, marginLeft: 16 }}>
                       <Text style={styles.listItemTitle}>{hazard.type || kind}</Text>
                       <Text style={styles.listItemSub} numberOfLines={1}>{hazard.address || 'Locating...'}</Text>
                    </Col>
                    <Lucide.ChevronRight size={18} color="rgba(255,255,255,0.2)" />
                  </TouchableOpacity>
                );
              })}
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
  headerRow: { height: 56 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  radarLabel: { fontSize: 8, fontWeight: '800', color: '#F5B235', letterSpacing: 2.5, fontFamily: DS_FONT_UI },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#F4F0E8', fontFamily: DS_FONT_UI },
  searchConsole: { height: 52, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 26, marginTop: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, color: '#FFF', fontFamily: DS_FONT_INPUT },
  suggestionsBox: { backgroundColor: 'rgba(20,20,20,0.98)', marginTop: 8, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#FFF', fontFamily: DS_FONT_UI },
  suggestionSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: DS_FONT_INPUT },
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 },
  hazardCard: { 
    backgroundColor: 'rgba(20,20,20,0.96)', 
    borderRadius: 32, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 20 }, 
    shadowOpacity: 0.5, 
    shadowRadius: 30,
    boxShadow: '0 20px 30px rgba(0,0,0,0.5)'
  },
  cardIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardTypeLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: DS_FONT_UI },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', fontFamily: DS_FONT_UI },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
  liveText: { fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 1 },
  cardDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20, fontFamily: DS_FONT_INPUT },
  telemetryGrid: { flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  telItem: { flex: 1 },
  telLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginBottom: 4 },
  telValue: { fontSize: 13, fontWeight: '700', color: '#FFF', fontFamily: DS_FONT_UI },
  primaryBtn: { flex: 2, height: 50, backgroundColor: '#FFF', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 12, fontWeight: '800', color: '#000', letterSpacing: 1, fontFamily: DS_FONT_UI },
  secondaryBtn: { flex: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  secondaryBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF', fontFamily: DS_FONT_UI },
  modeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeToggleText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  roundBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  listItemIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  listItemTitle: { fontSize: 16, fontWeight: '600', color: '#FFF', fontFamily: DS_FONT_UI },
  listItemSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: DS_FONT_INPUT },
});

export default HazardMapScreen;
