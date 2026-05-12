import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator, StyleSheet, Dimensions, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL, API_ROOT } from '../config';
import { Screen, Row, Col, Section, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';

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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reportParam = route.params?.report || {};
  const reportId = route.params?.reportId || reportParam.id;

  // State
  const [fullReport, setFullReport] = useState(reportParam.id ? reportParam : null);
  const [currentUser, setCurrentUser] = useState(null);
  const [reportStatus, setReportStatus] = useState(reportParam.status || 'Pending');
  const [sopRuns, setSopRuns] = useState([]);
  const [loadingSop, setLoadingSop] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(!reportParam.id);

  useEffect(() => {
    init();
  }, [reportId]);

  const init = async () => {
    const user = await AuthService.checkSession();
    setCurrentUser(user);
    if (user && ['admin', 'coordinator', 'captain', 'brgy'].includes(user.role)) fetchSopRuns();
    fetchReportDetails();
  };

  const isFlood = !!reportParam.barangay || !!reportParam.media_path || !!fullReport?.barangay;

  const fetchReportDetails = async () => {
    if (!reportId) return;
    try {
      // Try both endpoints if type is unknown
      const res = await fetch(`${API_URL}/incident-reports.php?id=${reportId}`);
      const data = await res.json();
      let item = Array.isArray(data) ? data[0] : null;
      
      if (!item) {
        const res2 = await fetch(`${API_URL}/incident-reports.php?official_only=true?id=${reportId}`);
        const data2 = await res2.json();
        item = data2.incidents?.[0];
      }

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
    if (!reportId) return;
    setLoadingSop(true);
    try {
      const res = await fetch(`${API_URL}/list-sop-runs.php?incident_id=${reportId}`);
      const data = await res.json();
      if (data.success) setSopRuns(data.sop_runs);
    } catch (e) {} finally { setLoadingSop(false); }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `eligtasmo://report-details/${reportId}`;
      await Share.share({
        message: `Tactical Alert: ${fullReport?.type || 'Incident'} in ${fullReport?.barangay || ' Santa Cruz'}.\nFull Intel: ${shareUrl}`,
        url: shareUrl,
        title: 'Share Intelligence Packet'
      });
    } catch (e) {}
  };

  const handleUpdateStatus = async (type) => {
    setUpdating(true);
    try {
      let endpoint = '';
      let body = { id: reportId };
      const flood = !!fullReport?.barangay;
      if (flood) {
        endpoint = type === 'approve' ? 'approve-incident-report.php' : 'reject-incident-report.php';
        body[type === 'approve' ? 'approved_by' : 'rejected_by'] = currentUser?.full_name || 'Admin';
      } else {
        endpoint = 'update-incident-status.php';
        body.status = type === 'approve' ? 'Approved' : type === 'resolve' ? 'Resolved' : 'Rejected';
      }
      const res = await fetch(`${API_URL}/${endpoint}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success !== false) { 
        let s = type === 'approve' ? (flood ? 'Verified' : 'Approved') : type === 'resolve' ? 'Resolved' : 'Rejected'; 
        setReportStatus(s); 
        Alert.alert('Protocol Updated', `Satellite intelligence synchronized. Status: ${s}`); 
      } else {
        const errorMsg = data.error || 'The tactical relay connection was interrupted.';
        Alert.alert('Network Error', errorMsg);
      }
    } catch (e) {
      console.error('[UpdateStatus] Error:', e);
      Alert.alert('Network Error', 'Failed to synchronize with Tactical Command. Please check your connection.');
    } finally { 
      setUpdating(false); 
    }
  };

  const region = {
    lat: fullReport?.lat ?? fullReport?.latitude ?? reportParam?.lat ?? reportParam?.latitude ?? 14.2833,
    lng: fullReport?.lng ?? fullReport?.longitude ?? reportParam?.lng ?? reportParam?.longitude ?? 121.4167
  };

  const galleryUris = useMemo(() => {
    const list = Array.isArray(fullReport?.media_paths) ? [...fullReport.media_paths] : [];
    if (list.length === 0 && (fullReport?.media_path || fullReport?.image_path)) {
       list.push(fullReport.media_path || fullReport.image_path);
    }
    // Filter out non-string/null values and trim
    return list
      .filter(p => typeof p === 'string' && p.trim().length > 0)
      .map(p => {
        const path = p.trim();
        if (path.startsWith('http')) return path;
        // Ensure no double slashes and correct relative pathing
        const cleanPath = path.replace(/^\/+/, '');
        return `${API_ROOT}/${cleanPath}`;
      });
  }, [fullReport]);

  const isAdmin = currentUser && ['admin', 'coordinator', 'captain', 'brgy'].includes(currentUser.role);
  const isOwner = currentUser && (currentUser.id == (fullReport?.user_id || reportParam.user_id));

  const severityColor = useMemo(() => {
    const s = String(fullReport?.severity || reportParam.severity || 'Moderate').toLowerCase();
    if (s === 'critical' || s === 'high' || s === 'severe') return '#EF4444';
    if (s === 'moderate' || s === 'warning') return '#F5B235';
    return '#3B82F6';
  }, [fullReport, reportParam]);

  const allowedVehicles = useMemo(() => {
    if (fullReport?.allowed_modes) {
       try { return JSON.parse(fullReport.allowed_modes); } catch (e) { return []; }
    }
    return ['Walking', 'Motorcycle', 'Car', 'Truck'];
  }, [fullReport]);

  if (isLoading) {
    return (
      <Screen style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#F5B235" size="large" />
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} bounces={false}>
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 600 }}>
             
             <View style={{ height: 350, width: '100%', overflow: 'hidden' }}>
                <WebView 
                  originWhitelist={['*']}
                  scrollEnabled={false}
                  source={{ html: `
                    <!DOCTYPE html><html><head>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      body { margin: 0; padding: 0; background: #080808; } 
                      #map { height: 100vh; background: #080808; }
                      .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(80%) contrast(110%); opacity: 0.6; }
                      .leaflet-container { background: #080808 !important; }
                    </style></head><body><div id="map"></div><script>
                    var map = L.map('map', { zoomControl: false, dragging: false }).setView([${region.lat}, ${region.lng}], 16);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    var geo = ${fullReport?.area_geojson ? JSON.stringify(fullReport.area_geojson) : 'null'};
                    if (geo) {
                        L.geoJSON(geo, {
                            style: { color: '${severityColor}', fillColor: '${severityColor}', fillOpacity: 0.22, weight: 3, dashArray: '8, 8' }
                        }).addTo(map);
                    } else {
                        L.circle([${region.lat}, ${region.lng}], { color: '${severityColor}', fillColor: '${severityColor}', fillOpacity: 0.3, radius: 100, weight: 2.5 }).addTo(map);
                    }
                    L.marker([${region.lat}, ${region.lng}]).addTo(map);
                    </script></body></html>
                  ` }}
                  style={{ flex: 1, backgroundColor: '#080808' }}
                />
                <LinearGradient 
                  colors={['rgba(8,8,8,0.85)', 'transparent', 'rgba(8,8,8,0.4)', '#080808']} 
                  style={StyleSheet.absoluteFill} 
                />
                
                <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                  <Row align="center" justify="space-between" style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')} style={styles.backBtn}>
                      <Lucide.ArrowLeft size={20} color="#FFF" />
                    </TouchableOpacity>
                    <Row gap={10}>
                      <TouchableOpacity onPress={handleShare} style={styles.backBtn}>
                        <Lucide.Share2 size={18} color="#FFF" />
                      </TouchableOpacity>
                      {reportStatus === 'Pending' && isOwner ? (
                         <TouchableOpacity 
                           onPress={() => navigation.navigate('QuickReport', { report: fullReport || reportParam })}
                           style={styles.backBtn}
                         >
                            <Lucide.Edit3 size={18} color="#F5B235" strokeWidth={2.5} />
                         </TouchableOpacity>
                      ) : null}
                    </Row>
                  </Row>
                </SafeAreaView>

                <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' }}>
                   <MotiView 
                     from={{ scale: 0.9, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     style={{ 
                       backgroundColor: '#F5B23515', 
                       paddingHorizontal: 16, 
                       paddingVertical: 6, 
                       borderRadius: 100, 
                       borderWidth: 1.5, 
                       borderColor: '#F5B23540',
                       flexDirection: 'row',
                       alignItems: 'center',
                       gap: 8
                     }}
                   >
                     <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F5B235' }} />
                     <Text style={{ color: '#F5B235', fontSize: 11, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: DS_FONT_INPUT }}>
                       {reportId ? `PACKET_${reportId}` : 'TACTICAL_SYNC'}
                     </Text>
                   </MotiView>
                </View>
             </View>

             <View style={{ paddingHorizontal: 24, marginTop: -5 }}>
                <View style={{ marginBottom: 20 }}>
                   <Text style={{ color: '#F5B235', fontSize: 10, fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4, fontFamily: DS_FONT_INPUT, opacity: 0.6 }}>MISSION INTELLIGENCE</Text>
                   <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1, fontFamily: DS_FONT_UI }}>Briefing profile</Text>
                </View>

                <View style={{ gap: 10 }}>
                   <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 100 }} style={[styles.confItem, { borderLeftWidth: 3, borderLeftColor: '#F5B235' }]}>
                      <View style={styles.confItemIcon}>
                        <Lucide.AlertCircle size={20} color="#F5B235" />
                      </View>
                      <View style={styles.confItemContent}>
                        <Text style={styles.confItemLabel}>Incident type</Text>
                        <Text style={styles.confItemValue}>{fullReport?.type || 'General alert'}</Text>
                      </View>
                   </MotiView>

                   <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 200 }} style={[styles.confItem, { borderLeftWidth: 3, borderLeftColor: severityColor }]}>
                      <View style={styles.confItemIcon}>
                        <Lucide.Shield size={20} color={severityColor} />
                      </View>
                      <View style={styles.confItemContent}>
                        <Text style={styles.confItemLabel}>Severity level</Text>
                        <Text style={[styles.confItemValue, { color: severityColor }]}>{reportParam.severity || 'Moderate'}</Text>
                      </View>
                   </MotiView>

                   <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 300 }} style={[styles.confItem, { borderLeftWidth: 3, borderLeftColor: '#94A3B8' }]}>
                      <View style={styles.confItemIcon}>
                        <Lucide.MapPin size={20} color="#94A3B8" />
                      </View>
                      <View style={styles.confItemContent}>
                        <Text style={styles.confItemLabel}>Target sector</Text>
                        <Text style={styles.confItemValue} numberOfLines={1}>{fullReport?.barangay || 'Santa Cruz'}</Text>
                      </View>
                   </MotiView>

                   <MotiView from={{ opacity: 0, translateX: -10 }} animate={{ opacity: 1, translateX: 0 }} transition={{ delay: 400 }} style={[styles.confItem, { borderLeftWidth: 3, borderLeftColor: reportStatus === 'Verified' || reportStatus === 'Approved' || reportStatus === 'Resolved' ? '#10B981' : '#F5B235' }]}>
                      <View style={styles.confItemIcon}>
                        <Lucide.Activity size={20} color={reportStatus === 'Verified' || reportStatus === 'Approved' || reportStatus === 'Resolved' ? '#10B981' : '#F5B235'} />
                      </View>
                      <View style={styles.confItemContent}>
                        <Text style={styles.confItemLabel}>Mission status</Text>
                        <Text style={[styles.confItemValue, { color: reportStatus === 'Verified' || reportStatus === 'Approved' || reportStatus === 'Resolved' ? '#10B981' : '#F5B235' }]}>
                          {reportStatus || 'Awaiting validation'}
                        </Text>
                      </View>
                   </MotiView>
                </View>

                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 500 }} style={styles.confObsCard}>
                   <Text style={styles.confObsLabel}>SITUATION OVERVIEW</Text>
                   <Text style={styles.confObsText}>
                     {fullReport?.description || reportParam.description || 'Awaiting mission metadata...'}
                   </Text>
                   {fullReport?.location_text && (
                    <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Lucide.Compass size={14} color="#F5B235" />
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', flex: 1, fontWeight: '500' }}>{fullReport.location_text}</Text>
                    </View>
                   )}
                </MotiView>

                <Section title="Allowed mobility" style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {allowedVehicles.map(v => {
                        const Icon = Lucide[VEHICLE_ICONS[v] || 'CircleDot'];
                        return (
                          <View key={v} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <Icon size={14} color="#FFF" strokeWidth={2.2} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF', marginLeft: 8 }}>{v}</Text>
                          </View>
                        );
                      })}
                    </View>
                </Section>

                <View style={{ marginTop: 24 }}>
                  <EvidenceGallery uris={galleryUris} />
                </View>

                {/* Authorized Node */}
                <View style={[styles.confItem, { marginTop: 20 }]}>
                    <View style={[styles.confItemIcon, { backgroundColor: '#F5B235' }]}>
                      <Lucide.UserCheck size={22} color="#000" strokeWidth={2.5} />
                    </View>
                    <View style={styles.confItemContent}>
                      <Text style={styles.confItemLabel}>Validated reporter</Text>
                      <Text style={styles.confItemValue}>{fullReport?.reporter_name || 'Verified Source'}</Text>
                    </View>
                    <Lucide.CheckCircle2 size={18} color="#10B981" strokeWidth={2.5} />
                </View>

                {/* Radar Broadcast Card */}
                <View style={styles.confStatusCard}>
                   <Lucide.Radar size={18} color="#F5B235" />
                   <Text style={styles.confStatusText}>
                     Intelligence synchronized across all tactical units. Emergency responders are currently monitoring this sector.
                   </Text>
                </View>

                {isAdmin && (
                   <View style={{ marginTop: 24 }}>
                      <SopManager 
                         runs={sopRuns} 
                         loading={loadingSop} 
                         onInitiate={() => {}} 
                         onComplete={() => {}} 
                      />
                      <View style={{ height: 16 }} />
                      <ReportActions 
                         status={reportStatus} 
                         isFlood={isFlood} 
                         onApprove={() => handleUpdateStatus('approve')} 
                         onReject={() => handleUpdateStatus('reject')} 
                         onResolve={() => handleUpdateStatus('resolve')} 
                         updating={updating} 
                      />
                   </View>
                )}
             </View>
          </MotiView>
      </ScrollView>

      {/* Navigation Button */}
      <View style={[styles.footer, { bottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity 
              onPress={() => {
                  navigation.navigate('HazardMap', { focusId: fullReport?.id || reportParam.id });
              }}
              style={styles.navBtn}
          >
              <Lucide.Map size={20} color="#000" />
              <Text style={styles.navBtnText}>View Map</Text>
          </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  confItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 12, marginBottom: 4 },
  confItemIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  confItemContent: { flex: 1 },
  confItemLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  confItemValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  confObsCard: { marginTop: 12, padding: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12 },
  confObsLabel: { color: '#F5B235', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  confObsText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  confStatusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, marginTop: 12 },
  confStatusText: { flex: 1, color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 18, fontWeight: '500' },
  footer: { position: 'absolute', left: 24, right: 24, zIndex: 100 },
  navBtn: { height: 56, backgroundColor: '#F5B235', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  navBtnText: { color: '#000', fontSize: 16, fontWeight: '700' }
});

export default ReportDetailsScreen;
