import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import { Screen, Row, Col, Card, Heading, Container, IconBox, Divider, PrimaryButton, useResponsive, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';
import { AuthService } from '../services/AuthService';

const LocalAreaMapScreen = ({ navigation, isPreview = false }) => {
  const { theme, isDark, atomic } = useTheme();
  const { width: screenWidth, height: screenHeight, isTablet, safeTop } = useResponsive();
  const insets = useSafeAreaInsets();
  const webviewRef = useRef(null);

  if (isPreview) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
          {Platform.OS === 'web' ? (
            <iframe 
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
                  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
                  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
                  <style>
                    body { margin: 0; padding: 0; background: #000; overflow: hidden; }
                    #map { position: absolute; top: 0; bottom: 0; width: 100vw; height: 100vh; }
                  </style>
                </head>
                <body>
                  <div id="map"></div>
                  <script>
                    try {
                      mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
                      const map = new mapboxgl.Map({
                        container: 'map',
                        style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
                        center: [121.4167, 14.2833],
                        zoom: 12,
                        interactive: false,
                        attributionControl: false
                      });
                    } catch (e) {
                      console.error('Mapbox Load Error:', e);
                    }
                  </script>
                </body>
                </html>
              `} 
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }} 
            />
         ) : (
            <WebView 
               source={{ html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                     <meta charset="utf-8">
                     <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
                     <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
                     <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
                     <style>body { margin: 0; padding: 0; } #map { position: absolute; top: 0; bottom: 0; width: 100%; }</style>
                  </head>
                  <body>
                     <div id="map"></div>
                     <script>
                        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
                        new mapboxgl.Map({
                           container: 'map',
                           style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
                           center: [121.4167, 14.2833],
                           zoom: 12,
                           interactive: false
                        });
                     </script>
                  </body>
                  </html>
               ` }}
               scrollEnabled={false}
            />
         )}
      </View>
    );
  }
  
  const [user, setUser] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrgy, setSelectedBrgy] = useState(null);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add/Edit state
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '', type: 'Hall' });
  const [tempCoords, setTempCoords] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const session = await AuthService.checkSession();
    setUser(session);
    fetchBarangays();
  };

  const fetchBarangays = async () => {
    try {
      const res = await fetch(`${API_URL}/list-barangays.php`);
      const data = await res.json();
      if (data.success) {
        setBarangays(data.barangays || []);
      }
    } catch (e) {
      console.error('Error fetching barangays:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBarangays = useMemo(() => {
    if (!searchQuery.trim()) return barangays;
    const q = searchQuery.toLowerCase();
    return barangays.filter(b => b.name.toLowerCase().includes(q) || (b.type || '').toLowerCase().includes(q));
  }, [barangays, searchQuery]);

  const handleMapClick = (coords) => {
    if (isAddMode && !isEditing) {
      setTempCoords(coords);
      webviewRef.current.injectJavaScript(`
        if (window.tempMarker) window.tempMarker.remove();
        window.tempMarker = new mapboxgl.Marker({ color: '#EF4444' })
          .setLngLat([${coords.lng}, ${coords.lat}])
          .addTo(map);
      `);
    }
  };

  const handleSelectBrgy = (brgy) => {
    setSelectedBrgy(brgy);
    if (!isTablet) setIsListExpanded(false);
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        map.easeTo({ 
          center: [${brgy.lng}, ${brgy.lat}], 
          zoom: 16,
          duration: 1000
        });
      `);
    }
  };

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert('Missing Info', 'Please enter a name for the location.');
      return;
    }
    if (!tempCoords && !isEditing) {
      Alert.alert('Location Required', 'Please tap on the map to place the pin.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        address: 'Santa Cruz, Laguna',
        lat: isEditing ? selectedBrgy.lat : tempCoords.lat,
        lng: isEditing ? selectedBrgy.lng : tempCoords.lng,
        added_by: user?.full_name || user?.username || 'Admin',
        id: isEditing ? selectedBrgy.id : undefined
      };

      const endpoint = isEditing ? 'update-barangay.php' : 'add-barangay.php';
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        Alert.alert('Success', isEditing ? 'Location updated.' : 'New location added.');
        setIsAddMode(false);
        setIsEditing(false);
        setTempCoords(null);
        setForm({ name: '', contact: '', type: 'Hall' });
        fetchBarangays();
      } else {
        Alert.alert('Error', data.error || 'Failed to save.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!selectedBrgy) return;
    Alert.alert("Decommission Node", "Are you certain you wish to permanently remove this tactical asset?", [
      { text: "Abort", style: 'cancel' },
      { text: "Confirm", style: "destructive", onPress: async () => {
        setSubmitting(true);
        try {
          const res = await fetch(`${API_URL}/delete-barangay.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedBrgy.id })
          });
          const data = await res.json();
          if (data.success) {
            setIsAddMode(false);
            setIsEditing(false);
            setSelectedBrgy(null);
            fetchBarangays();
          }
        } catch (e) {} finally { setSubmitting(false); }
      }}
    ]);
  };

  const mapHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
      <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
      <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .marker { cursor: pointer; }
        .pulse { 
          width: 24px; height: 24px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid rgba(255,255,255,0.94);
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pulse:hover { transform: scale(1.15); z-index: 999; }
        .pulse-inner { width: 8px; height: 8px; background: #fff; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
        const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
          center: [121.4167, 14.2833],
          zoom: 13,
          antialias: true
        });

        const markers = [];

        function updateMarkers(brgyList) {
          markers.forEach(m => m.remove());
          markers.length = 0;
          
          brgyList.forEach(brgy => {
            const el = document.createElement('div');
            el.className = 'pulse';
            const inner = document.createElement('div');
            inner.className = 'pulse-inner';
            el.appendChild(inner);
            
            el.style.background = brgy.type === 'Hall' ? '#2563EB' : '#10B981';
            const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([brgy.lng, brgy.lat])
              .addTo(map);
              
            el.addEventListener('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_BRGY', id: brgy.id }));
            });
            
            markers.push(marker);
          });
        }

        map.on('click', (e) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'MAP_CLICK', 
            coords: e.lngLat 
          }));
        });

        window.addEventListener('message', (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'SET_MARKERS') {
            updateMarkers(data.data);
          }
        });
      </script>
    </body>
    </html>
  `, [isDark]);

  useEffect(() => {
    if (webviewRef.current && barangays.length > 0) {
      webviewRef.current.injectJavaScript(`
        if (typeof updateMarkers === 'function') {
          updateMarkers(${JSON.stringify(barangays)});
        }
      `);
    }
  }, [barangays]);

  const canManage = (brgy) => {
    if (!user || !brgy) return false;
    if (user.role === 'admin') return true;
    return brgy.added_by === user.full_name || brgy.added_by === user.username;
  };

  return (
    <Screen withOrnament={false} style={{ backgroundColor: '#000', flexDirection: isTablet ? 'row' : 'column' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* MAP LAYER */}
      <View style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <iframe 
            srcDoc={mapHTML} 
            style={{ width: '100%', height: '100%', border: 'none' }} 
            onLoad={() => {
               const frame = document.querySelector('iframe');
               if (frame && frame.contentWindow && barangays.length > 0) {
                 frame.contentWindow.postMessage(JSON.stringify({ type: 'SET_MARKERS', data: barangays }), '*');
               }
            }}
          />
        ) : (
          <WebView 
            ref={webviewRef}
            source={{ html: mapHTML }}
            onMessage={(e) => {
              const data = JSON.parse(e.nativeEvent.data);
              if (data.type === 'MAP_CLICK') handleMapClick(data.coords);
              if (data.type === 'SELECT_BRGY') {
                const b = barangays.find(x => x.id === data.id);
                if (b) handleSelectBrgy(b);
              }
            }}
            scrollEnabled={false}
          />
        )}

        {/* TOP HEADER OVERLAY (Phone Only - On Tablet we put it in the sidebar) */}
        {!isTablet && (
          <View style={[atomic.abs, { top: insets.top + 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={{ 
                width: 42, height: 42, borderRadius: 21, 
                backgroundColor: 'rgba(255,255,255,0.06)', 
                alignItems: 'center', justifyContent: 'center', 
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
                ...theme.shadows.md
              }}
            >
              <Lucide.ChevronLeft size={20} color="#F4F0E8" strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View style={{ 
              backgroundColor: 'rgba(24,20,17,0.94)', 
              borderRadius: 20, 
              ...theme.shadows.md, 
              borderWidth: 1, 
              borderColor: 'rgba(255,255,255,0.08)', 
              flex: 1, 
              marginLeft: 12, 
              height: 42,
              paddingHorizontal: 16,
              flexDirection: 'row', 
              alignItems: 'center' 
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F5B235', marginRight: 10 }} />
              <Col>
                 <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>TACTICAL FIELD MAP</Text>
                 <Text style={{ fontSize: 13, fontWeight: '700', color: '#F4F0E8' }}>ACTIVE SECTOR VIEW</Text>
              </Col>
            </View>

            {(user?.role === 'admin' || user?.role === 'brgy') && (
              <TouchableOpacity 
                onPress={() => {
                  setIsAddMode(!isAddMode);
                  setIsEditing(false);
                  setTempCoords(null);
                }}
                style={{ 
                  width: 42, height: 42, borderRadius: 21, 
                  backgroundColor: isAddMode ? '#EF4444' : '#F5B235', 
                  alignItems: 'center', justifyContent: 'center', 
                  ...theme.shadows.glow, 
                  marginLeft: 12, 
                  borderWidth: 1, 
                  borderColor: 'rgba(255,255,255,0.2)' 
                }}
              >
                <Lucide.Plus size={20} color="#fff" strokeWidth={3} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ASSET LIST (Responsive Side Panel or Bottom Sheet) */}
      <MotiView 
        animate={{ 
          height: isTablet ? '100%' : (isListExpanded ? screenHeight * 0.55 : 90),
          width: isTablet ? 400 : '100%',
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 80 }}
        style={{ 
          backgroundColor: 'rgba(24,20,17,0.96)', 
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          ...theme.shadows.lg,
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          paddingBottom: isTablet ? 0 : 8,
          overflow: 'hidden',
          zIndex: 40,
        }}
      >
        {!isTablet && (
          <TouchableOpacity 
            onPress={() => setIsListExpanded(!isListExpanded)}
            activeOpacity={1}
            style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3 }} />
          </TouchableOpacity>
        )}

        {(isListExpanded || isTablet) && (
          <View style={{ flex: 1 }}>
            {isTablet && (
              <View style={{ padding: 24, paddingBottom: 12 }}>
                <Row align="center" justify="space-between" style={{ marginBottom: 20 }}>
                   <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Lucide.ArrowLeft size={20} color="rgba(255,255,255,0.4)" />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>BACK</Text>
                   </TouchableOpacity>
                   {(user?.role === 'admin' || user?.role === 'brgy') && (
                      <TouchableOpacity 
                        onPress={() => { setIsAddMode(!isAddMode); setIsEditing(false); setTempCoords(null); }}
                        style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: isAddMode ? '#EF4444' : '#F5B235', borderRadius: 12 }}
                      >
                         <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{isAddMode ? 'CANCEL' : 'ADD NEW'}</Text>
                      </TouchableOpacity>
                   )}
                </Row>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#F5B235', letterSpacing: 2.5, textTransform: 'uppercase' }}>SITUATIONAL LOGISTICS</Text>
                <Heading size="md" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Tactical Asset Hub</Heading>
              </View>
            )}

            <View style={{ paddingHorizontal: 24, marginBottom: 20 }}>
               <View style={{ 
                 flexDirection: 'row', 
                 alignItems: 'center', 
                 backgroundColor: 'rgba(255,255,255,0.03)', 
                 borderRadius: 25, 
                 paddingHorizontal: 18, 
                 height: 50, 
                 borderWidth: 1, 
                 borderColor: 'rgba(255,255,255,0.08)' 
               }}>
                  <Lucide.Search size={18} color="rgba(255,255,255,0.3)" />
                  <TextInput 
                    placeholder="Query nodes..." 
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#F4F0E8', fontWeight: '500', fontFamily: DS_FONT_UI }}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
               </View>
            </View>

            <ScrollView 
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              <Row justify="space-between" align="center" style={atomic.mb24}>
                <Col>
                   <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.primary, letterSpacing: 1.5, textTransform: 'uppercase' }]}>Active Deployments</Text>
                   <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary }}>{filteredBarangays.length} Sector Nodes</Text>
                </Col>
              </Row>

              {filteredBarangays.map((brgy) => {
                const isSelected = selectedBrgy?.id === brgy.id;
                const typeColor = brgy.type === 'Hall' ? theme.primary : theme.success;
                const canManageNode = canManage(brgy);
                
                return (
                  <TouchableOpacity 
                    key={brgy.id}
                    onPress={() => handleSelectBrgy(brgy)}
                    activeOpacity={0.8}
                    style={{ 
                      marginBottom: 10,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isSelected ? theme.primary : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Row align="center" style={{ padding: 12 }}>
                      <View style={{ 
                        width: 36, 
                        height: 36, 
                        backgroundColor: typeColor + '12', 
                        borderRadius: 18, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderWidth: 1, 
                        borderColor: typeColor + '25' 
                      }}>
                        <Lucide.Shield size={16} color={typeColor} strokeWidth={2.2} />
                      </View>
                      <Col style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={{ 
                          fontSize: 15, 
                          fontWeight: '600', 
                          color: isSelected ? '#F4F0E8' : 'rgba(244,240,232,0.92)' 
                        }} numberOfLines={1}>{brgy.name}</Text>
                        <Row align="center" gap={6} style={{ marginTop: 2 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
                          <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(34,197,94,0.85)', letterSpacing: 0.5 }}>SYNCED</Text>
                        </Row>
                      </Col>
                      {canManageNode && (
                        <TouchableOpacity 
                          onPress={() => {
                            setForm({ name: brgy.name, contact: brgy.contact || '', type: brgy.type || 'Hall' });
                            setSelectedBrgy(brgy);
                            setIsEditing(true);
                            setIsAddMode(true);
                          }}
                          style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: 16, 
                            backgroundColor: 'rgba(255,255,255,0.04)', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}
                        >
                          <Lucide.Settings2 size={15} color={theme.primary} strokeWidth={2.2} />
                        </TouchableOpacity>
                      )}
                    </Row>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!isListExpanded && !isTablet && (
          <View style={[atomic.px24, atomic.row, atomic.aic, atomic.jcsb]}>
             <Col>
                <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, letterSpacing: 1 }}>ACTIVE SECTOR</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                  {selectedBrgy ? selectedBrgy.name : `${barangays.length} Tactical Points`}
                </Text>
             </Col>
             <TouchableOpacity 
               onPress={() => setIsListExpanded(true)}
               style={[atomic.px16, atomic.py10, { backgroundColor: theme.primary, borderRadius: 14 }]}
             >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>VIEW ALL</Text>
             </TouchableOpacity>
          </View>
        )}
      </MotiView>

      {/* ADD/EDIT MODAL OVERLAY */}
      <AnimatePresence>
        {isAddMode && (
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 1000 }]}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 450 }}>
              <Card variant="raised" style={[atomic.p24, { borderRadius: 32 }]}>
                <Row justify="space-between" align="center" style={atomic.mb20}>
                  <Heading size="sm">
                    {isEditing ? 'Sector Reconfiguration' : 'Deploy New Node'}
                  </Heading>
                  {isEditing && canManage(selectedBrgy) && (
                    <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
                       <Lucide.Trash2 size={20} color={theme.error} strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </Row>
                
                {!isEditing && (
                  <View style={[atomic.p16, atomic.mb20, { backgroundColor: tempCoords ? theme.success + '10' : theme.primary + '05', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: tempCoords ? theme.success : theme.primary }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: tempCoords ? theme.success : theme.primary, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {tempCoords ? '✓ GPS LOCK ACQUIRED' : 'SIGNAL SEARCH: TAP MAP FOR COORDINATES'}
                    </Text>
                  </View>
                )}

                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>LOCATION IDENTIFIER</Text>
                <TextInput 
                  style={[atomic.p16, atomic.mb20, { backgroundColor: theme.background, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, color: theme.text, fontWeight: '600' }]}
                  placeholder="e.g. SECTOR BRAVO HALL"
                  placeholderTextColor={theme.textMuted}
                  value={form.name}
                  onChangeText={(t) => setForm({...form, name: t})}
                />

                <Row style={atomic.mb24} gap={12}>
                  <Col style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>NODE TYPE</Text>
                    <TouchableOpacity 
                      style={[atomic.p12, { backgroundColor: theme.background, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                      onPress={() => setForm({...form, type: form.type === 'Hall' ? 'Medical' : 'Hall'})}
                    >
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{form.type}</Text>
                      <Lucide.ChevronDown size={14} color={theme.textMuted} />
                    </TouchableOpacity>
                  </Col>
                  <Col style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>CONTACT LINE</Text>
                    <TextInput 
                      style={[atomic.p12, { backgroundColor: theme.background, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, color: theme.text, fontWeight: '600' }]}
                      placeholder="Optional"
                      placeholderTextColor={theme.textMuted}
                      value={form.contact}
                      onChangeText={(t) => setForm({...form, contact: t})}
                    />
                  </Col>
                </Row>

                <Row gap={12}>
                  <PrimaryButton 
                    title="ABORT" 
                    variant="gray" 
                    size="sm"
                    style={{ flex: 1 }} 
                    onPress={() => {
                      setIsAddMode(false);
                      setIsEditing(false);
                    }} 
                  />
                  <PrimaryButton 
                    title={submitting ? "SYNCING..." : (isEditing ? "UPDATE NODE" : "DEPLOY NODE")} 
                    variant="primary" 
                    size="sm"
                    style={{ flex: 1.5 }} 
                    onPress={handleSave}
                    disabled={submitting}
                  />
                </Row>
              </Card>
            </KeyboardAvoidingView>
          </MotiView>
        )}
      </AnimatePresence>

      {loading && (
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: '#fff', marginTop: 16, fontWeight: '600', letterSpacing: 2, fontSize: 10 }}>SYNCHRONIZING FIELD DATA...</Text>
        </View>
      )}
    </Screen>
  );
};

export default LocalAreaMapScreen;
