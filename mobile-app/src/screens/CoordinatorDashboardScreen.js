import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { AuthService } from '../services/AuthService';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Row, Col, Heading, Card, Container } from '../components/DesignSystem';

// Sub-components
import { CoordinatorHeader, CoordinatorStats, CoordinatorTeamCard } from '../components/Admin/CoordinatorComponents';

const CoordinatorDashboardScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const [user, setUser] = useState(route.params?.user || null);
  
  // State
  const [stats, setStats] = useState({
    activeIncidents: 0,
    shelterCapacity: 0,
    teamsOnline: 0,
    activeTrend: '0',
    shelterTrend: 'Normal',
    teamTrend: '0'
  });
  const [pendingReports, setPendingReports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Incidents
      const incidentsRes = await fetch(`${API_URL}/incident-reports.php?official_only=true`);
      const incidentsData = await incidentsRes.json();
      const incidentsList = incidentsData.incidents || [];
      const activeIncidents = incidentsList.filter(i => i.status !== 'Resolved' && i.status !== 'Rejected');
      const pending = incidentsList.filter(i => i.status === 'Pending').sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      
      // 2. Fetch Shelter Stats
      const sheltersRes = await fetch(`${API_URL}/shelters-stats.php`);
      const sheltersData = await sheltersRes.json();
      
      // 3. Fetch Teams
      const teamsRes = await fetch(`${API_URL}/list-teams.php`);
      const teamsData = await teamsRes.json();
      
      setStats({
        activeIncidents: activeIncidents.length,
        shelterCapacity: sheltersData.metrics?.capacityUtilizationPct || 0,
        teamsOnline: (teamsData.teams || []).filter(t => t.status === 'available').length,
        activeTrend: activeIncidents.length > 0 ? 'Active' : 'None',
        shelterTrend: (sheltersData.metrics?.capacityUtilizationPct > 80) ? 'Critical' : 'Stable',
        teamTrend: (teamsData.teams || []).length > 0 ? 'Ready' : 'Empty'
      });

      setPendingReports(pending.slice(0, 3)); 
      setTeams(teamsData.teams || []);
    } catch (e) {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
        const currentUser = await AuthService.checkSession();
        setUser(currentUser);
      }
    };
    loadUser();
    fetchDashboardData();
  }, [user]);

  const statCards = [
    { label: 'Active Incidents', value: stats.activeIncidents.toString(), color: theme.error, icon: 'alert-circle', trend: stats.activeTrend },
    { label: 'Shelter Capacity', value: `${stats.shelterCapacity}%`, color: theme.accent, icon: 'home-group', trend: stats.shelterTrend },
    { label: 'Teams Available', value: stats.teamsOnline.toString(), color: theme.secondary, icon: 'account-hard-hat', trend: stats.teamTrend },
  ];

  return (
    <Screen style={{ backgroundColor: theme.background }} ornamentIntensity={0.2}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Container>
          <TacticalHeader 
            title="COORDINATOR HUB" 
            subtitle={user?.barangay ? `District ${user.barangay}` : 'Regional Operations Hub'}
          />
        </Container>
        <CoordinatorHeader user={user} onLogout={() => navigation.replace('Login')} />

        <Container style={{ marginTop: 20 }}>
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}>
            
            <CoordinatorStats cards={statCards} />

            <Heading size="sm" style={atomic.mb12}>Priority Actions</Heading>
            <View style={[atomic.row, atomic.wrap, { gap: 12, marginBottom: 24 }]}>
               <TouchableOpacity 
                  style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                  onPress={() => navigation.navigate('HazardMap', { status: 'Pending' })}
               >
                  <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.error + '10' }]}>
                    <MaterialCommunityIcons name="clipboard-check" size={24} color={theme.error} />
                  </View>
                  <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>VERIFY REPORTS</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                  style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                  onPress={() => navigation.navigate('Shelters')}
               >
                  <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.secondary + '10' }]}>
                    <MaterialCommunityIcons name="home-edit" size={24} color={theme.secondary} />
                  </View>
                  <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>MANAGE SHELTERS</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                  style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                  onPress={() => Alert.alert('Broadcast', 'Initiate emergency push?') }
               >
                  <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.accent + '10' }]}>
                    <MaterialCommunityIcons name="bullhorn" size={24} color={theme.accent} />
                  </View>
                  <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>BROADCAST ALERT</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                  style={[atomic.p16, { width: '48%', borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, gap: 10, elevation: 4 }]}
                  onPress={() => navigation.navigate('Map')}
               >
                  <View style={[atomic.p10, atomic.roundFull, { backgroundColor: theme.success + '10' }]}>
                    <MaterialCommunityIcons name="map-marker-radius" size={24} color={theme.success} />
                  </View>
                  <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.text }]}>DEPLOY TEAM</Text>
               </TouchableOpacity>
            </View>

            <Row justify="space-between" align="center" style={atomic.mb12}>
              <Heading size="sm" style={{ color: theme.textSecondary }}>PENDING REVIEW</Heading>
              <TouchableOpacity onPress={() => navigation.navigate('HazardMap', { status: 'Pending' })}>
                <Text style={[atomic.t.caption, atomic.t.bold, { color: theme.secondary }]}>See All</Text>
              </TouchableOpacity>
            </Row>

            {pendingReports.length === 0 ? (
               <Text style={[atomic.t.caption, { color: theme.textMuted, fontStyle: 'italic' }]}>No reports in queue.</Text>
            ) : (
               pendingReports.map((report) => (
                  <TouchableOpacity 
                    key={report.id} 
                    style={[atomic.px16, atomic.py12, atomic.mb10, atomic.row, atomic.aic, atomic.justifySpaceBetween, { backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('ReportDetails', { report })}
                  >
                    <Row align="center">
                      <View style={[atomic.p2, atomic.mr12, atomic.roundFull, { width: 10, height: 10, backgroundColor: report.severity === 'High' ? theme.error : theme.accent }]} />
                      <Col>
                        <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>{report.type} Incident</Text>
                        <Text style={[atomic.t.tiny, { color: theme.textSecondary }]}>{report.location || 'Reported Location'}</Text>
                      </Col>
                    </Row>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
               ))
            )}

            <Heading size="sm" style={[atomic.mt24, atomic.mb12, { color: theme.textSecondary }]}>TEAM STATUS</Heading>
            {teams.length === 0 ? (
               <Text style={[atomic.t.caption, { color: theme.textMuted, fontStyle: 'italic' }]}>Off-duty.</Text>
            ) : (
               teams.map((team, idx) => (
                  <CoordinatorTeamCard key={idx} team={team} />
               ))
            )}

          </MotiView>
        </Container>
      </ScrollView>

    </Screen>
  );
};

export default CoordinatorDashboardScreen;
