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

        map.on('load', () => {
          map.addSource('santacruz-outline', {
            type: 'geojson',
            data: {
              "type": "Feature",
              "geometry": {
                "type": "Polygon",
                "coordinates": [[
                  [121.3605594, 14.2938285], [121.3670893, 14.2681822], [121.3685161, 14.2640679], [121.3681306, 14.2638431], 
                  [121.3694151, 14.2595702], [121.370074, 14.2580993], [121.3699108, 14.2580045], [121.37011, 14.2569724], 
                  [121.3700564, 14.2562033], [121.3701852, 14.2558702], [121.370727, 14.2552912], [121.3711831, 14.2549495], 
                  [121.3715426, 14.2547236], [121.3715127, 14.2547236], [121.3714701, 14.2543873], [121.37109, 14.2541491], 
                  [121.3715354, 14.2528537], [121.3723301, 14.2514349], [121.3723862, 14.2513347], [121.3732297, 14.2492934], 
                  [121.3734192, 14.2488807], [121.3740092, 14.2477404], [121.3743467, 14.2470532], [121.374447, 14.2468491], 
                  [121.3746468, 14.2462875], [121.3745899, 14.2462739], [121.3745883, 14.2462301], [121.3745795, 14.2461374], 
                  [121.3744814, 14.2461355], [121.3744629, 14.2456942], [121.374518, 14.2456728], [121.3745349, 14.2445849], 
                  [121.3748019, 14.2440311], [121.3750758, 14.2436052], [121.3749466, 14.2434351], [121.3747664, 14.2432884], 
                  [121.3746943, 14.2430648], [121.3745385, 14.2427326], [121.374588, 14.2423304], [121.3748932, 14.2398527], 
                  [121.3762879, 14.2397488], [121.3770926, 14.2380745], [121.378262, 14.2380433], [121.3786805, 14.2366706], 
                  [121.3795173, 14.2360986], [121.3803863, 14.2347779], [121.3819257, 14.2332671], [121.382103, 14.2330932], 
                  [121.3818991, 14.232282], [121.382221, 14.2322716], [121.3823283, 14.2319076], [121.3833325, 14.2321125], 
                  [121.3834753, 14.2318665], [121.3835782, 14.2318204], [121.3835937, 14.2316033], [121.3836549, 14.2315388], 
                  [121.3836572, 14.2314248], [121.3834768, 14.2313742], [121.3834852, 14.2313083], [121.3836327, 14.23125], 
                  [121.3838444, 14.2311949], [121.383935, 14.2312053], [121.3840789, 14.2311455], [121.3841513, 14.2310279], 
                  [121.384436, 14.231077], [121.3846567, 14.2306356], [121.3845118, 14.2305475], [121.3845992, 14.2302046], 
                  [121.3845308, 14.2301504], [121.3845742, 14.2298571], [121.3847137, 14.2295331], [121.3849279, 14.2295773], 
                  [121.3849805, 14.2294669], [121.3852147, 14.2293235], [121.3852741, 14.2291656], [121.3856592, 14.2292554], 
                  [121.386289, 14.2286754], [121.386404, 14.2286856], [121.3874521, 14.2264111], [121.3870193, 14.2256598], 
                  [121.3864637, 14.2254569], [121.3861811, 14.2250705], [121.388095, 14.2198282], [121.3877892, 14.2172906], 
                  [121.387462, 14.2171502], [121.3879057, 14.216145], [121.3899818, 14.2162958], [121.3908336, 14.2166242], 
                  [121.392261, 14.2173067], [121.3929758, 14.2176243], [121.3941899, 14.2178618], [121.3948949, 14.2170635], 
                  [121.3964602, 14.21704], [121.3970854, 14.2178065], [121.3981564, 14.2181405], [121.3981615, 14.218485], 
                  [121.3984412, 14.2184052], [121.4039439, 14.2195683], [121.4086117, 14.2208642], [121.4077942, 14.2237627], 
                  [121.4078768, 14.2246207], [121.4123293, 14.2264288], [121.4197109, 14.228412], [121.4205243, 14.2286306], 
                  [121.4202161, 14.2297706], [121.4198198, 14.2310704], [121.4195503, 14.231295], [121.4192634, 14.2310879], 
                  [121.418963, 14.2305543], [121.4187205, 14.2306704], [121.4184035, 14.2317625], [121.4180663, 14.2323232], 
                  [121.4182655, 14.2325462], [121.4189019, 14.2328477], [121.4187602, 14.2335274], [121.4182973, 14.2340075], 
                  [121.418226, 14.2345466], [121.4185061, 14.2349831], [121.417947, 14.2358907], [121.4180476, 14.2361939], 
                  [121.4178281, 14.2365098], [121.4177184, 14.2369757], [121.4180596, 14.2370848], [121.4179896, 14.2375966], 
                  [121.4175369, 14.2379426], [121.4172678, 14.2386998], [121.4179769, 14.2395851], [121.4190702, 14.2403764], 
                  [121.4192598, 14.2407194], [121.4193553, 14.2410442], [121.4192178, 14.2415956], [121.4192078, 14.2418987], 
                  [121.4193137, 14.2422013], [121.4194208, 14.2425897], [121.4195152, 14.2429318], [121.4200299, 14.2442309], 
                  [121.420381, 14.2454989], [121.4207121, 14.2464345], [121.4210199, 14.2469931], [121.4217785, 14.2479292], 
                  [121.4223877, 14.2485213], [121.422888, 14.2487968], [121.4233434, 14.2489018], [121.4237737, 14.249001], 
                  [121.4242421, 14.2490168], [121.4246795, 14.249123], [121.4252762, 14.2496698], [121.4255218, 14.2501808], 
                  [121.4255397, 14.2503387], [121.4254926, 14.25071], [121.4254676, 14.2509593], [121.4250131, 14.2519486], 
                  [121.4248871, 14.2525231], [121.4248066, 14.2537241], [121.4247932, 14.2543168], [121.4246966, 14.2554685], 
                  [121.4246027, 14.2563913], [121.4246805, 14.2569918], [121.4246774, 14.2574695], [121.4246752, 14.2578029], 
                  [121.4250748, 14.258406], [121.4254476, 14.2588739], [121.4257561, 14.2596278], [121.4259304, 14.2604389], 
                  [121.4261531, 14.2610472], [121.4262577, 14.2616321], [121.4261826, 14.2621832], [121.4260107, 14.2623854], 
                  [121.4258768, 14.2624821], [121.4260863, 14.2628788], [121.4263587, 14.2634068], [121.4266093, 14.2636022], 
                  [121.4271401, 14.2635903], [121.4272845, 14.2639151], [121.4272143, 14.2639588], [121.4272961, 14.2641773], 
                  [121.4281028, 14.2646761], [121.4283612, 14.2654791], [121.4283906, 14.2655704], [121.42829, 14.2658415], 
                  [121.428293, 14.2661435], [121.428471, 14.2665058], [121.4290725, 14.2666624], [121.4292973, 14.266897], 
                  [121.429119, 14.2671043], [121.4290953, 14.2673692], [121.4292735, 14.2674191], [121.4295824, 14.2674997], 
                  [121.4298755, 14.2677722], [121.4299844, 14.2679526], [121.4298965, 14.268196], [121.4299675, 14.2683867], 
                  [121.4301541, 14.2685635], [121.4302682, 14.268226], [121.4303227, 14.2691442], [121.4304118, 14.2694128], 
                  [121.4304394, 14.2700907], [121.4306052, 14.2708948], [121.4307666, 14.2718881], [121.4306477, 14.2728951], 
                  [121.430339, 14.2727964], [121.4300729, 14.273411], [121.4298492, 14.2733506], [121.4297109, 14.2740148], 
                  [121.4300658, 14.2741035], [121.4300976, 14.2742647], [121.4301513, 14.2742854], [121.4301581, 14.2744948], 
                  [121.4302226, 14.2750801], [121.430329, 14.2762366], [121.4303785, 14.276388], [121.43048, 14.27657], 
                  [121.430624, 14.2769541], [121.4306696, 14.2771717], [121.4309137, 14.2783367], [121.4311039, 14.2790522], 
                  [121.4312409, 14.2797611], [121.4315146, 14.2808707], [121.432069, 14.2833762], [121.4321874, 14.2834183], 
                  [121.4323958, 14.2834961], [121.4324972, 14.2835969], [121.4325284, 14.2837069], [121.4325292, 14.2839651], 
                  [121.4324533, 14.2846738], [121.4325177, 14.2857291], [121.4325736, 14.2858488], [121.4326835, 14.28599], 
                  [121.432861, 14.2863217], [121.4330113, 14.2866458], [121.4330414, 14.2867681], [121.4330595, 14.2869248], 
                  [121.4330749, 14.2878179], [121.4330989, 14.2880925], [121.4332795, 14.2885209], [121.4333734, 14.2886197], 
                  [121.4335062, 14.2889745], [121.433596, 14.2897321], [121.4336067, 14.2905223], [121.433596, 14.2907822], 
                  [121.433191, 14.2925133], [121.4331508, 14.2937453], [121.430769, 14.2937037], [121.4299428, 14.2945458], 
                  [121.4281511, 14.2945562], [121.4263379, 14.2949825], [121.4251685, 14.2959598], [121.4236128, 14.2989228], 
                  [121.4242887, 14.2999624], [121.4236557, 14.3019689], [121.4180016, 14.3077804], [121.4154481, 14.3207751], 
                  [121.400299, 14.3233532], [121.3963508, 14.3223553], [121.3869094, 14.3195277], [121.3821029, 14.3171991], 
                  [121.3782405, 14.3134566], [121.3707732, 14.3040587], [121.3660525, 14.2979872], [121.3605594, 14.2938285]
                ]]
              }
            }
          });
          map.addLayer({
            id: 'santacruz-fill',
            type: 'fill',
            source: 'santacruz-outline',
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.2
            }
          });
          map.addLayer({
            id: 'santacruz-line',
            type: 'line',
            source: 'santacruz-outline',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 1.5,
              'line-opacity': 0.5
            }
          });
        });

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
