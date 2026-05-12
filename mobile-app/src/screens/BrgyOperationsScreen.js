import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';

import { AuthService } from '../services/AuthService';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Container, Card, Row, Col, Heading, PageHeader, Badge, PrimaryButton, Divider } from '../components/DesignSystem';

const BrgyOperationsScreen = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending'); // Pending, Verified, Resolved

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const currentUser = await AuthService.checkSession();
    setUser(currentUser);
    loadReports(currentUser);
  };

  const loadReports = async (u) => {
    setLoading(true);
    try {
      const brgyName = u?.barangay || user?.barangay || 'Poblacion I';
      const res = await fetch(`${API_URL}/incident-reports.php?barangay=${encodeURIComponent(brgyName)}&all_time=true`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/incident-reports.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Incident marked as ${newStatus}`);
        loadReports();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const filteredReports = reports.filter(r => r.status === filter);

  return (
    <Screen ornamentIntensity={0.15}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <PageHeader 
          title="SECTOR OPS" 
          subtitle="Localized Incident Control"
          onBack={() => navigation.goBack()}
        />
      </SafeAreaView>

      <Container style={{ paddingBottom: 20 }}>
         <Row gap={8}>
            {['Pending', 'Verified', 'Resolved'].map(f => (
               <TouchableOpacity 
                  key={f} 
                  onPress={() => setFilter(f)}
                  style={{ 
                     flex: 1, 
                     paddingVertical: 12, 
                     borderRadius: 12, 
                     backgroundColor: filter === f ? theme.primary : 'rgba(255,255,255,0.05)',
                     alignItems: 'center',
                     borderWidth: 1,
                     borderColor: filter === f ? theme.primary : theme.border
                  }}
               >
                  <Text style={{ color: filter === f ? '#FFF' : theme.textMuted, fontWeight: '600', fontSize: 12 }}>{f.toUpperCase()}</Text>
               </TouchableOpacity>
            ))}
         </Row>
      </Container>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Container>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ gap: 16 }}>
               {filteredReports.length === 0 ? (
                  <View style={{ alignItems: 'center', marginTop: 80, opacity: 0.5 }}>
                     <Lucide.ShieldCheck size={64} color={theme.textMuted} strokeWidth={1} />
                     <Text style={{ color: theme.textMuted, fontWeight: '600', marginTop: 20 }}>NO {filter.toUpperCase()} INCIDENTS</Text>
                  </View>
               ) : (
                  filteredReports.map((report, idx) => (
                    <MotiView
                      key={report.id}
                      from={{ opacity: 0, translateX: -20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ delay: idx * 100 }}
                    >
                       <Card variant="glass" style={{ padding: 20, borderRadius: 28, borderWidth: 1.5, borderColor: theme.border }}>
                          <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
                             <Badge 
                                label={(report.severity || 'Routine').toUpperCase()} 
                                variant={report.severity === 'Severe' ? 'danger' : report.severity === 'Critical' ? 'danger' : 'warning'} 
                             />
                             <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted }}>{new Date(report.time).toLocaleTimeString()}</Text>
                          </Row>
                          
                          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 8 }}>{report.description || 'Unknown Incident'}</Text>
                          <Row align="center" gap={6} style={{ marginBottom: 20 }}>
                             <Lucide.MapPin size={14} color={theme.primary} />
                             <Text style={{ fontSize: 13, color: theme.textSecondary }}>{report.location_name || 'Near Sector Hub'}</Text>
                          </Row>

                          <Divider style={{ marginBottom: 20, opacity: 0.05 }} />

                          {filter === 'Pending' && (
                             <Row gap={12}>
                                <TouchableOpacity 
                                   onPress={() => updateStatus(report.id, 'Verified')}
                                   style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}
                                >
                                   <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>VERIFY INCIDENT</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                   onPress={() => updateStatus(report.id, 'Resolved')}
                                   style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.success + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.success + '30' }}
                                >
                                   <Lucide.Check size={20} color={theme.success} strokeWidth={3} />
                                </TouchableOpacity>
                             </Row>
                          )}

                          {filter === 'Verified' && (
                             <TouchableOpacity 
                                onPress={() => updateStatus(report.id, 'Resolved')}
                                style={{ height: 48, borderRadius: 12, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center' }}
                             >
                                <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>MARK AS RESOLVED</Text>
                             </TouchableOpacity>
                          )}
                       </Card>
                    </MotiView>
                  ))
               )}
            </View>
          )}
        </Container>
      </ScrollView>

      <Text style={{ position: 'absolute', bottom: 20, alignSelf: 'center', color: '#444', fontSize: 10, fontWeight: '600', letterSpacing: 1, opacity: 0.5 }}>
        SECTOR VERIFICATION PROTOCOL ACTIVE
      </Text>
    </Screen>
  );
};

export default BrgyOperationsScreen;
