import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';

import { fetchWeatherForecast, getWeatherDescription } from '../services/WeatherService';
import { AuthService } from '../services/AuthService';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';
import {
  Screen,
  Row,
  Col,
  Container,
  DS_FONT_INPUT,
  DS_FONT_UI,
  useResponsive,
} from '../components/DesignSystem';
import {
  TacticalHeader,
  TacticalAlertCard,
  TacticalWeatherCard,
  TacticalQuickActions,
} from '../components/Home/TacticalComponents';
import TacticalAnnouncementModal from '../components/Home/TacticalAnnouncementModal';

const LAT = 14.2833;
const LONG = 121.4167;

const QUICK_ACTIONS = [
  { id: 'disaster', label: 'Disaster\nAlerts', icon: 'ShieldAlert' },
  { id: 'news', label: 'News &\nUpdates', icon: 'Megaphone' },
  { id: 'donation', label: 'Donation\nDrive', icon: 'HeartPulse' },
  { id: 'hazard', label: 'Hazard\nMap', icon: 'Map' },
  { id: 'hotlines', label: 'Emergency\nHotlines', icon: 'PhoneCall' },
];

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const HomeScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { isMobile } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [weather, setWeather] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [affectedBarangays, setAffectedBarangays] = useState([]);
  const [verifiedReports, setVerifiedReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [urgentAnnouncement, setUrgentAnnouncement] = useState(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [tacticalDetail, setTacticalDetail] = useState(null);

  useEffect(() => {
    let routeParams = navigation.getState()?.routes[navigation.getState()?.index]?.params;
    
    // Web Fallback: Parse URL search params if no route params found (for testing on localhost)
    if (Platform.OS === 'web' && !routeParams) {
        const search = window.location.search;
        if (search) {
            const urlParams = new URLSearchParams(search);
            routeParams = Object.fromEntries(urlParams.entries());
        }
    }

    if (routeParams) {
        if (routeParams.type && routeParams.id) {
            handleDeepLink(routeParams.type, routeParams.id);
        } else if (routeParams.sLat || routeParams.dLat) {
            handleDeepLink('route-planner', null, routeParams);
        }
    }
  }, [navigation.getState()]);

  const handleDeepLink = async (type, id, params = {}) => {
    try {
        if (type === 'route-planner') {
            const { sLat, sLon, dLat, dLon, mode, name } = params;
            navigation.navigate('RoutePlanner', { 
                startLat: parseFloat(sLat), 
                startLon: parseFloat(sLon), 
                lat: parseFloat(dLat), 
                lon: parseFloat(dLon), 
                mode, 
                name: decodeURIComponent(name || 'Shared Mission') 
            });
            return;
        }

        let url = "";
        if (type === 'shelter') url = `${API_URL}/list-shelters.php?id=${id}`;
        else if (type === 'barangay') url = `${API_URL}/barangay-status.php?id=${id}`;
        
        if (url) {
            const res = await fetch(url);
            const data = await res.json();
            if (data.success || data.status === 'success') {
                const item = (data.shelters || data.data || [])[0] || data.shelter || data.barangay;
                if (item) setTacticalDetail({ ...item, _tacticalType: type });
            }
        }
    } catch(e) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const userData = await AuthService.checkSession();
    setUser(userData);
    await Promise.all([
      loadWeather(),
      loadVerifiedReports(),
      loadAffectedBarangays(),
      loadAnnouncements(),
    ]);
  };

  const loadWeather = async () => {
    const data = await fetchWeatherForecast(LAT, LONG);
    if (data) setWeather(data);
  };

  const loadVerifiedReports = async () => {
    try {
      const res = await fetch(`${API_URL}/list-incident-reports.php?status=Verified&all_time=true`);
      const data = await res.json();
      if (Array.isArray(data)) setVerifiedReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadAffectedBarangays = async () => {
    try {
      const res = await fetch(`${API_URL}/barangay-status.php`);
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        const affected = data.data.filter(
          (item) =>
            (item.status_level && item.status_level.toLowerCase() !== 'safe') ||
            (item.flood_depth_cm && parseFloat(item.flood_depth_cm) > 0)
        );
        setAffectedBarangays(affected);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const [notifRes, annRes] = await Promise.all([
        fetch(`${API_URL}/list-notifications.php?audience=all`, { headers: { 'X-Token': 'RESCUE_PH_TOKEN' } }),
        fetch(`${API_URL}/list-announcements.php?limit=10`, { headers: { 'X-Token': 'RESCUE_PH_TOKEN' } })
      ]);
      const notifData = await notifRes.json();
      const annData = await annRes.json();

      let combined = [];
      if (notifData.success && Array.isArray(notifData.notifications)) {
        combined = [...combined, ...notifData.notifications.map(n => ({ ...n, _source: 'alert' }))];
      }
      if (annData.success && Array.isArray(annData.announcements)) {
        combined = [...combined, ...annData.announcements.map(a => ({ ...a, _source: 'news' }))];
      }

      combined.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setAnnouncements(combined);

      // Check for urgent ones (is_urgent === 1 or alert type)
      const urgent = combined.find(a => (a.is_urgent === 1 || a._source === 'alert') && a.status !== 'archived');
      if (urgent) {
        setUrgentAnnouncement(urgent);
        setShowUrgentModal(true);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const locationLabel = user?.brgy_name || user?.barangay ? `Brgy. ${user?.brgy_name || user?.barangay}` : 'Santa Cruz, Laguna';

  const weatherDisplay = useMemo(() => {
    if (!weather?.current) {
      return { temp: '22°', desc: 'Sunny Morning', hourly: [] };
    }
    const current = weather.current;
    const times = weather.hourly?.time || [];
    const temps = weather.hourly?.temperature_2m || [];
    const codes = weather.hourly?.weather_code || [];

    const hourly = [0, 1, 2, 3, 4].map(idx => ({
      icon: 'Sun',
      temp: `${Math.round(temps[idx] || 22)}°`,
      time: times[idx] ? new Date(times[idx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'
    }));

    return {
      temp: `${Math.round(current.temperature_2m || 22)}°`,
      desc: getWeatherDescription(current.weather_code) || 'Sunny Morning',
      hourly,
    };
  }, [weather]);

  const latestAlert = useMemo(() => {
    // Find the first actual alert if possible
    const topAlert = announcements.find(a => a._source === 'alert' && ['critical', 'error', 'emergency', 'warning'].includes((a.type || '').toLowerCase()));
    if (topAlert) {
      return {
        title: topAlert.title || 'Emergency Alert',
        message: topAlert.message || 'Please check disaster alerts for details.',
      };
    }
    if (announcements.length > 0) {
      const top = announcements[0];
      return {
        title: top.title || 'Community advisory',
        message: top.message || 'Stay alert and follow local guidance.',
      };
    }
    return {
      title: 'Systems are nominal',
      message: 'No active disaster alerts in your immediate vicinity.',
    };
  }, [announcements]);

  const communityUpdates = useMemo(() => {
    return announcements.map((item) => ({
      id: `ann-${item.id || item.title}`,
      title: item.title,
      subtitle: item.message,
      meta: item.type ? String(item.type).toUpperCase() : 'INFO',
    }));
  }, [announcements]);

  const handleQuickAction = (id) => {
    if (id === 'disaster') navigation.navigate('DisasterAlerts');
    if (id === 'news') navigation.navigate('Announcements');
    if (id === 'donation') navigation.navigate('DonationDrives');
    if (id === 'checkin') navigation.navigate('FamilyHub');
    if (id === 'hotlines') navigation.navigate('EmergencyHotlines');
    if (id === 'hazard') navigation.navigate('HazardMap');
    if (id === 'more') navigation.navigate('Notifications');
  };

  const floodReports = useMemo(() => {
    return verifiedReports
      .filter(r => (r.type || '').toLowerCase().includes('flood') || (r.description || '').toLowerCase().includes('baha'))
      .slice(0, 6);
  }, [verifiedReports]);

  return (
    <Screen withOrnament={false}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B37213" />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 16 }}
      >
        <Container>
          <View
            style={{ gap: 18 }}
          >
            <TacticalHeader
              title="E-LigtasMo"
              subtitle={locationLabel}
            />

            <TacticalAlertCard
              title={latestAlert.title}
              message={latestAlert.message}
              onPress={() => navigation.navigate('Announcements')}
            />

            <TacticalQuickActions
              actions={QUICK_ACTIONS}
              onAction={handleQuickAction}
            />

            <TacticalWeatherCard
              location={locationLabel.replace('Brgy. ', '')}
              temp={weatherDisplay.temp}
              condition={weatherDisplay.desc}
              hourly={weatherDisplay.hourly}
              onPress={() => navigation.navigate('Weather')}
            />

            {floodReports.length > 0 && (
              <View style={styles.floodSection}>
                <Row justify="space-between" align="center" style={{ marginBottom: 14 }}>
                  <Text style={styles.communityHeading}>Recent Flood Reports</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Reports', { filter: 'Flood' })} activeOpacity={0.85}>
                    <Text style={styles.communityLink}>View All</Text>
                  </TouchableOpacity>
                </Row>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {floodReports.map((report, idx) => {
                    const severity = String(report.severity || 'Moderate').toLowerCase();
                    let color = '#3B82F6'; // Default Low/Blue
                    if (severity === 'moderate' || severity === 'warning') color = '#F5B235'; // Moderate/Yellow
                    if (severity === 'high' || severity === 'critical' || severity === 'severe') color = '#EF4444'; // High/Red

                    return (
                      <TouchableOpacity 
                        key={report.id || idx}
                        onPress={() => navigation.navigate('ReportDetails', { reportId: report.id })}
                        activeOpacity={0.8}
                        style={{ 
                          width: (windowWidth - 32 - 20) / 3, // 3 per row
                          backgroundColor: color + '15',
                          borderRadius: 24,
                          padding: 14,
                          borderWidth: 1.5,
                          borderColor: color + '30',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minHeight: 125, 
                        }}
                      >
                        <View style={{ alignItems: 'center', width: '100%' }}>
                          <View style={{ 
                            width: 38, 
                            height: 38, 
                            borderRadius: 14, 
                            backgroundColor: color + '20', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: color + '40'
                          }}>
                            <Lucide.Waves size={20} color={color} strokeWidth={2.5} />
                          </View>
                          <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center', fontFamily: DS_FONT_UI, letterSpacing: -0.2 }}>
                            {report.barangay || 'Sector'}
                          </Text>
                          <View style={{ 
                            marginTop: 5, 
                            paddingHorizontal: 8, 
                            paddingVertical: 3, 
                            borderRadius: 8, 
                            backgroundColor: color + '25',
                            borderWidth: 1,
                            borderColor: color + '40'
                          }}>
                            <Text style={{ fontSize: 7, fontWeight: '900', color: color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {report.severity || 'Normal'}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <Lucide.Clock size={9} color="rgba(255,255,255,0.4)" />
                          <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontFamily: DS_FONT_INPUT }}>
                            {formatRelativeTime(report.created_at)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.communitySection}>
              <Row justify="space-between" align="center" style={{ marginBottom: 14 }}>
                <Text style={styles.communityHeading}>
                  {announcements.some(a => a._source === 'alert' && ['critical', 'error', 'emergency', 'warning'].includes((a.type || '').toLowerCase()))
                    ? 'Active Alerts'
                    : 'Latest News'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Announcements')} activeOpacity={0.85}>
                  <Text style={styles.communityLink}>See All</Text>
                </TouchableOpacity>
              </Row>

              <View style={styles.communityCards}>
                {communityUpdates.slice(0, isMobile ? 2 : 3).map((item, index) => {
                  const isAlert = announcements[index]?._source === 'alert';
                  const uniqueKey = item.id || `update-${index}-${item.created_at || Date.now()}`;
                  return (
                    <TouchableOpacity
                      key={uniqueKey}
                      activeOpacity={0.86}
                      onPress={() => isAlert ? navigation.navigate('DisasterAlerts') : navigation.navigate('Announcements')}
                      style={styles.communityCard}
                    >
                      <View style={styles.communityMeta}>
                        <Text style={styles.communityMetaText}>{item.meta}</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.communityTitle}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={2} style={styles.communitySubtitle}>
                        {item.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Container>
      </ScrollView>

      <TacticalAnnouncementModal
        isVisible={showUrgentModal}
        announcement={urgentAnnouncement}
        onClose={() => setShowUrgentModal(false)}
      />

      <AnimatePresence>
        {tacticalDetail && (
            <MotiView 
                key="tactical-detail-overlay"
                from={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 1.05 }}
                style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(11,10,8,0.98)', zIndex: 9999, padding: 24, paddingTop: (insets?.top || 40) + 20 }]}
            >
                <Row justify="space-between" align="center" style={{ marginBottom: 24 }}>
                    <View style={{ backgroundColor: 'rgba(47, 123, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                        <Text style={{ color: '#2F7BFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{tacticalDetail._tacticalType.toUpperCase()}</Text>
                    </View>
                    <Row gap={12}>
                        <TouchableOpacity 
                            onPress={async () => {
                                try {
                                    const link = `eligtasmo://${tacticalDetail._tacticalType}/${tacticalDetail.id || tacticalDetail.barangay_name}`;
                                    await Share.share({
                                        message: `Tactical Alert: Check ${tacticalDetail.name || tacticalDetail.barangay_name} status on E-LigtasMo.\nLink: ${link}`,
                                        title: 'Share Mission Node'
                                    });
                                } catch(e) {}
                            }} 
                            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Lucide.Share2 size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setTacticalDetail(null)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                            <Lucide.X size={24} color="#fff" />
                        </TouchableOpacity>
                    </Row>
                </Row>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 }}>{tacticalDetail.name || tacticalDetail.barangay_name || 'Resource Node'}</Text>
                    <Row align="center" gap={8} style={{ marginBottom: 24 }}>
                        <Lucide.MapPin size={16} color="rgba(255,255,255,0.4)" />
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{tacticalDetail.location || tacticalDetail.address || 'Santa Cruz, Laguna'}</Text>
                    </Row>

                    {tacticalDetail._tacticalType === 'shelter' && (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                            <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' }}>CAPACITY LOGISTICS</Text>
                                <Text style={{ color: tacticalDetail.status === 'Open' ? '#27AE60' : '#FF4B4B', fontWeight: '800', fontSize: 12 }}>{tacticalDetail.status?.toUpperCase() || 'OPEN'}</Text>
                            </Row>
                            
                            <Row justify="space-between" style={{ marginBottom: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Occupancy</Text>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tacticalDetail.occupancy} / {tacticalDetail.capacity}</Text>
                            </Row>

                            <View style={{ height: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${Math.min(100, (tacticalDetail.occupancy / (tacticalDetail.capacity || 1)) * 100)}%`, backgroundColor: '#2F7BFF' }} />
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 12 }}>Updated: {new Date().toLocaleTimeString()}</Text>
                        </View>
                    )}

                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 24, marginBottom: 32 }}>
                        {tacticalDetail.description || 'This resource node is currently active and serving as a critical point for mission operations. Personnel and resources are deployed to assist residents in the immediate vicinity.'}
                    </Text>
                </ScrollView>

                <TouchableOpacity 
                    onPress={() => {
                        const lat = tacticalDetail.lat || tacticalDetail.latitude;
                        const lon = tacticalDetail.lng || tacticalDetail.longitude;
                        setTacticalDetail(null);
                        navigation.navigate('RoutePlanner', { lat, lon, name: tacticalDetail.name || tacticalDetail.barangay_name });
                    }}
                    style={{ backgroundColor: '#2F7BFF', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, shadowColor: '#2F7BFF', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } }}
                >
                    <Lucide.Navigation size={22} color="#fff" fill="#fff" />
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>Take Me Here</Text>
                </TouchableOpacity>
            </MotiView>
        )}
      </AnimatePresence>
    </Screen>
  );
};

const styles = StyleSheet.create({
  floodSection: {
    paddingTop: 4,
    marginTop: 8
  },
  communitySection: {
    paddingTop: 4,
    marginTop: 12
  },
  communityHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: '#EFEAE0',
    fontFamily: DS_FONT_UI,
  },
  communityLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F5B235',
    fontFamily: DS_FONT_UI,
  },
  communityCards: {
    gap: 12,
  },
  communityCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  communityMeta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(247,161,0,0.14)',
    marginBottom: 8,
  },
  communityMetaText: {
    fontSize: 9,
    letterSpacing: 0.4,
    color: '#F5B235',
    fontWeight: '600',
    fontFamily: DS_FONT_UI,
  },
  communityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F4F0E8',
    fontFamily: DS_FONT_UI,
  },
  communitySubtitle: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 17,
    color: 'rgba(236,231,223,0.7)',
    fontWeight: '400',
    fontFamily: DS_FONT_INPUT,
  },
});

export default HomeScreen;
