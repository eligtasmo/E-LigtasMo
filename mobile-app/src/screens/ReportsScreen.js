import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL } from '../config';
import { Screen, Row, Heading, Container, Section, PageHeader, Card, TextInput } from '../components/DesignSystem';

// Sub-components
import { TacticalIntelCard } from '../components/Intelligence/TacticalIntelCard';

const ReportsScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(route.params?.filter || 'All');

  const checkUserSession = async () => {
    try {
      const u = await AuthService.checkSession();
      setUser(u);
      return u;
    } catch (e) {
      return null;
    }
  };

  const filters = useMemo(() => {
    const base = ['All', 'Verified', 'Pending', 'Resolved', 'Rejected'];
    if (user?.role === 'resident' || !user?.role) {
      return ['My Intelligence', ...base];
    }
    return base;
  }, [user]);

  const fetchReports = async (currentUser) => {
    try {
        const role = (currentUser?.role || 'resident').toLowerCase();
        let useFloodEndpoint = role === 'resident' || role === 'brgy';
        let url = useFloodEndpoint ? `${API_URL}/list-incident-reports.php` : `${API_URL}/list-incidents.php`;
        
        const params = [];
        if (useFloodEndpoint) {
          if (selectedFilter === 'My Intelligence') {
            params.push(`user_id=${currentUser.id}`);
            params.push('all_time=true');
          } else if (selectedFilter && selectedFilter !== 'All') {
            params.push(`status=${encodeURIComponent(selectedFilter)}`);
          }
          if (role === 'resident' && selectedFilter !== 'My Intelligence') params.push('all_time=true');
        } else {
          if (currentUser?.barangay) params.push(`barangay=${encodeURIComponent(currentUser.barangay)}`);
        }

        if (params.length) url += (url.includes('?') ? '&' : '?') + params.join('&');

        const response = await fetch(url);
        const data = await response.json();
        
        if (useFloodEndpoint) {
          const items = Array.isArray(data) ? data : [];
          const normalized = items.map(r => ({
            id: r.id,
            status: r.status,
            description: r.description || 'Intelligence entry submitted via Field Node.',
            created_at: r.time,
            address: r.location_text || (r.barangay ? `Brgy. ${r.barangay}` : `Operational Sector`),
            lat: r.lat,
            lng: r.lng,
            type: r.type || 'Incident',
            severity: r.severity,
            barangay: r.barangay,
            reporter_role: r.reporter_role || 'resident',
            user_id: r.user_id
          }));
          setReports(normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } else if (data.success) {
          setReports(data.incidents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const handleZoom = (item) => {
    navigation.navigate('HazardMap', { focusId: item.id });
  };

  useEffect(() => {
    if (selectedFilter === 'My Intelligence' && !user) {
        checkUserSession().then(u => fetchReports(u));
    } else {
        fetchReports(user);
    }
  }, [selectedFilter, user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const u = await checkUserSession();
    await fetchReports(u);
  }, [selectedFilter]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSearch = r.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [reports, searchQuery]);

  return (
    <Screen ornamentIntensity={0.5}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <PageHeader 
          title="Mission Intelligence" 
          subtitle="Field Reports & Verification"
          rightElement={
            <TouchableOpacity 
              onPress={onRefresh}
              style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(245, 178, 53, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(245, 178, 53, 0.2)' }}
            >
               <Lucide.RotateCw size={20} color="#F5B235" strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />
        
        <Container>
           <View style={{ marginBottom: 16 }}>
             <View style={{ 
               flexDirection: 'row', 
               alignItems: 'center', 
               backgroundColor: 'rgba(255,255,255,0.05)', 
               borderRadius: 16, 
               paddingHorizontal: 16,
               height: 52,
               borderWidth: 1,
               borderColor: 'rgba(255,255,255,0.08)'
             }}>
               <Lucide.Search size={20} color="rgba(255,255,255,0.4)" />
               <TextInput 
                 placeholder="Search reports or locations..."
                 placeholderTextColor="rgba(255,255,255,0.3)"
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 style={{ 
                   flex: 1, 
                   marginLeft: 12, 
                   color: '#fff', 
                   fontSize: 14,
                   fontFamily: 'Inter-Medium'
                 }}
               />
               {searchQuery.length > 0 && (
                 <TouchableOpacity onPress={() => setSearchQuery('')}>
                   <Lucide.XCircle size={18} color="rgba(255,255,255,0.4)" />
                 </TouchableOpacity>
               )}
             </View>
           </View>

           <ScrollView 
             horizontal 
             showsHorizontalScrollIndicator={false} 
             contentContainerStyle={{ paddingBottom: 20, gap: 10 }}
           >
             {filters.map((filter) => {
               const isSelected = selectedFilter === filter;
               return (
                 <TouchableOpacity
                   key={filter}
                   onPress={() => setSelectedFilter(filter)}
                   activeOpacity={0.8}
                   style={{
                     paddingHorizontal: 18,
                     paddingVertical: 10,
                     borderRadius: 14,
                     backgroundColor: isSelected ? '#F5B235' : 'rgba(255,255,255,0.05)',
                     borderWidth: 1,
                     borderColor: isSelected ? '#F5B235' : 'rgba(255,255,255,0.1)',
                     flexDirection: 'row',
                     alignItems: 'center',
                     gap: 8
                   }}
                 >
                   {filter === 'My Intelligence' && <Lucide.Fingerprint size={14} color={isSelected ? '#000' : '#F5B235'} />}
                   <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#000' : 'rgba(255,255,255,0.6)', letterSpacing: 0.8 }}>
                     {filter.toUpperCase()}
                   </Text>
                 </TouchableOpacity>
               );
             })}
           </ScrollView>
        </Container>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        <Container>
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
             {loading && !refreshing ? (
               <View style={{ marginTop: 60, alignItems: 'center' }}>
                 <ActivityIndicator color={theme.primary} size="large" />
                 <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '600', color: theme.textMuted, letterSpacing: 1 }}>SYNCHRONIZING RECORDS...</Text>
               </View>
             ) : filteredReports.length === 0 ? (
               <View style={{ marginTop: 60, alignItems: 'center', opacity: 0.6 }}>
                 <Lucide.ArchiveX size={64} color={theme.textMuted} strokeWidth={1} />
                 <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '600', color: theme.textMuted }}>No field data archived for this sector.</Text>
               </View>
             ) : (
               filteredReports.map((report, idx) => (
                 <MotiView
                   key={report.id || idx}
                   from={{ opacity: 0, translateY: 10 }}
                   animate={{ opacity: 1, translateY: 0 }}
                   transition={{ delay: idx * 50 }}
                 >
                   <TacticalIntelCard 
                     item={report}
                     variant="list"
                     onPress={() => navigation.navigate('ReportDetails', { report })}
                     onZoom={handleZoom}
                   />
                 </MotiView>
               ))
             )}
          </MotiView>
        </Container>
      </ScrollView>

      {/* Floating Action for Reporting */}
      <MotiView
        from={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 500, type: 'spring' }}
        style={{ position: 'absolute', bottom: 100, alignSelf: 'center' }}
      >
        <TouchableOpacity 
          onPress={() => navigation.navigate('ReportIncident')}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: theme.primary,
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 30,
            ...theme.shadows.md
          }}
        >
          <Lucide.ShieldAlert size={20} color={theme.mode === 'dark' ? '#000' : '#fff'} strokeWidth={2.5} />
          <Text style={{ color: theme.mode === 'dark' ? '#000' : '#fff', fontWeight: '600', marginLeft: 12, letterSpacing: 1 }}>REPORT INCIDENT</Text>
        </TouchableOpacity>
      </MotiView>
    </Screen>
  );
};

export default ReportsScreen;
