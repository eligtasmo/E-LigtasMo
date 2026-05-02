import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { Screen, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';
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

const buildMapHtml = ({ currentCoords, incidentCoords, isDark, incidentLabel, drawMode, polygonPoints, radiusM }) => {
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
      </style>
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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const isTablet = windowWidth > 600;
  const useWideLayout = isLandscape || isTablet;
  const requestedType = route.params?.type;
  
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
  const [finalReportId, setFinalReportId] = useState('');

  useEffect(() => {
    const init = async () => {
      const u = await AuthService.checkSession();
      setUser(u);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
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
          { 
            borderColor: active ? item.tone : 'rgba(255,255,255,0.03)',
            backgroundColor: active ? item.tone + '10' : 'rgba(255,255,255,0.02)'
          }
        ]}
      >
        <Icon size={20} color={active ? item.tone : 'rgba(255,255,255,0.2)'} strokeWidth={2} />
        <Text style={[styles.optionLabel, { color: active ? '#FFF' : 'rgba(255,255,255,0.3)', marginTop: 8 }]}>{item.label}</Text>
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
            originWhitelist={['*']}
            source={{ html: buildMapHtml({ 
              currentCoords, 
              incidentCoords, 
              isDark: true, 
              drawMode, 
              polygonPoints, 
              radiusM 
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
        </View>
      </SafeAreaView>

      <AnimatePresence>
        {stage === 'pick' && (
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: 20 }} style={styles.overlayHint}>
            <Lucide.Crosshair size={24} color="#3B82F6" strokeWidth={2} />
            <Text style={styles.hintText}>
              {drawMode === 'pinpoint' ? 'TAP MAP TO MARK INCIDENT' : 'TAP 3+ POINTS TO DEFINE ZONE'}
            </Text>
          </MotiView>
        )}
      </AnimatePresence>

      <View style={[
        styles.bottomSheetWrapper, 
        stage === 'pick' && { height: 180 }
      ]}>
        <ScrollView 
          style={styles.bottomSheet} 
          contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
          showsVerticalScrollIndicator={false}
        >
          {stage === 'details' ? (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
            </MotiView>
          ) : (
            <View style={styles.emptyState}>
              <Lucide.MapPinned size={40} color="rgba(245, 178, 53, 0.2)" strokeWidth={1.5} />
              <Text style={styles.emptyText}>Tap the map to provide field intel</Text>
              <Text style={[styles.emptyText, { fontSize: 10, opacity: 0.4, marginTop: 4 }]}>Precision Mode: {user?.role === 'resident' ? 'Pinpoint Only' : 'Multi-Target'}</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {stage === 'details' ? (
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: '#F5B235' }]}
            >
              {submitting ? <ActivityIndicator color="#000" /> : (
                <>
                  <Text style={styles.submitBtnText}>Sync Report</Text>
                  <Lucide.Send size={18} color="#000" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          ) : drawMode === 'polygon' && polygonPoints.length > 0 && (
            <TouchableOpacity 
              onPress={() => setPolygonPoints([])}
              style={[styles.submitBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
            >
              <Text style={[styles.submitBtnText, { color: '#FFF' }]}>Reset Points</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

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
                   <Text style={styles.confTitle}>Report Details</Text>
                 </View>

                   <View style={styles.confDetailList}>
                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.AlertCircle size={22} color="#F5B235" />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Incident Type</Text>
                         <Text style={styles.confItemValue}>{incidentType}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.Shield size={22} color={SEVERITIES.find(s => s.id === severity)?.tone || '#F5B235'} />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Severity Level</Text>
                         <Text style={[styles.confItemValue, { color: SEVERITIES.find(s => s.id === severity)?.tone || '#FFF' }]}>{severity}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.MapPin size={22} color="#94A3B8" />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Location Target</Text>
                         <Text style={styles.confItemValue} numberOfLines={2}>{address || 'Situation defined area'}</Text>
                       </View>
                     </View>

                     <View style={styles.confItem}>
                       <View style={styles.confItemIcon}>
                         <Lucide.Activity size={22} color={(user?.role === 'resident' || !user?.role) ? '#F59E0B' : '#679949'} />
                       </View>
                       <View style={styles.confItemContent}>
                         <Text style={styles.confItemLabel}>Approval Status</Text>
                         <Text style={[styles.confItemValue, { color: (user?.role === 'resident' || !user?.role) ? '#F59E0B' : '#679949' }]}>
                           {(user?.role === 'resident' || !user?.role) ? 'Pending Verification' : 'Tactical Approved'}
                         </Text>
                       </View>
                     </View>
                   </View>

                   {details ? (
                     <View style={styles.confObsCard}>
                       <Text style={styles.confObsLabel}>Field Observations</Text>
                       <Text style={styles.confObsText}>{details}</Text>
                     </View>
                   ) : null}

                   <View style={styles.confStatusCard}>
                     <Lucide.Radar size={20} color="#F5B235" />
                     <Text style={styles.confStatusText}>Intel has been broadcasted to all tactical units. Emergency responders are moving to verify this sector.</Text>
                   </View>

                   <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={styles.confCloseBtn}
                  >
                    <Text style={styles.confCloseBtnText}>ACKNOWLEDGE MISSION</Text>
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
  bottomSheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', backgroundColor: '#0F0E0B', overflow: 'hidden' },
  bottomSheet: { flex: 1, padding: 24 },
  sheetSection: { marginBottom: 24 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12, fontFamily: DS_FONT_UI },
  horizontalScroll: { gap: 12 },
  optionCard: { width: 90, height: 80, borderRadius: 4, borderWidth: 1, padding: 12, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI, textAlign: 'center', color: '#FFF' },
  severityGrid: { flexDirection: 'row', gap: 8 },
  severityBtn: { height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  severityLabel: { fontSize: 12, fontWeight: '700', fontFamily: DS_FONT_UI },
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
  vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicleBtn: { flex: 1, minWidth: '45%', height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  vehicleBtnActive: { backgroundColor: '#F5B235' },
  vehicleBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', marginLeft: 10, fontFamily: DS_FONT_UI },
  vehicleBtnTextActive: { color: '#000' },
  detailsInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, color: '#FFF', fontSize: 14, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontFamily: DS_FONT_INPUT },
  mediaRow: { flexDirection: 'row', gap: 12 },
  addMediaBtn: { width: 68, height: 68, borderRadius: 16, backgroundColor: 'rgba(245, 178, 53, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F5B235' },
  mediaPreview: { width: 68, height: 68, borderRadius: 16, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  removeMedia: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: '600', marginTop: 16, fontFamily: DS_FONT_UI },
  footer: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 100 : 86, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 24, 
    paddingTop: 12,
    zIndex: 20
  },
  submitBtn: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#F5B235', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1, fontFamily: DS_FONT_UI },
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
  confCloseBtn: { marginHorizontal: 24, height: 64, backgroundColor: '#F5B235', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 40 },
  confCloseBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1, fontFamily: DS_FONT_UI }
};

export default ReportIncidentScreen;
