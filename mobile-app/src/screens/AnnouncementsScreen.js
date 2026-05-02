import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, RefreshControl, FlatList, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Row, Col, Heading, Container, Section, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';

// Sub-components
import { AnnouncementCard } from '../components/Announcements/AnnouncementCard';
import { AnnouncementModal } from '../components/Announcements/AnnouncementModal';
import { TacticalQuickActions } from '../components/Home/TacticalComponents';

const AnnouncementsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Store
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    audience: 'all'
  });

  useEffect(() => {
    checkUserRole();
    fetchAnnouncements();
  }, []);

  const checkUserRole = async () => {
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      if (session) {
        const user = JSON.parse(session);
        setUserRole(user.role);
      }
    } catch (e) { }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${API_URL}/list-announcements.php?limit=100`, {
        headers: { 'X-Role': userRole || 'guest' }
      });
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.announcements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [userRole]);

  const handleSaveAnnouncement = async () => {
    if (!formData.title || !formData.message) {
      return;
    }
    setSaving(true);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const user = session ? JSON.parse(session) : {};
      const endpoint = isEditing ? 'update-announcement.php' : 'create-announcement.php';
      const payload = {
        ...formData,
        id: editId,
        brgy_name: user.role === 'brgy' ? (user.barangay || user.brgy_name) : null
      };

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setModalVisible(false);
        fetchAnnouncements();
        setFormData({ title: '', message: '', type: 'info', audience: 'all' });
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = (id) => {
    fetch(`${API_URL}/delete-announcement.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(() => fetchAnnouncements());
  };

  const filters = ['All', 'Warnings', 'Critical', 'Info'];
  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;
    
    // Filter by category
    if (selectedFilter !== 'All') {
        const typeMap = { 'Warnings': 'warning', 'Critical': 'error', 'Info': 'info' };
        filtered = filtered.filter(item => item.type === typeMap[selectedFilter]);
    }

    // Filter by search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => 
            item.title?.toLowerCase().includes(query) || 
            item.message?.toLowerCase().includes(query)
        );
    }

    return filtered;
  }, [announcements, selectedFilter, searchQuery]);

  const insets = useSafeAreaInsets();

  return (
    <Screen ornamentIntensity={0.6} style={{ backgroundColor: '#080808' }}>
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
              <Lucide.Megaphone size={16} color="#F5B235" strokeWidth={2.1} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#F4F0E8', fontFamily: DS_FONT_UI }}>News & Updates</Text>
          </Row>

          <Row gap={10}>
            <TouchableOpacity
              style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.06)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
              }}
            >
              <Lucide.Share2 size={18} color="#F4F0E8" strokeWidth={2.2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: 'rgba(255,255,255,0.06)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
              }}
            >
              <Lucide.Bookmark size={18} color="#F4F0E8" strokeWidth={2.2} />
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
          data={filteredAnnouncements}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
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
                    placeholder="Search news or safety tips..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ flex: 1, marginLeft: 12, color: '#FFF', fontSize: 13, fontWeight: '500', fontFamily: DS_FONT_UI }}
                  />
                </View>
              </View>

              {/* Categories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
              >
                {filters.map((filter) => {
                  const isSelected = selectedFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      style={{ 
                        paddingHorizontal: 20, 
                        paddingVertical: 10, 
                        borderRadius: 14, 
                        backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                        borderWidth: 1,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.06)'
                      }}
                      onPress={() => setSelectedFilter(filter)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#000' : 'rgba(236,231,223,0.5)', textTransform: 'capitalize' }}>
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 50 }}
              style={{ paddingHorizontal: 16 }}
            >
              <AnnouncementCard 
                item={item} 
                isAdmin={userRole === 'admin' || userRole === 'brgy'} 
                onEdit={(a) => {
                  setIsEditing(true);
                  setEditId(a.id);
                  setFormData({ title: a.title, message: a.message, type: a.type, audience: a.audience });
                  setModalVisible(true);
                }} 
                onDelete={handleDeleteAnnouncement} 
              />
            </MotiView>
          )}
              ListEmptyComponent={
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <Lucide.MegaphoneOff size={48} color={theme.border} strokeWidth={1.5} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted, marginTop: 16 }}>No active news found.</Text>
                </View>
              }
        />
      )}

              {(userRole === 'admin' || userRole === 'brgy') && (
                <MotiView
                  from={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ position: 'absolute', bottom: 30, right: 20 }}
                >
                  <TouchableOpacity
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 22,
                      backgroundColor: theme.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...theme.shadows.md
                    }}
                    onPress={() => {
                      setIsEditing(false);
                      setModalVisible(true);
                      setFormData({ title: '', message: '', type: 'info', audience: 'all' });
                    }}
                  >
                    <Lucide.Plus size={32} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </MotiView>
              )}

              <AnnouncementModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                formData={formData}
                setFormData={setFormData}
                onSave={handleSaveAnnouncement}
                saving={saving}
                isEditing={isEditing}
              />
            </Screen>
  );
};

      export default AnnouncementsScreen;
