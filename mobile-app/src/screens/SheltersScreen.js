import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Card, Row, Col, Heading, Container, Section } from '../components/DesignSystem';
import { SearchPanel } from '../components/shared/PrimitiveLayouts';

// Sub-components
import { ShelterStats, ShelterCard } from '../components/Shelters/ShelterComponents';
import { ShelterEditModal, ShelterCreateModal } from '../components/Shelters/ShelterModals';

const SheltersScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();

  // State
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('resident');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals & Forms
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'Open', occupancy: '0', capacity: '0' });
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', address: '', capacity: '', status: 'Open', category: 'Evacuation Center', lat: '14.2766', lng: '121.4167' });
  
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUserRole();
    fetchShelters();
  }, []);

  const fetchUserRole = async () => {
    const session = await AsyncStorage.getItem('CURRENT_USER');
    if (session) {
      const user = JSON.parse(session);
      setUserRole(user.role ? user.role.toLowerCase() : 'resident');
    }
  };

  const fetchShelters = async () => {
    try {
      const resp = await fetch(`${API_URL}/shelters.php`);
      const data = await resp.json();
      const list = Array.isArray(data) ? data : (data?.shelters || []);
      setShelters(list);
    } catch (e) {} finally { setLoading(false); setRefreshing(false); }
  };

  const filteredShelters = useMemo(() => {
    let data = shelters;
    if (statusFilter !== 'All') data = data.filter(s => (s.status || '').toLowerCase() === statusFilter.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(s => (s.name || '').toLowerCase().includes(q) || (s.address || '').toLowerCase().includes(q));
    }
    return data;
  }, [shelters, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: shelters.length,
    available: shelters.reduce((acc, s) => acc + Math.max(0, (parseInt(s.capacity) || 0) - (parseInt(s.occupancy) || 0)), 0),
    open: shelters.filter(s => s.status === 'Open').length
  }), [shelters]);

  const handleUpdate = async () => {
    setProcessing(true);
    try {
      const payload = { ...selectedShelter, status: editForm.status, occupancy: parseInt(editForm.occupancy), capacity: parseInt(editForm.capacity) };
      const res = await fetch(`${API_URL}/shelters-update.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { Alert.alert('Protocol Success', 'Shelter telemetry synchronized.'); setEditModalVisible(false); fetchShelters(); }
    } catch (e) {} finally { setProcessing(false); }
  };

  const handleDelete = () => {
    Alert.alert("Decommission Shelter", "Are you certain you wish to remove this resource node?", [
      { text: "Abort", style: 'cancel' },
      { text: "Confirm", style: "destructive", onPress: async () => {
        setProcessing(true);
        try {
          const res = await fetch(`${API_URL}/shelters-delete.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedShelter.id }) });
          if (res.ok) { setEditModalVisible(false); fetchShelters(); }
        } catch (e) {} finally { setProcessing(false); }
      }}
    ]);
  };

  const handleCreate = async () => {
    if (!createForm.name) return;
    setProcessing(true);
    try {
      const payload = { ...createForm, occupancy: 0, capacity: parseInt(createForm.capacity) || 0, lat: parseFloat(createForm.lat), lng: parseFloat(createForm.lng) };
      const res = await fetch(`${API_URL}/shelters-add.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setCreateModalVisible(false); fetchShelters(); }
    } catch (e) {} finally { setProcessing(false); }
  };

  return (
    <Screen ornamentIntensity={0.6}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <Container>
           <Row align="center" style={{ paddingVertical: 16 }}>
             <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
               <Lucide.ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
             </TouchableOpacity>
             <Col style={{ flex: 1, marginLeft: 8 }}>
               <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 2 }}>Resource Management</Text>
               <Heading size="md" style={{ marginTop: 2 }}>Shelter Operations</Heading>
             </Col>
             {(['admin', 'captain', 'brgy'].includes(userRole)) && (
               <TouchableOpacity 
                 onPress={() => setCreateModalVisible(true)} 
                 style={{ 
                   width: 44, 
                   height: 44, 
                   borderRadius: 14, 
                   backgroundColor: theme.primary, 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   ...theme.shadows.glow
                 }}
               >
                 <Lucide.Plus size={24} color="#fff" strokeWidth={3} />
               </TouchableOpacity>
             )}
           </Row>
        </Container>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchShelters(); }} tintColor={theme.primary} />}
      >
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}>
          
          <SearchPanel 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            placeholder="Query resource nodes..." 
            style={{ marginBottom: 20 }} 
          />

          <ShelterStats {...stats} />

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ gap: 10, marginBottom: 24, paddingRight: 40 }}
          >
            {['All', 'Open', 'Full', 'Closed'].map(s => {
              const isActive = statusFilter === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={{ 
                    paddingHorizontal: 18, 
                    paddingVertical: 10, 
                    borderRadius: 12, 
                    borderWidth: 1.5, 
                    borderColor: isActive ? theme.primary : theme.glassBorder, 
                    backgroundColor: isActive ? theme.primary : theme.glassBackground 
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#fff' : theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loading ? (
             <View style={{ padding: 60, alignItems: 'center' }}>
               <ActivityIndicator size="large" color={theme.primary} />
               <Text style={{ marginTop: 16, color: theme.textMuted, fontWeight: '700' }}>Polling resource availability...</Text>
             </View>
          ) : (
             filteredShelters.map((item, idx) => (
                <MotiView 
                  key={item.id} 
                  from={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ delay: idx * 50 }}
                >
                  <ShelterCard 
                    shelter={item} 
                    userRole={userRole} 
                    onLocate={() => navigation.navigate('HazardMap', { shelter: item })} 
                    onUpdate={() => { setSelectedShelter(item); setEditForm({ status: item.status, occupancy: String(item.occupancy), capacity: String(item.capacity) }); setEditModalVisible(true); }}
                  />
                </MotiView>
             ))
          )}

          {filteredShelters.length === 0 && !loading && (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <Lucide.SearchX size={48} color={theme.border} strokeWidth={1.5} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textMuted, marginTop: 16 }}>No matching nodes identified.</Text>
            </View>
          )}

        </MotiView>
      </ScrollView>

      <ShelterEditModal 
        visible={editModalVisible} 
        onClose={() => setEditModalVisible(false)} 
        shelter={selectedShelter}
        form={editForm}
        setForm={setEditForm}
        onSave={handleUpdate}
        onDelete={handleDelete}
        saving={processing}
      />

      <ShelterCreateModal 
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        form={createForm}
        setForm={setCreateForm}
        onSave={handleCreate}
        saving={processing}
      />
    </Screen>
  );
};

export default SheltersScreen;
