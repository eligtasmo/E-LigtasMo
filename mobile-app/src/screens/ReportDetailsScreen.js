import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL, API_ROOT } from '../config';
import { Screen, Card, Row, Col, Heading, Container, PageHeader, Badge, Divider, Section } from '../components/DesignSystem';

// Sub-components
import { ReportActions, SopManager } from '../components/Report/ReportAdminComponents';
import { EvidenceGallery } from '../components/Report/EvidenceGallery';

const VEHICLE_ICONS = {
  'Walking': 'Footprints',
  'Motorcycle': 'Bike',
  'Car': 'Car',
  'Truck': 'Truck'
};

const ReportDetailsScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const report = route.params?.report || {};

  // State
  const [fullReport, setFullReport] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reportStatus, setReportStatus] = useState(report.status);
  const [sopRuns, setSopRuns] = useState([]);
  const [loadingSop, setLoadingSop] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = await AuthService.checkSession();
    setCurrentUser(user);
    if (user && ['admin', 'coordinator', 'captain', 'brgy'].includes(user.role)) fetchSopRuns();
    fetchReportDetails();
  };

  const isFlood = !!report.barangay || !!report.media_path;

  const fetchReportDetails = async () => {
    try {
      const endpoint = isFlood ? `list-incident-reports.php?id=${report.id}` : `list-incidents.php?id=${report.id}`;
      const res = await fetch(`${API_URL}/${endpoint}`);
      const data = await res.json();
      const item = isFlood ? (Array.isArray(data) ? data[0] : null) : (data.incidents?.[0]);
      if (item) { 
        setFullReport(item); 
        setReportStatus(item.status); 
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSopRuns = async () => {
    setLoadingSop(true);
    try {
      const res = await fetch(`${API_URL}/list-sop-runs.php?incident_id=${report.id}`);
      const data = await res.json();
      if (data.success) setSopRuns(data.sop_runs);
    } catch (e) {} finally { setLoadingSop(false); }
  };

  const handleUpdateStatus = async (type) => {
    setUpdating(true);
    try {
      let endpoint = '';
      let body = { id: report.id };
      if (isFlood) {
        endpoint = type === 'approve' ? 'approve-incident-report.php' : 'reject-incident-report.php';
        body[type === 'approve' ? 'approved_by' : 'rejected_by'] = currentUser?.full_name || 'Admin';
      } else {
        endpoint = 'update-incident-status.php';
        body.status = type === 'approve' ? 'Approved' : type === 'resolve' ? 'Resolved' : 'Rejected';
      }
      const res = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { 
        let s = type === 'approve' ? (isFlood ? 'Verified' : 'Approved') : type === 'resolve' ? 'Resolved' : 'Rejected'; 
        setReportStatus(s); 
        Alert.alert('Protocol Updated', `Satellite intelligence synchronized. Status: ${s}`); 
      }
    } catch (e) {} finally { setUpdating(false); }
  };

  const region = {
    lat: fullReport?.lat ?? fullReport?.latitude ?? report?.lat ?? report?.latitude ?? 14.2833,
    lng: fullReport?.lng ?? fullReport?.longitude ?? report?.lng ?? report?.longitude ?? 121.4167
  };

  const galleryUris = useMemo(() => {
    const list = Array.isArray(fullReport?.media_paths) ? [...fullReport.media_paths] : [];
    if (list.length === 0 && (fullReport?.media_path || fullReport?.image_path)) {
       list.push(fullReport.media_path || fullReport.image_path);
    }
    return list.map(p => p.startsWith('http') ? p : `${API_ROOT}/${p.replace(/^\/+/, '')}`);
  }, [fullReport]);

  const isAdmin = currentUser && ['admin', 'coordinator', 'captain', 'brgy'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.id == (fullReport?.user_id || report.user_id));

  const severityColor = useMemo(() => {
    const s = String(report.severity || 'Info').toLowerCase();
    if (s === 'critical' || s === 'high') return theme.error;
    if (s === 'moderate' || s === 'warning') return theme.warning;
    return theme.success;
  }, [report.severity, theme]);

  const allowedVehicles = useMemo(() => {
    if (fullReport?.allowed_modes) {
       try { return JSON.parse(fullReport.allowed_modes); } catch (e) { return []; }
    }
    return ['Walking', 'Motorcycle', 'Car', 'Truck'];
  }, [fullReport]);

  return (
    <Screen ornamentIntensity={0.3}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <PageHeader 
          title="Intelligence Entry" 
          subtitle="Tactical Deep Dive"
          onBack={() => navigation.goBack()}
          rightElement={
            reportStatus === 'Pending' && isOwner && (
               <TouchableOpacity 
                 onPress={() => navigation.navigate('QuickReport', { report: fullReport || report })}
                 style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary + '10', alignItems: 'center', justifyContent: 'center' }}
               >
                  <Lucide.Edit3 size={20} color={theme.primary} strokeWidth={2.5} />
               </TouchableOpacity>
            )
          }
        />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 800 }}>
             
             {/* Tactical Map Visualization */}
             <View style={{ height: 260, width: '100%', borderBottomWidth: 1.5, borderBottomColor: theme.border }}>
                <WebView 
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  source={{ html: `
                    <!DOCTYPE html><html><head>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>body { margin: 0; padding: 0; } #map { height: 100vh; background: ${isDark ? '#020617' : '#f0f0f0'}; }
                    ${isDark ? '.leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }' : ''}
                    </style></head><body><div id="map"></div><script>
                    var map = L.map('map', { zoomControl: false, dragging: false }).setView([${region.lat}, ${region.lng}], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    var geo = ${fullReport?.area_geojson ? JSON.stringify(fullReport.area_geojson) : 'null'};
                    if (geo) {
                        L.geoJSON(geo, {
                            style: { color: '${severityColor}', fillColor: '${severityColor}', fillOpacity: 0.15, weight: 2, dashArray: '5, 5' }
                        }).addTo(map);
                    } else {
                        L.circle([${region.lat}, ${region.lng}], { color: '${severityColor}', fillColor: '${severityColor}', fillOpacity: 0.2, radius: 100 }).addTo(map);
                    }
                    L.marker([${region.lat}, ${region.lng}]).addTo(map);
                    </script></body></html>
                  ` }}
                  style={{ flex: 1, backgroundColor: theme.background }}
                />
                <View style={{ position: 'absolute', top: 20, right: 20 }}>
                   <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff', letterSpacing: 1.5 }}>LIVE GEO-COORD</Text>
                   </View>
                </View>
             </View>

             <Container style={{ marginTop: -30 }}>
                <Card variant="glass" shadowIntensity="none" style={{ padding: 24, borderRadius: 32, borderWidth: 1.5, borderColor: theme.border }}>
                   <Row justify="space-between" align="center" style={{ marginBottom: 20 }}>
                      <Col style={{ flex: 1 }}>
                         <Text style={{ fontSize: 10, fontWeight: '600', color: theme.primary, letterSpacing: 2, textTransform: 'uppercase' }}>
                            PROTO: {report.status || 'PENDING'}
                         </Text>
                         <Heading size="md" style={{ marginTop: 6 }}>{fullReport?.type || 'Active Incident'}</Heading>
                      </Col>
                      <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: severityColor + '20', borderWidth: 1, borderColor: severityColor }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: severityColor }}>{report.severity?.toUpperCase() || 'MODERATE'}</Text>
                      </View>
                   </Row>

                   <Row gap={16} style={{ marginBottom: 24 }}>
                      <Col style={{ flex: 1 }}>
                         <Card variant="flat" shadowIntensity="none" style={{ padding: 12, backgroundColor: theme.primary + '05', borderRadius: 16 }}>
                            <Row align="center">
                               <Lucide.Clock size={16} color={theme.primary} strokeWidth={2.5} />
                               <Col style={{ marginLeft: 12 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: theme.textMuted }}>ESTABLISHED</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{fullReport?.time?.split(' - ')[0] || 'Recently'}</Text>
                                </Col>
                            </Row>
                         </Card>
                      </Col>
                      <Col style={{ flex: 1 }}>
                         <Card variant="flat" shadowIntensity="none" style={{ padding: 12, backgroundColor: theme.secondary + '05', borderRadius: 16 }}>
                            <Row align="center">
                               <Lucide.MapPin size={16} color={theme.secondary} strokeWidth={2.5} />
                               <Col style={{ marginLeft: 12 }}>
                                  <Text style={{ fontSize: 8, fontWeight: '600', color: theme.textMuted }}>SECTOR</Text>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }} numberOfLines={1}>{fullReport?.barangay || 'General'}</Text>
                               </Col>
                            </Row>
                         </Card>
                      </Col>
                   </Row>

                   <Section title="Allowed Mobility" style={{ marginBottom: 24 }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {allowedVehicles.map(v => {
                          const Icon = Lucide[VEHICLE_ICONS[v] || 'CircleDot'];
                          return (
                            <View key={v} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceVariant, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                              <Icon size={14} color={theme.text} strokeWidth={2.5} />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text, marginLeft: 8 }}>{v}</Text>
                            </View>
                          );
                        })}
                        {allowedVehicles.length === 0 && <Text style={{ fontSize: 12, color: theme.textMuted }}>Road Closed / No vehicles allowed</Text>}
                      </View>
                   </Section>

                   <Divider style={{ marginVertical: 8, opacity: 0.1 }} />

                   <Section title="Intelligence Brief" style={{ marginTop: 24 }}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: theme.textSecondary, lineHeight: 24 }}>
                         {fullReport?.description || report.description || 'Awaiting synchronization of detailed situational metadata...'}
                      </Text>
                      {fullReport?.location_text && (
                        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
                          <Lucide.Map size={14} color={theme.textMuted} style={{ marginTop: 2 }} />
                          <Text style={{ fontSize: 12, color: theme.textMuted, marginLeft: 8, flex: 1 }}>{fullReport.location_text}</Text>
                        </View>
                      )}
                   </Section>

                   <EvidenceGallery uris={galleryUris} />

                   <Section title="Personnel Status " style={{ marginTop: 32 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceVariant, padding: 16, borderRadius: 24, borderWidth: 1.5, borderColor: theme.border }}>
                         <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', ...theme.shadows.sm }}>
                            <Lucide.User size={24} color="#fff" strokeWidth={2.5} />
                         </View>
                         <Col style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{fullReport?.reporter_name || 'Verified Resident'}</Text>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 }}>Authorized Node</Text>
                         </Col>
                         <Lucide.ShieldCheck size={20} color={theme.success} strokeWidth={3} />
                      </View>
                   </Section>

                   {isAdmin && (
                     <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={{ marginTop: 32 }}>
                        <Divider style={{ marginBottom: 32 }} />
                        <SopManager 
                           runs={sopRuns} 
                           loading={loadingSop} 
                           onInitiate={() => {}} 
                           onComplete={() => {}} 
                        />
                        <View style={{ height: 20 }} />
                        <ReportActions 
                           status={reportStatus} 
                           isFlood={isFlood} 
                           onApprove={() => handleUpdateStatus('approve')} 
                           onReject={() => handleUpdateStatus('reject')} 
                           onResolve={() => handleUpdateStatus('resolve')} 
                           updating={updating} 
                        />
                     </MotiView>
                   )}
                </Card>
             </Container>

             <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, textAlign: 'center', marginTop: 40, letterSpacing: 2, opacity: 0.5 }}>
                LAGUNA TACTICAL OVERVIEW • SECURE FEED
             </Text>
          </MotiView>
      </ScrollView>
    </Screen>
  );
};

export default ReportDetailsScreen;
