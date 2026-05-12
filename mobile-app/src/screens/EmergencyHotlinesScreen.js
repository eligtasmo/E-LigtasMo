import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '../context/ThemeContext';
import { Screen, Container, Card, Row, Col, Badge, Heading, PrimaryButton } from '../components/DesignSystem';
import { API_URL } from '../config';
import { AuthService } from '../services/AuthService';

const EmergencyHotlinesScreen = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [hotlines, setHotlines] = useState([]);
  const [personalContacts, setPersonalContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Admin State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });

  const [categories, setCategories] = useState(['All']);
  const isAdmin = user?.role === 'admin' || user?.role === 'mmdrmo' || user?.role === 'coordinator';
  const isBrgy = user?.role === 'brgy' || user?.role === 'brgy_chair';

  useEffect(() => {
    loadUser();
    fetchPersonalContacts();
  }, []);

  useEffect(() => {
    if (user) {
      fetchHotlines();
    }
  }, [user]);

  const loadUser = async () => {
    const data = await AuthService.checkSession();
    setUser(data);
  };

  const fetchHotlines = async () => {
    setLoading(true);
    try {
      const brgy = user?.brgy_name || '';
      const response = await fetch(`${API_URL}/hotlines-list.php?brgy=${encodeURIComponent(brgy)}`);
      const data = await response.json();
      if (data.success) {
        setHotlines(data.data);
        if (data.categories) {
          setCategories(['All', ...data.categories]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalContacts = async () => {
    try {
      const session = await AuthService.checkSession();
      if (!session) return;
      const brgy = session.brgy_name || '';
      const userId = session.id || '';
      
      const response = await fetch(`${API_URL}/contacts-list.php?brgy=${brgy}&user_id=${userId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setPersonalContacts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.number) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const endpoint = editingItem ? 'hotlines-update.php' : 'hotlines-add.php';
    
    // Logic: Brgy officials only add to "Barangay" category
    const finalCategory = isBrgy ? 'Barangay' : formData.category;
    const payload = {
        ...formData,
        category: finalCategory,
        brgy_name: isBrgy ? user?.brgy_name : null,
        id: editingItem?.id
    };

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setEditingItem(null);
        setFormData({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });
        fetchHotlines();
      } else {
        Alert.alert('Error', data.message || 'Failed to save');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this hotline?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/hotlines-delete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
              });
              const data = await response.json();
              if (data.success) fetchHotlines();
            } catch (e) {}
          }
        }
      ]
    );
  };

  const filteredHotlines = hotlines.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.number.includes(search);
    const matchesCategory = selectedCategory === 'All' || h.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const canManage = isAdmin || isBrgy;

  return (
    <Screen style={{ backgroundColor: '#191A1A' }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        
        {/* Header */}
        <Container style={{ paddingVertical: 16 }}>
          <Row align="center" justify="space-between">
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.headerBackBtn}
            >
              <Lucide.ChevronLeft size={22} color="#F4F0E8" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#F4F0E8', letterSpacing: -0.4 }}>Emergency Hotlines</Text>
            <View style={{ width: 44 }} />
          </Row>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Lucide.Search size={18} color="rgba(255,255,255,0.3)" strokeWidth={2.5} />
            <TextInput 
              placeholder="Search" 
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={search}
              onChangeText={setSearch}
              style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#F4F0E8', fontWeight: '500' }}
            />
          </View>

          {/* Categories */}
          <Row align="center" gap={8} style={{ marginTop: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryBtn,
                    { 
                      backgroundColor: selectedCategory === cat ? '#F6F2EB' : 'rgba(255,255,255,0.04)',
                      borderColor: selectedCategory === cat ? '#F6F2EB' : 'rgba(255,255,255,0.06)'
                    }
                  ]}
                >
                  <Text style={{ fontWeight: '700', fontSize: 12, color: selectedCategory === cat ? '#2A231C' : 'rgba(255,255,255,0.4)' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.categoryChevron}>
              <Lucide.ChevronDown size={18} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
            </TouchableOpacity>
          </Row>
        </Container>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#F59E0B" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            <Container>
              {/* Hotline Grid */}
              <View style={styles.hotlineGrid}>
                {filteredHotlines.map(item => {
                  const Icon = Lucide[item.icon] || Lucide.Phone;
                  return (
                    <Card key={item.id} variant="none" noPadding style={styles.hotlineCard}>
                      <View style={{ padding: 12 }}>
                        {canManage && (
                          <Row justify="flex-end" gap={8} style={{ position: 'absolute', top: 6, right: 6, zIndex: 10 }}>
                            <TouchableOpacity onPress={() => {
                              setEditingItem(item);
                              setFormData({ name: item.name, number: item.number, category: item.category, icon: item.icon });
                              setShowModal(true);
                            }}>
                              <Lucide.Edit2 size={12} color="#F59E0B" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                              <Lucide.Trash2 size={12} color="#EF4444" />
                            </TouchableOpacity>
                          </Row>
                        )}
                        <Row align="center" gap={10} style={{ marginBottom: 12 }}>
                          <View style={styles.logoContainer}>
                            {item.image_url ? (
                              <RNImage source={{ uri: item.image_url }} style={{ width: 32, height: 32 }} resizeMode="contain" />
                            ) : (
                              <Icon size={24} color={item.category === 'Fire' ? '#FF4B2B' : item.category === 'Medical' ? '#EF4444' : '#2563EB'} strokeWidth={2} />
                            )}
                          </View>
                          <Col style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#F4F0E8' }} numberOfLines={2}>{item.name}</Text>
                          </Col>
                        </Row>
                        <Row align="center" gap={6} style={{ marginBottom: 12 }}>
                          <Lucide.Phone size={14} color="#FFF" strokeWidth={2.5} />
                          <Col>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFF' }}>{item.number}</Text>
                            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>8723-0401</Text>
                          </Col>
                        </Row>
                        <Row justify="space-between" align="center">
                          <TouchableOpacity 
                            onPress={() => {
                              Clipboard.setStringAsync(item.number);
                              Alert.alert('Copied', 'Number copied to clipboard');
                            }}
                            style={styles.actionBtnSmall}
                          >
                            <Lucide.Copy size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => Linking.openURL(`tel:${item.number}`)}
                            style={[styles.actionBtnSmall, { backgroundColor: '#FFFFFF', flex: 1, marginLeft: 10 }]}
                          >
                            <Lucide.PhoneCall size={18} color="#000000" strokeWidth={2.5} />
                            <Text style={{ marginLeft: 8, fontWeight: '800', fontSize: 13, color: '#000' }}>CALL</Text>
                          </TouchableOpacity>
                        </Row>
                      </View>
                    </Card>
                  );
                })}
              </View>

            </Container>
          </ScrollView>
        )}

        {/* FAB for Admin/Brgy */}
        {canManage && (
          <TouchableOpacity 
            onPress={() => {
              setEditingItem(null);
              setFormData({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });
              setShowModal(true);
            }}
            style={styles.fab}
          >
             <Lucide.Plus size={32} color="#FFF" strokeWidth={3} />
          </TouchableOpacity>
        )}

        {/* Admin Modal */}
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Heading size="md" style={{ marginBottom: 20 }}>{editingItem ? 'Edit Hotline' : 'Add New Hotline'}</Heading>
              
              <Text style={styles.label}>Name</Text>
              <TextInput 
                style={styles.input} 
                value={formData.name} 
                onChangeText={(t) => setFormData({...formData, name: t})} 
                placeholder="e.g. Brgy. Hall"
                placeholderTextColor="#555"
              />

              <Text style={styles.label}>Number</Text>
              <TextInput 
                style={styles.input} 
                value={formData.number} 
                onChangeText={(t) => setFormData({...formData, number: t})} 
                placeholder="e.g. 911"
                placeholderTextColor="#555"
              />

              {isAdmin && (
                <>
                  <Text style={styles.label}>Category</Text>
                  <Row gap={8} style={{ marginBottom: 20 }}>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <TouchableOpacity 
                        key={cat} 
                        onPress={() => setFormData({...formData, category: cat})}
                        style={[styles.smallBtn, formData.category === cat && { backgroundColor: theme.primary }]}
                      >
                        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </Row>
                </>
              )}

              <Row gap={12} justify="flex-end">
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.cancelBtn}>
                  <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </Row>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Screen>
  );
};

const styles = StyleSheet.create({
   headerBackBtn: {
      width: 44, height: 44, borderRadius: 22, 
      backgroundColor: 'rgba(255,255,255,0.06)', 
      alignItems: 'center', justifyContent: 'center', 
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   headerIconBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.06)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   sosBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: '#EF4444',
      justifyContent: 'center', alignItems: 'center',
      boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
   },
   searchBar: {
      marginTop: 24, flexDirection: 'row', alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, 
      paddingHorizontal: 16, height: 52, borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.06)'
   },
   categoryBtn: {
      paddingHorizontal: 14, paddingVertical: 6, 
      borderRadius: 18, borderWidth: 1,
      minWidth: 60, alignItems: 'center', justifyContent: 'center'
   },
   hotlineGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12
   },
   hotlineCard: {
      width: '48.5%', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
      backgroundColor: '#161616'
   },
   logoContainer: {
      width: 52, height: 52, borderRadius: 14, 
      backgroundColor: 'rgba(255,255,255,0.03)', 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   categoryChevron: {
      width: 36, height: 36, borderRadius: 18, 
      backgroundColor: 'rgba(255,255,255,0.05)', 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   actionBtnSmall: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   fab: {
      position: 'absolute', bottom: 32, right: 24, 
      width: 56, height: 56, borderRadius: 28, 
      backgroundColor: '#F59E0B', justifyContent: 'center', 
      alignItems: 'center', boxShadow: '0 6px 15px rgba(0,0,0,0.3)', elevation: 5
   },
   modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20
   },
   modalContent: {
      backgroundColor: '#1C1C1E', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
   },
   label: {
      color: 'rgba(242,238,230,0.4)', fontWeight: '600', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1
   },
   input: {
      backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#FFF', fontWeight: '600', fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
   },
   smallBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center'
   },
   saveBtn: {
      backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10
   },
   cancelBtn: {
      paddingHorizontal: 16, paddingVertical: 10
   }
});

export default EmergencyHotlinesScreen;
