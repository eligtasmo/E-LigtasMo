import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AuthService } from '../services/AuthService';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Row, Col, Card, Heading, Container, DS_FONT_UI, DS_FONT_INPUT, DS_TACTICAL } from '../components/DesignSystem';

// Tactical Components
import { TacticalHeader, TacticalWeatherCard, MetricTable, IncidentFeed, OperationalGrid, TacticalQuickActions } from '../components/Home/TacticalComponents';
import EmergencyHotlineModal from '../components/EmergencyHotlineModal';
import LocalAreaMapScreen from './LocalAreaMapScreen';

const BrgyHomeScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: pageWidth } = useWindowDimensions();
  
  const [user, setUser] = useState(route?.params?.user || null);
  const [brgyData, setBrgyData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // PRECISION RESPONSIVENESS
  const contentWidth = pageWidth - 32;
  const isWide = pageWidth > 600;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const currentUser = await AuthService.checkSession();
    setUser(currentUser);
    loadData(currentUser);
  };

  const loadData = async (currentUser) => {
    try {
      const u = currentUser || user;
      const brgyName = u?.barangay || 'Poblacion I';
      const [statusRes, weatherRes, reportsRes] = await Promise.all([
        fetch(`${API_URL}/barangay-status.php?barangay=${encodeURIComponent(brgyName)}`, {
          headers: { 'X-Role': 'coordinator', 'X-Token': u?.token || '' }
        }),
        fetch(`${API_URL}/weather-summary.php?lat=14.28&lon=121.41`),
        fetch(`${API_URL}/list-incident-reports.php?barangay=${encodeURIComponent(brgyName)}&limit=5`, {
          headers: { 'X-Role': 'coordinator', 'X-Token': u?.token || '' }
        })
      ]);
      
      const statusData = await statusRes.json();
      const weatherData = await weatherRes.json();
      const reportsData = await reportsRes.json();
      
      if (statusData.status === 'success') setBrgyData(statusData.data);
      if (weatherData.success) setWeatherData(weatherData.weather);
      if (Array.isArray(reportsData)) setReports(reportsData);
    } catch (e) {
      console.error('Error fetching brgy data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [user]);

  const weatherDisplay = useMemo(() => {
    return {
      temp: weatherData ? `${weatherData.temperature}°C` : '24°C',
      desc: weatherData ? weatherData.condition?.toUpperCase() : 'STABLE CONDITIONS',
    };
  }, [weatherData]);

  if (loading && !refreshing) {
    return (
      <Screen style={{ backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#F5B235" size="large" />
      </Screen>
    );
  }

  return (
    <Screen withOrnament={false} style={{ backgroundColor: '#080808' }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* TACTICAL BACKGROUND OVERLAY */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F5B235" stopOpacity="0.05" />
              <Stop offset="0.5" stopColor="transparent" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#scanGrad)" />
        </Svg>
      </View>

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B235" />}
          contentContainerStyle={{ 
            paddingBottom: 100,
            paddingTop: 8 
          }}
        >
          <Container>
          {/* 1. SECTOR HEADER */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={{ marginBottom: 24 }}
          >
            <Row align="center" justify="space-between" style={{ marginBottom: 4 }}>
               <View>
                  <Text style={styles.radarLabel}>SECTOR HUB COMMAND</Text>
                  <Heading size="lg" style={{ color: '#F4F0E8' }}>
                    {user?.barangay ? `Brgy. ${user.barangay}` : 'Laguna Sector'}
                  </Heading>
               </View>
               <TouchableOpacity 
                 onPress={() => navigation.navigate('Settings')}
                 style={styles.profileBtn}
               >
                  <Lucide.User size={20} color="#F5B235" strokeWidth={2.5} />
               </TouchableOpacity>
            </Row>
            <View style={styles.statusIndicator}>
               <View style={[styles.statusDot, { backgroundColor: (brgyData?.status_level || 'SAFE') === 'SAFE' ? '#22C55E' : '#EF4444' }]} />
               <Text style={styles.statusText}>
                  {brgyData?.status_level || 'SAFE'} OPERATIONS IN EFFECT
               </Text>
            </View>
          </MotiView>

          {/* 2. INTELLIGENCE RADAR */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 600, delay: 100 }}
          >
            <TacticalWeatherCard 
              location="Current Environmental Intel"
              temp={weatherDisplay.temp}
              condition={weatherDisplay.desc}
              hourly={[
                { icon: 'CloudSun', temp: '22°', time: '08:30' },
                { icon: 'Sun', temp: '23°', time: '09:30' },
                { icon: 'CloudRain', temp: '19°', time: '10:30' },
                { icon: 'Waves', temp: '14°', time: '11:30' },
                { icon: 'Cloud', temp: '13°', time: '12:30' },
              ]}
            />
          </MotiView>

          {/* 3. TACTICAL QUICK ACTIONS - MISSION ORIENTED */}
          <View style={{ marginTop: 20 }}>
            <Row gap={12}>
               {[
                 { id: 'hotlines', icon: 'Phone', label: 'HOTLINES', color: '#FFF' },
                 { id: 'donation', icon: 'Heart', label: 'MISSIONS', color: '#F5B235' },
                 { id: 'reports', icon: 'ShieldAlert', label: 'REPORTS', color: '#FFF' },
                 { id: 'map', icon: 'Scan', label: 'SCAN', color: '#FFF' }
               ].map((item) => {
                 const Icon = Lucide[item.icon] || Lucide.Shield;
                 return (
                   <TouchableOpacity 
                      key={item.id}
                      onPress={() => {
                        if (item.id === 'hotlines') navigation.navigate('EmergencyHotlines');
                        if (item.id === 'donation') navigation.navigate('DonationDrives');
                        if (item.id === 'reports') navigation.navigate('Reports');
                        if (item.id === 'map') navigation.navigate('LocalMap');
                      }}
                      style={styles.quickActionBox}
                   >
                      <Icon size={22} color={item.color} strokeWidth={2.2} />
                      <Text style={styles.quickActionLabel}>{item.label}</Text>
                   </TouchableOpacity>
                 );
               })}
            </Row>
          </View>

          {/* 4. REAL-TIME METRICS - HIGH DENSITY */}
          <View style={{ marginTop: 24 }}>
             <Row justify="space-between" align="center" style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                <Text style={styles.sectionHeader}>TELEMETRY DATA</Text>
                <Text style={styles.liveTag}>LIVE UPDATES</Text>
             </Row>
             <MetricTable 
                metrics={[
                  { label: 'Active Incidents', value: reports.filter(r => r.status === 'Verified').length.toString() || '0' },
                  { label: 'Pending Review', value: reports.filter(r => r.status === 'Pending').length.toString() || '0' },
                  { label: 'Comm Link', value: 'STABLE' }
                ]}
             />
          </View>

          {/* 5. RADAR PREVIEW (MAP) */}
          <View style={{ marginTop: 24 }}>
             <Row justify="space-between" align="center" style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                <Text style={styles.sectionHeader}>LOCAL SECTOR SCAN</Text>
                <TouchableOpacity onPress={() => navigation.navigate('LocalMap')}>
                   <Text style={styles.actionText}>EXPAND RADAR</Text>
                </TouchableOpacity>
             </Row>
             <TouchableOpacity 
                 activeOpacity={0.95}
                 onPress={() => navigation.navigate('LocalMap')}
                 style={styles.mapContainer}
             >
                 <LocalAreaMapScreen isPreview={true} />
                 {/* SCANLINE EFFECT */}
                 <MotiView 
                   from={{ translateY: 0 }}
                   animate={{ translateY: 220 }}
                   transition={{ loop: true, type: 'timing', duration: 3000, easing: t => t }}
                   style={styles.scanLine}
                 />
                 <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
             </TouchableOpacity>
          </View>

          {/* 6. INCIDENT FEED - SURGICAL OVERVIEW */}
          <View style={{ marginTop: 24 }}>
             <IncidentFeed 
                incidents={reports.slice(0, 3).map(r => ({
                   severity: (r.severity || 'ROUTINE').toUpperCase(),
                   time: new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                   title: r.description || 'Situation Report',
                   desc: `Located at ${r.location_name || 'Sector Hub'}.`,
                   status: (r.status || 'Pending').toUpperCase()
                }))}
                onNewReport={() => navigation.navigate('ReportIncident')}
             />
          </View>

          {/* 7. OPERATIONAL STATUS GRID */}
          <View style={{ marginTop: 24 }}>
             <Text style={[styles.sectionHeader, { marginBottom: 12, marginLeft: 4 }]}>OPERATIONAL STATUS</Text>
             <OperationalGrid 
               items={[
                 { label: 'WATER LEVEL', value: `${brgyData?.flood_depth_cm || '0.0'}cm` },
                 { label: 'SHELTER CAP', value: '42%' },
                 { label: 'EVAC PROTOCOL', value: 'ALPHA' }
               ]}
             />
          </View>

          {/* 8. COMMAND TOOLS - MISSION CONTROL CONSOLE */}
          <View style={{ marginTop: 32, gap: 12 }}>
             <Text style={[styles.sectionHeader, { marginLeft: 4 }]}>COMMAND CONSOLE</Text>
             {[
                { title: 'Incident Ops', icon: 'ShieldCheck', color: '#F5B235', sub: 'Field verification console', route: 'BrgyOperations' },
                { title: 'Pin Hub Location', icon: 'MapPin', color: '#EF4444', sub: 'Set barangay sector location', route: 'LocalMap' },
                { title: 'Broadcast', icon: 'Radio', color: '#22C55E', sub: 'Citizen-wide alerts', route: 'Announcements' },
                { title: 'Logistics', icon: 'Package', color: '#3B82F6', sub: 'Relief mission management', route: 'DonationDrives' }
             ].map((item, idx) => {
                const Icon = Lucide[item.icon] || Lucide.Shield;
                return (
                    <TouchableOpacity 
                       key={idx}
                       onPress={() => navigation.navigate(item.route)}
                       style={styles.consoleBtn}
                    >
                        <View style={[styles.consoleIconBox, { borderColor: item.color + '40' }]}>
                           <Icon size={22} color={item.color} strokeWidth={2.5} />
                        </View>
                        <Col style={{ flex: 1, marginLeft: 16 }}>
                           <Text style={styles.consoleTitle}>{item.title}</Text>
                           <Text style={styles.consoleSub}>{item.sub}</Text>
                        </Col>
                        <Lucide.ArrowRight size={16} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                );
             })}
          </View>
        </Container>
      </ScrollView>
      </SafeAreaView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  radarLabel: { fontSize: 9, fontWeight: '800', color: '#F5B235', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4, fontFamily: DS_FONT_UI },
  profileBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1, fontFamily: DS_FONT_UI },
  quickActionBox: { flex: 1, height: 80, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  quickActionLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', marginTop: 8, letterSpacing: 1, fontFamily: DS_FONT_UI },
  sectionHeader: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontFamily: DS_FONT_UI },
  liveTag: { fontSize: 9, fontWeight: '800', color: '#F5B235', backgroundColor: 'rgba(245,178,53,0.1)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
  actionText: { fontSize: 10, fontWeight: '700', color: '#F5B235', letterSpacing: 1 },
  mapContainer: { height: 220, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' },
  scanLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#F5B235', opacity: 0.3, zIndex: 10 },
  consoleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  consoleIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  consoleTitle: { fontSize: 15, fontWeight: '600', color: '#F4F0E8', fontFamily: DS_FONT_UI },
  consoleSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: DS_FONT_INPUT },
});

export default BrgyHomeScreen;
