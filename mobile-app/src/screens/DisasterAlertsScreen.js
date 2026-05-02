import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Container, Row, Col, Heading, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';
import { AlertCard } from '../components/Alerts/AlertCard';

const DisasterAlertsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const user = session ? JSON.parse(session) : {};
      
      // 1. Fetch System Notifications
      const resNotif = await fetch(`${API_URL}/list-notifications.php?audience=all`, {
        headers: { 'X-Role': user.role || 'guest' },
      });
      const dataNotif = await resNotif.json();
      const systemAlerts = dataNotif?.success ? dataNotif.notifications : [];

      // 2. Fetch Social Pulse (PAGASA, PHILVOLCS, MDRRMO FB)
      const resSocial = await fetch(`${API_URL}/social-pulse.php`);
      const dataSocial = await resSocial.json();
      const socialAlerts = dataSocial?.status === 'success' ? dataSocial.data.map(post => ({
        id: `social-${post.id}`,
        title: post.source_name,
        message: post.content,
        type: post.risk_level === 'high' ? 'critical' : (post.risk_level === 'medium' ? 'warning' : 'info'),
        created_at: post.posted_at,
        url: post.url || post.post_url,
        isSocial: true
      })) : [];

      // Combine and Sort by date
      const combined = [...systemAlerts, ...socialAlerts].sort((a, b) => 
        new Date(b.created_at || b.posted_at) - new Date(a.created_at || a.posted_at)
      );

      setNotifications(combined);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const categories = ['All', 'Earthquake', 'Fire', 'Flood', 'Storm'];

  const filteredAlerts = useMemo(() => {
    return notifications.filter(item => {
      const typeStr = (item.type || '').toLowerCase();
      // Only include high-priority / emergency types
      if (!['critical', 'error', 'emergency', 'warning'].includes(typeStr) && !['earthquake', 'fire', 'flood', 'storm'].some(t => typeStr.includes(t))) {
        return false;
      }

      const matchesCategory = selectedCategory === 'All' || 
        typeStr.includes(selectedCategory.toLowerCase()) ||
        (item.title || '').toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.message || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [notifications, selectedCategory, searchQuery]);

  const insets = useSafeAreaInsets();

  return (
    <Screen ornamentIntensity={0.5} style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
         <Row justify="space-between" align="center" style={{ paddingHorizontal: 16 }}>
           <Row align="center" gap={14}>
             <TouchableOpacity 
               onPress={() => navigation.goBack()} 
               style={{ 
                 width: 42, height: 42, borderRadius: 21, 
                 backgroundColor: 'rgba(255,255,255,0.06)', 
                 alignItems: 'center', justifyContent: 'center', 
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' 
               }}
             >
               <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.4} />
             </TouchableOpacity>
             <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(245,178,53,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
               <Lucide.ShieldAlert size={16} color="#F5B235" strokeWidth={2.1} />
             </View>
             <Text style={{ fontSize: 16, fontWeight: '700', color: '#F4F0E8', fontFamily: DS_FONT_UI }}>Disaster Alerts</Text>
           </Row>
           
           <Row gap={10}>
             <TouchableOpacity 
               onPress={() => navigation.navigate('Notifications')}
               style={{ 
                 width: 42, height: 42, borderRadius: 21, 
                 backgroundColor: 'rgba(255,255,255,0.06)', 
                 alignItems: 'center', justifyContent: 'center', 
                 borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' 
               }}
             >
               <Lucide.Bell size={18} color="#F4F0E8" strokeWidth={2.2} />
               <View style={{ position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#F5B235', borderWidth: 1.5, borderColor: '#080808' }} />
             </TouchableOpacity>
           </Row>
         </Row>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#F5B235" />
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor="#FF7E3D" />}
          ListHeaderComponent={
            <View>
              {/* Search Bar */}
              <View style={{ paddingHorizontal: 16 }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(255,255,255,0.05)', 
                  borderRadius: 25, 
                  paddingHorizontal: 18, 
                  height: 50, 
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)'
                }}>
                  <Lucide.Search size={18} color="rgba(255,255,255,0.4)" strokeWidth={2.4} />
                  <TextInput 
                    placeholder="Search active alerts..." 
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ flex: 1, marginLeft: 12, color: '#FFF', fontSize: 13, fontWeight: '500', fontFamily: DS_FONT_UI }}
                  />
                </View>
              </View>

              {/* Categories */}
              <FlatList 
                horizontal 
                data={categories}
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
                renderItem={({ item }) => {
                  const isSelected = selectedCategory === item;
                  return (
                    <TouchableOpacity
                      onPress={() => setSelectedCategory(item)}
                      style={{ 
                        paddingHorizontal: 20, 
                        paddingVertical: 10, 
                        borderRadius: 14, 
                        backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.06)'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#000' : 'rgba(236,231,223,0.5)', textTransform: 'capitalize' }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <AlertCard 
                item={item} 
                onPress={() => {
                  if (item.url) {
                    if (Platform.OS === 'web') {
                      window.open(item.url, '_blank');
                    } else {
                      require('react-native').Linking.openURL(item.url);
                    }
                  }
                }} 
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Lucide.ShieldCheck size={48} color="rgba(255,255,255,0.1)" strokeWidth={1.5} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>All systems stable. No active alerts.</Text>
            </View>
          }
        />
      )}
    </Screen>
  );
};

export default DisasterAlertsScreen;
