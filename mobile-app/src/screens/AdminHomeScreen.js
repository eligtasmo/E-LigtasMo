import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { fetchWeatherForecast, getWeatherDescription } from '../services/WeatherService';
import { Screen, Row, Col, Heading, Card, Container } from '../components/DesignSystem';

// Sub-components
import { AdminHeader, AdminHeroStatus, WeatherCard } from '../components/Admin/AdminHeroComponents';

const AdminHomeScreen = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();

  // State
  const [weather, setWeather] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Santa Cruz, Laguna Coordinates
  const LAT = 14.2833;
  const LONG = 121.4167;

  const loadData = async () => {
    try {
      const data = await fetchWeatherForecast(LAT, LONG);
      if (data) setWeather(data);
    } catch (e) {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mock Data for System Overview
  const systemStatus = {
    level: 'Critical',
    depth: 'Waist Deep Flooding Detected',
    color: theme.error
  };

  return <Screen ornamentIntensity={0.6}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']} />

      <ScrollView 
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[theme.primary]} />}
      >
        <AdminHeader onLogout={() => navigation.navigate('Login')} />

        <Container style={{ marginTop: 20 }}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}>
          
          <AdminHeroStatus {...systemStatus} />

          <Heading size="sm" style={atomic.mb12}>System Administration</Heading>
          <View style={[atomic.row, atomic.wrap, { gap: 12, marginBottom: 24 }]}>
             <TouchableOpacity 
                style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.primary, gap: 10, elevation: 4 }]}
                onPress={() => navigation.navigate('ManageUsers')}
             >
                <View style={[atomic.p10, atomic.roundFull, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <MaterialCommunityIcons name="account-group" size={24} color="#fff" />
                </View>
                <Text style={[atomic.t.tiny, atomic.t.heavy, { color: '#fff' }]}>MANAGE USERS</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.secondary, gap: 10, elevation: 4 }]}
                onPress={() => navigation.navigate('AddShelter')}
             >
                <View style={[atomic.p10, atomic.roundFull, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <MaterialCommunityIcons name="home-plus" size={24} color="#fff" />
                </View>
                <Text style={[atomic.t.tiny, atomic.t.heavy, { color: '#fff' }]}>ADD SHELTER</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                onPress={() => navigation.navigate('Map')}
             >
                <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.info + '10' }]}>
                  <MaterialCommunityIcons name="map-marker-multiple" size={24} color={theme.info} />
                </View>
                <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>ALL REPORTS</Text>
             </TouchableOpacity>

             <TouchableOpacity 
                style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                onPress={() => {}}
             >
                <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.textMuted + '10' }]}>
                  <MaterialCommunityIcons name="cog" size={24} color={theme.textMuted} />
                </View>
                <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>SETTINGS</Text>
             </TouchableOpacity>
          </View>

          <Row justify="space-between" align="center" style={atomic.mb12}>
            <Heading size="sm">System Activity</Heading>
            <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
              <Text style={[atomic.t.caption, atomic.t.bold, { color: theme.primary }]}>View Logs</Text>
            </TouchableOpacity>
          </Row>

          <Card variant="raised" style={[atomic.p16, atomic.mb16]}>
             <Row align="center">
                <View style={[atomic.p10, atomic.roundFull, atomic.mr12, { backgroundColor: theme.errorBg }]}>
                  <MaterialCommunityIcons name="alert-octagon" size={20} color={theme.error} />
                </View>
                <Col style={atomic.l.flex}>
                   <Text style={[atomic.t.body, atomic.t.bold]}>New Incident Flow</Text>
                   <Text style={[atomic.t.tiny, { color: theme.textSecondary }]}>High water detected at P. Guevarra St.</Text>
                </Col>
                <Text style={[atomic.t.tiny, { color: theme.textMuted }]}>Just now</Text>
             </Row>
          </Card>

          <WeatherCard 
            weather={weather} 
            description={weather ? getWeatherDescription(weather.current.weather_code) : 'Loading...'} 
          />

        </MotiView>
        </Container>
      </ScrollView>

    </Screen>
  );
};

export default AdminHomeScreen;
