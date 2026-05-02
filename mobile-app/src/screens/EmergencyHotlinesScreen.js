import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Platform, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '../context/ThemeContext';
import { Screen, Container, Card, Row, Col, Badge, Heading, PrimaryButton } from '../components/DesignSystem';
import { API_URL } from '../config';
import { AuthService } from '../services/AuthService';

const CATEGORIES = ['All', 'Medical', 'Fire', 'Police'];

const EmergencyHotlinesScreen = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Admin State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', number: '', category: 'Medical', icon: 'HeartPulse' });

  useEffect(() => {
    loadUser();
    fetchHotlines();
  }, []);

  const loadUser = async () => {
    const data = await AuthService.checkSession();
    setUser(data);
  };

  const fetchHotlines = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/hotlines-list.php`);
      const data = await response.json();
      if (data.success) {
        setHotlines(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.number) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const endpoint = editingItem ? 'hotlines-update.php' : 'hotlines-add.php';
    const payload = editingItem ? { ...formData, id: editingItem.id } : formData;

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

  const isAdmin = user?.role === 'admin' || user?.role === 'brgy_chair' || user?.role === 'mmdrmo';

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
            <Row gap={10}>
               <TouchableOpacity style={styles.headerIconBtn}>
                  <Lucide.History size={20} color="#F4F0E8" strokeWidth={2.2} />
               </TouchableOpacity>
               <TouchableOpacity style={styles.sosBtn}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 10 }}>SOS</Text>
               </TouchableOpacity>
            </Row>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {CATEGORIES.map(cat => (
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
                      <View style={{ padding: 14 }}>
                        {isAdmin && (
                          <Row justify="flex-end" gap={8} style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                            <TouchableOpacity onPress={() => {
                              setEditingItem(item);
                              setFormData({ name: item.name, number: item.number, category: item.category, icon: item.icon });
                              setShowModal(true);
                            }}>
                              <Lucide.Edit2 size={14} color="#F59E0B" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                              <Lucide.Trash2 size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </Row>
                        )}
                        <Row align="center" gap={10} style={{ marginBottom: 10 }}>
                          <View style={styles.iconContainer}>
                            <Icon size={18} color={item.category === 'Fire' ? '#FF7A2F' : item.category === 'Medical' ? '#FF4B5F' : '#5AA5FF'} strokeWidth={2.5} />
                          </View>
                          <Col style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#F4F0E8' }} numberOfLines={1}>{item.name}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(242,238,230,0.4)', letterSpacing: 0.5 }}>
                               {item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()}
                             </Text>
                          </Col>
                        </Row>
                        <Row align="center" gap={6}>
                          <Lucide.Phone size={10} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                          <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.4)', flex: 1 }}>{item.number}</Text>
                        </Row>
                        <Row justify="flex-end" gap={10} style={{ marginTop: 14 }}>
                          <TouchableOpacity style={styles.actionBtn}><Lucide.Copy size={16} color="rgba(255,255,255,0.4)" strokeWidth={2.2} /></TouchableOpacity>
                          <TouchableOpacity style={styles.actionBtn}><Lucide.MessageSquare size={16} color="rgba(255,255,255,0.4)" strokeWidth={2.2} /></TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFFFFF' }]}><Lucide.Phone size={16} color="#000000" strokeWidth={3} /></TouchableOpacity>
                        </Row>
                      </View>
                    </Card>
                  );
                })}
              </View>

              {/* Personal Contacts Section */}
              <Row justify="space-between" align="center" style={{ marginTop: 32, marginBottom: 16 }}>
                 <Text style={{ fontSize: 18, fontWeight: '600', color: '#F4F0E8', letterSpacing: -0.4 }}>Personal Contacts</Text>
                 <TouchableOpacity><Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 13 }}>See All</Text></TouchableOpacity>
              </Row>
            </Container>
          </ScrollView>
        )}

        {/* FAB for Admin */}
        {isAdmin && (
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

              <Text style={styles.label}>Category</Text>
              <Row gap={8} style={{ marginBottom: 20 }}>
                {['Medical', 'Fire', 'Police'].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    onPress={() => setFormData({...formData, category: cat})}
                    style={[styles.smallBtn, formData.category === cat && { backgroundColor: theme.primary }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </Row>

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
   iconContainer: {
      width: 38, height: 38, borderRadius: 10, 
      backgroundColor: 'rgba(255,255,255,0.03)', 
      justifyContent: 'center', alignItems: 'center', 
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
   },
   actionBtn: {
      width: 38, height: 38, borderRadius: 19,
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
