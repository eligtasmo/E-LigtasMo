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
import { TacticalIntelCard } from '../components/Intelligence/TacticalIntelCard';

const LAT = 14.2833;
const LONG = 121.4167;

const QUICK_ACTIONS = [
  { id: 'disaster', label: 'Disaster\nAlerts', icon: 'ShieldAlert' },
  { id: 'news', label: 'News &\nUpdates', icon: 'Megaphone' },
  { id: 'hazard', label: 'Hazard\nMap', icon: 'Map' },
  { id: 'hotlines', label: 'Emergency\nHotlines', icon: 'PhoneCall' },
];

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) {
    const mins = Math.floor(diffInSeconds / 60);
    return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  // If it's a day already, show Month Day, Year
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

  const handleZoom = (item) => {
    navigation.navigate('HazardMap', { focusId: item.id });
  };

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
      const res = await fetch(`${API_URL}/incident-reports.php?all_time=true`);
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
      const session = await AuthService.checkSession();
      const userId = session?.id || 0;
      const brgy = session?.brgy_name || session?.barangay || '';
      const role = (session?.role || 'resident').toLowerCase();

      // Fetch both targeted notifications and general announcements
      const [notifRes, annRes] = await Promise.all([
        fetch(`${API_URL}/list-notifications.php?audience=${role === 'resident' ? 'residents' : 'barangay'}&user_id=${userId}&brgy=${encodeURIComponent(brgy)}`),
        fetch(`${API_URL}/announcements.php?limit=10`)
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

      // De-duplicate if same ID exists in both (unlikely but safe)
      const seen = new Set();
      combined = combined.filter(item => {
        const key = `${item._source}-${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      combined.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setAnnouncements(combined);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const locationLabel = 'Santa Cruz, Laguna';

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
    if (id === 'checkin') navigation.navigate('FamilyHub');
    if (id === 'hotlines') navigation.navigate('EmergencyHotlines');
    if (id === 'hazard') navigation.navigate('HazardMap');
    if (id === 'more') navigation.navigate('Notifications');
  };


  const recentFloodReports = useMemo(() => {
    const allowed = ['ACTIVE', 'APPROVED', 'VERIFIED'];
    return verifiedReports
      .filter(r => allowed.includes((r.status || 'Active').toUpperCase()))
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
          <View style={{ gap: 18 }}>
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
              location="Santa Cruz, Laguna"
              temp={weatherDisplay.temp}
              condition={weatherDisplay.desc}
              hourly={weatherDisplay.hourly}
              onPress={() => navigation.navigate('Weather')}
            />

            {recentFloodReports.length > 0 && (
              <View style={styles.floodSection}>
                <Row justify="space-between" align="center" style={{ marginBottom: 12 }}>
                  <Text style={styles.communityHeading}>Recent Flood Reports</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('HazardMap')}>
                    <Text style={styles.communityLink}>View Mission History</Text>
                  </TouchableOpacity>
                </Row>
                <View style={{ 
                  flexDirection: 'row', 
                  flexWrap: 'wrap', 
                  gap: 10,
                  justifyContent: 'flex-start'
                }}>
                  {recentFloodReports.map((item, idx) => (
                    <TacticalIntelCard 
                      key={item.id || idx}
                      item={item}
                      variant="grid"
                      onPress={() => handleZoom(item)}
                    />
                  ))}
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
                      onPress={() => {
                        if (isAlert) {
                          navigation.navigate('DisasterAlerts');
                        } else {
                          setUrgentAnnouncement(announcements[index]);
                          setShowUrgentModal(true);
                        }
                      }}
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
                            <Lucide.X size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                    </Row>
                </Row>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={{ marginBottom: 32 }}>
                        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>{tacticalDetail.name || tacticalDetail.barangay_name}</Text>
                        <Row gap={8} align="center" style={{ marginTop: 8 }}>
                            <Lucide.MapPin size={14} color="#2F7BFF" />
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Santa Cruz Sector</Text>
                        </Row>
                    </View>

                    {tacticalDetail.flood_depth_cm !== undefined && (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 }}>SENSOR TELEMETRY</Text>
                            <Row align="baseline" gap={4}>
                                <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>{tacticalDetail.flood_depth_cm}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700' }}>CM</Text>
                            </Row>
                            <Text style={{ color: tacticalDetail.status_level === 'safe' ? '#10B981' : '#F5B235', fontSize: 12, fontWeight: '800', marginTop: 8, textTransform: 'uppercase' }}>Status: {tacticalDetail.status_level}</Text>
                        </View>
                    )}

                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 24, marginBottom: 32 }}>
                        {tacticalDetail.description || 'This resource node is currently active and serving as a critical point for mission operations. Personnel and resources are deployed to assist residents in the immediate vicinity.'}
                    </Text>
                </ScrollView>

                <TouchableOpacity 
                    onPress={() => {
                        setTacticalDetail(null);
                        navigation.navigate('HazardMap', { focusId: tacticalDetail.id });
                    }}
                    style={{ backgroundColor: '#2F7BFF', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, shadowColor: '#2F7BFF', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } }}
                >
                    <Lucide.Map size={22} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>View Map</Text>
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
