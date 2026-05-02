import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Dimensions, FlatList, Keyboard, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import { StatusBar } from 'expo-status-bar';
import { Screen, Card, Row, Col, Heading, Container } from '../components/DesignSystem';
import UniversalWebView from '../components/UniversalWebView';
import * as Lucide from 'lucide-react-native';

const MapScreen = ({ navigation, route }) => {
  const { theme, atomic, isDark } = useTheme();
  const webviewRef = useRef(null);
  const routeParams = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Professional consolidated filter state
  const [activeFilter, setActiveFilter] = useState('All');
  const [showNoah, setShowNoah] = useState(false);
  const [showShelters, setShowShelters] = useState(false);

  const FILTERS = [
    { id: 'All', label: 'All', icon: 'LayoutGrid' },
    { id: 'Flood', label: 'Flood Data', icon: 'Waves', color: theme.error },
    { id: 'Fire', label: 'Fire Dept', icon: 'Flame', color: '#F56565' },
    { id: 'Shelters', label: 'Shelters', icon: 'Home', color: theme.success },
    { id: 'Rescue', label: 'Rescue', icon: 'LifeBuoy', color: '#3182CE' }
  ];

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setIsSearching(true);
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&bbox=121.3,14.1,121.5,14.4`);
        const data = await res.json();
        setSearchResults(data.features.map(f => ({
          id: f.id,
          title: f.text,
          address: f.place_name,
          center: f.center
        })));
      } catch (e) { console.error('Geocoding error:', e); }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc) => {
    Keyboard.dismiss();
    setSearchQuery(loc.title);
    setIsSearching(false);
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ 
        type: 'ZOOM_FOCUS', 
        lat: loc.center[1], 
        lon: loc.center[0] 
      }));
    }
  };

  const handleFilterPress = (filterId) => {
    setActiveFilter(filterId);
    if (filterId === 'Flood') setShowNoah(!showNoah);
    if (filterId === 'Shelters') setShowShelters(!showShelters);
    
    // In a real implementation, this would also postMessage to the webview to filter markers
  };

  const handleUseMyLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow location access to use this feature.');
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ 
        type: 'ZOOM_FOCUS', 
        lat: location.coords.latitude, 
        lon: location.coords.longitude 
      }));
    }
  };

  const generateMapHTML = (initialLat, initialLon, initialZoom) => {
    return `
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
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
            mapboxgl.accessToken = '${MAPBOX_ACCESS_TOKEN}';
            const map = new mapboxgl.Map({
              container: 'map',
              style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
              center: [${initialLon}, ${initialLat}],
              zoom: ${initialZoom},
              antialias: true
            });

            window.addEventListener('message', (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'ZOOM_FOCUS') {
                    map.flyTo({ center: [data.lon, data.lat], zoom: 16, duration: 2000 });
                }
            });
        </script>
      </body>
      </html>
    `;
  };

  const initialFocus = routeParams?.params?.focusCoords;
  const initialLat = initialFocus ? Number(initialFocus.lat) : 14.2833;
  const initialLon = initialFocus ? Number(initialFocus.lng) : 121.4167;
  const initialZoom = initialFocus ? 16 : 13;

  return (
    <Screen withOrnament={false}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <UniversalWebView 
        ref={webviewRef}
        source={{ html: generateMapHTML(initialLat, initialLon, initialZoom) }}
        style={{ flex: 1 }}
      />

      {/* SEARCH PANEL */}
      <View style={{ position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center' }}>
        <Container>
          <View style={{ 
            backgroundColor: theme.surface, 
            borderRadius: 20, 
            padding: 4, 
            ...theme.shadows.md, 
            flexDirection: 'row', 
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border
          }}>
             <View style={{ padding: 12 }}>
               <Lucide.Search size={20} color={theme.textMuted} />
             </View>
             <TextInput 
               placeholder="Search destination or hazards..."
               placeholderTextColor={theme.placeholder}
               style={{ flex: 1, height: 48, fontSize: 16, color: theme.text, fontWeight: '500' }}
               value={searchQuery}
               onChangeText={handleSearch}
             />
             <TouchableOpacity style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
               <Lucide.SlidersHorizontal size={20} color="#fff" />
             </TouchableOpacity>
          </View>

          {isSearching && searchResults.length > 0 && (
            <Card variant="flat" style={{ marginTop: 10, padding: 0, maxHeight: 280, borderRadius: 24, overflow: 'hidden', ...theme.shadows.lg }}>
              <ScrollView keyboardShouldPersistTaps="handled">
                {searchResults.map((loc) => (
                  <TouchableOpacity 
                    key={loc.id} 
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => handleSelectLocation(loc)}
                  >
                    <Lucide.MapPin size={20} color={theme.textMuted} />
                    <Col style={{ marginLeft: 16 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{loc.title}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>{loc.address}</Text>
                    </Col>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Card>
          )}
        </Container>
      </View>

      {/* TACTICAL MAP CONTROLS */}
      <View style={{ position: 'absolute', bottom: 130, right: 20, gap: 12 }}>
        <TouchableOpacity 
           onPress={handleUseMyLocation}
           activeOpacity={0.8}
           style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...theme.shadows.md, borderWidth: 1, borderColor: theme.border }}
        >
          <Lucide.LocateFixed size={24} color={theme.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity 
           onPress={() => navigation.navigate('RoutePlanner')}
           activeOpacity={0.8}
           style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadows.md }}
        >
          <Lucide.Route size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* CONSOLIDATED HAZARD FILTERS */}
      <View style={{ position: 'absolute', bottom: 130, left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' }}>
        <View style={{ width: '100%', maxWidth: 520, paddingHorizontal: 64 }}>
           <ScrollView 
             horizontal 
             showsHorizontalScrollIndicator={false} 
             contentContainerStyle={{ gap: 10, paddingRight: 20 }}
           >
              {FILTERS.map((f) => {
                const isActive = activeFilter === f.id;
                const IconComp = Lucide[f.icon];
                return (
                  <TouchableOpacity 
                    key={f.id} 
                    onPress={() => handleFilterPress(f.id)}
                    activeOpacity={0.8}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14, 
                      paddingVertical: 10, 
                      backgroundColor: isActive ? (f.color || theme.primary) : theme.surface, 
                      borderRadius: 16, 
                      ...theme.shadows.sm,
                      borderWidth: 1,
                      borderColor: isActive ? 'transparent' : theme.border
                    }}
                  >
                    <IconComp size={16} color={isActive ? '#fff' : (f.color || theme.textSecondary)} strokeWidth={2.5} />
                    <Text style={{ 
                      fontSize: 11, 
                      fontWeight: '600', 
                      color: isActive ? '#fff' : theme.textSecondary, 
                      marginLeft: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5
                    }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
           </ScrollView>
        </View>
      </View>
    </Screen>
  );
};

export default MapScreen;
