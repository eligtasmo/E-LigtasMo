import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { AuthService } from '../services/AuthService';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Row, Col, Card, Heading, Container, Divider } from '../components/DesignSystem';

// Tactical Components
import { 
  TacticalHeader, 
  TacticalWeatherCard, 
  MetricTable, 
  IncidentFeed, 
  SectorStatusGrid, 
  OperationalGrid, 
  TacticalQuickActions, 
  AssetStatusTable 
} from '../components/Home/TacticalComponents';
import EmergencyHotlineModal from '../components/EmergencyHotlineModal';
import LocalAreaMapScreen from './LocalAreaMapScreen';

const AdminDashboardScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const [user, setUser] = useState(route.params?.user || null);
  const [isEmergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [barangayLevels, setBarangayLevels] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    if (!user) {
      const currentUser = await AuthService.checkSession();
      setUser(currentUser);
    }
    loadData();
  };

  const loadData = async () => {
    try {
      const [adminRes, weatherRes, brgyRes] = await Promise.all([
        fetch(`${API_URL}/admin-data.php`, {
          headers: { 'X-Role': 'admin', 'X-Token': user?.token || '' }
        }),
        fetch(`${API_URL}/weather-summary.php?lat=14.28&lon=121.41`),
        fetch(`${API_URL}/barangay-status.php`, {
          headers: { 'X-Role': 'admin', 'X-Token': user?.token || '' }
        })
      ]);
      const adminData = await adminRes.json();
      const weatherData = await weatherRes.json();
      const brgyData = await brgyRes.json();
      
      if (adminData.success) setDashboardData(adminData.data);
      if (weatherData.success) setWeatherData(weatherData.weather);
      if (brgyData.status === 'success') setBarangayLevels(brgyData.data);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const weatherDisplay = useMemo(() => {
    return {
      temp: weatherData ? `${weatherData.temperature}°C` : '24°C',
      desc: weatherData ? weatherData.condition?.toUpperCase() : 'STABLE CONDITIONS',
    };
  }, [weatherData]);

  return (
    <Screen style={{ backgroundColor: theme.background }} ornamentIntensity={0.2}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} />
      
      <ScrollView 
        contentContainerStyle={[atomic.pb40, { paddingTop: 16 }]} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Container>
          <TacticalHeader 
            title="ADMIN COMMAND" 
            subtitle="MDRRMO Headquarters"
          />
        </Container>
        <Container style={{ marginTop: 20 }}>
          <MotiView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            style={{ gap: 18 }}
          >
             {/* 1. INTELLIGENCE RADAR */}
             <TacticalWeatherCard 
               location="MDRRMO HQ"
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

             {/* 2. QUICK ACTIONS */}
             <TacticalQuickActions 
               actions={[
                 { id: 'hotlines', icon: 'PhoneCall', label: 'Emergency\nHotlines' },
                 { id: 'donation', icon: 'HeartPulse', label: 'Donation\nDrive' },
                 { id: 'checkin', icon: 'RadioTower', label: 'Check-In\nStatus' },
                 { id: 'more', icon: 'Ellipsis', label: 'System\nLogs' },
               ]}
               onAction={(id) => {
                 if (id === 'hotlines') navigation.navigate('EmergencyHotlines');
                 if (id === 'donation') navigation.navigate('DonationDrives');
               }} 
             />

             {/* 3. CORE SYSTEM METRICS */}
             <MetricTable 
                title="Operational Metrics"
                metrics={[
                  { label: 'Active Personnel', value: dashboardData?.users?.total?.toString() || '0' },
                  { label: 'Current Alerts', value: dashboardData?.notifications?.total?.toString() || '0' },
                  { label: 'Network Integrity', value: '99.8%' }
                ]} 
             />

             {/* 3. FIELD TELEMETRY (MAP) */}
             <Col gap={12}>
                <Row justify="space-between" align="center" style={{ paddingHorizontal: 4 }}>
                   <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 2 }}>LIVE TELEMETRY ACTIVE</Text>
                   <TouchableOpacity onPress={() => navigation.navigate('Map')}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: theme.primary }}>EXPAND RADAR</Text>
                   </TouchableOpacity>
                </Row>
                <TouchableOpacity 
                    activeOpacity={0.95}
                    onPress={() => navigation.navigate('Map')}
                    style={{ height: 240, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, ...theme.shadows.sm }}
                >
                    <LocalAreaMapScreen isPreview={true} />
                    <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.05)' }]} />
                    <View style={{ position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 0, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                       <View style={{ width: 6, height: 6, borderRadius: 0, backgroundColor: theme.error, marginRight: 8 }} />
                       <Text style={{ color: '#fff', fontWeight: '700', fontSize: 10, letterSpacing: 1.5 }}>SCANNING FIELD SECTORS</Text>
                    </View>
                </TouchableOpacity>
             </Col>

             {/* 4. ASSET TRACKING TABLE */}
             <AssetStatusTable 
                assets={[
                   { id: 'ALPHA-01', status: 'HIGH', rssi: '-42db' },
                   { id: 'BRAVO-09', status: 'MID', rssi: '-68db' },
                   { id: 'DELTA-04', status: 'HIGH', rssi: '-39db' },
                   { id: 'KILO-12', status: 'MID', rssi: '-72db' }
                ]}
             />

             {/* 5. OPERATIONAL CONTROL GRID */}
             <Col gap={12}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 2, marginLeft: 4 }}>LOGISTICS & CONTROL</Text>
                <OperationalGrid 
                  items={[
                    { label: 'WEATHER INDEX', value: 'SEVERE' },
                    { label: 'SAFE ROUTES', value: '3 ACTIVE' },
                    { label: 'COMM LINK', value: 'STABLE' },
                    { label: 'REFUGE CAP', value: '64%' }
                  ]}
                />
             </Col>

             {/* 6. SYSTEM TOOLS */}
             <View style={{ gap: 12 }}>
                {[
                   { title: 'Resource Hub', icon: 'Shield', color: theme.primary, sub: 'Control hotlines & system assets', route: 'AdminResourceHub' },
                   { title: 'User Verification', icon: 'Users', color: theme.accent, sub: 'Manage access levels', route: 'UserManagement' },
                   { title: 'Intelligence Feed', icon: 'Radio', color: theme.success, sub: 'Broadcast announcements', route: 'Announcements' },
                   { title: 'Shelter Hub', icon: 'Home', color: theme.warning, sub: 'Evacuation logistics', route: 'Shelters' }
                ].map((item, idx) => {
                   const Icon = Lucide[item.icon];
                   return (
                      <TouchableOpacity 
                         key={idx}
                         onPress={() => navigation.navigate(item.route)}
                      >
                         <Card variant="glass" style={{ padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: item.color + '08', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: item.color + '20' }}>
                               <Icon size={24} color={item.color} strokeWidth={2.5} />
                            </View>
                            <Col style={{ flex: 1, marginLeft: 16 }}>
                               <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item.title}</Text>
                               <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{item.sub}</Text>
                            </Col>
                            <Lucide.ChevronRight size={18} color={theme.textMuted} opacity={0.3} strokeWidth={3} />
                         </Card>
                      </TouchableOpacity>
                   );
                })}
             </View>
          </MotiView>
        </Container>
      </ScrollView>

      <EmergencyHotlineModal 
        visible={isEmergencyModalVisible} 
        onClose={() => setEmergencyModalVisible(false)} 
      />
    </Screen>
  );
};

export default AdminDashboardScreen;