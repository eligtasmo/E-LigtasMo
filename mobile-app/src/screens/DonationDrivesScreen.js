import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image as RNImage, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Dimensions, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Screen, TacticalCard, Row, Col, Heading, Badge, Divider, 
  IconBox, Container, PrimaryButton, useResponsive,
  DS_FONT_UI, DS_FONT_INPUT,
  DS_TACTICAL, ValidationInput
} from '../components/DesignSystem';
import { TacticalHeader } from '../components/Home/TacticalComponents';

const { width } = Dimensions.get('window');
const CATEGORIES = ['All', 'Foods', 'Medical', 'Financial'];

const DonationDriveCard = ({ drive, onPress, onDonate, isAdmin, onEdit, onDelete }) => {
  const { theme } = useTheme();
  const percentage = Math.min(100, drive.percentage || 70);
  const goalText = `P${(drive.current_amount || 0).toLocaleString()} / P${(drive.target_amount || 0).toLocaleString()}`;

  return (
    <TacticalCard 
      style={{ marginBottom: 16 }} 
      noPadding
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ padding: 16 }}>
        {/* Top Info Header */}
        <Row align="center" justify="space-between" style={{ marginBottom: 16 }}>
          <Row align="center" gap={14} style={{ flex: 1 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
               <Lucide.HeartPulse size={20} color="#000" fill="#000" />
            </View>
            <Col style={{ flex: 1 }}>
              <Row align="flex-start" justify="space-between">
                <Heading size="sm" style={{ color: '#F4F0E8', fontSize: 11.5, fontWeight: '500', letterSpacing: -0.2, flex: 1, marginRight: 12 }}>{drive.title}</Heading>
              </Row>
              <Row align="center" justify="space-between" style={{ marginTop: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, fontWeight: '400', fontFamily: DS_FONT_INPUT, flex: 1, marginRight: 8 }} numberOfLines={1}>
                  {drive.description || 'Raising emergency food packs for 300 families...'}
                </Text>
                {drive.urgent === 1 && (
                  <Text style={{ color: '#F5B235', fontSize: 8.5, fontWeight: '600', fontFamily: DS_FONT_UI }}>Urgent</Text>
                )}
              </Row>
            </Col>
          </Row>
        </Row>

        {/* Mission Imagery: Single Hero Layout */}
        <View style={{ height: 180, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 16 }}>
           <RNImage 
             source={{ uri: drive.image_url || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=2070&auto=format&fit=crop' }} 
             style={{ width: '100%', height: '100%' }} 
             resizeMode="cover" 
           />
           <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />
        </View>

        {/* Action Buttons */}
        <Row gap={12} style={{ marginBottom: 12 }}>
          <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.8}
            style={{ 
              flex: 1, height: 38, borderRadius: 19, backgroundColor: isAdmin ? 'rgba(255,255,255,0.06)' : '#FFFFFF', 
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Text style={{ color: isAdmin ? '#FFF' : '#000', fontWeight: '500', fontSize: 11, fontFamily: DS_FONT_UI }}>{isAdmin ? 'View' : 'View Details'}</Text>
          </TouchableOpacity>
          
          {isAdmin ? (
            <Row gap={8} style={{ flex: 2 }}>
              <TouchableOpacity 
                onPress={onEdit}
                style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
              >
                 <Lucide.Edit2 size={14} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onDelete}
                style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' }}
              >
                 <Lucide.Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </Row>
          ) : (
            <TouchableOpacity 
              onPress={onDonate}
              activeOpacity={0.8}
              style={{ 
                flex: 1, height: 38, borderRadius: 19, borderWidth: 1, 
                borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.03)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                 <Lucide.Heart size={10} color="#FFF" fill="#FFF" strokeWidth={3} />
              </View>
              <Text style={{ color: '#FFF', fontWeight: '500', fontSize: 11, fontFamily: DS_FONT_UI }}>Donate Now</Text>
            </TouchableOpacity>
          )}
        </Row>

        {/* Tactical Progress Pill */}
        <View style={{ 
          backgroundColor: 'rgba(255,255,255,0.04)', 
          height: 48, 
          borderRadius: 24, 
          borderWidth: 1, 
          borderColor: 'rgba(255,255,255,0.08)',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          marginBottom: 8
        }}>
          <Row align="center" style={{ flex: 1 }}>
            <Lucide.Wallet size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
            <Text style={{ color: '#F4F0E8', fontSize: 13, fontWeight: '700', marginLeft: 10, fontFamily: DS_FONT_UI }}>
              {goalText}
            </Text>
          </Row>
          <View style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 }} />
          <Text style={{ color: '#F5B235', fontWeight: '800', fontSize: 11, fontFamily: DS_FONT_UI }}>{Math.round(percentage)}%</Text>
        </View>

        {/* Footer Snapshot */}
        <Row justify="center" style={{ marginTop: 0 }}>
           <Text style={{ color: '#F5B235', fontSize: 9, fontWeight: '700', fontFamily: DS_FONT_UI }}>{Math.round(percentage)}% of goal reached</Text>
        </Row>
      </TouchableOpacity>
    </TacticalCard>
  );
};

const DonationDrivesScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { safeTop } = useResponsive();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drives, setDrives] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDrive, setEditingDrive] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_amount: '',
    category: 'Foods',
    image_url: '',
    end_date: '',
    urgent: false
  });

  const isAdmin = user?.role === 'Admin';

  const handleSave = async () => {
    try {
      const resp = await fetch(`${API_URL}/save-donation-drive.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingDrive?.id })
      });
      const data = await resp.json();
      if (data.success) {
        setShowModal(false);
        setEditingDrive(null);
        fetchDrives();
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this relief mission permanently?')) return;
    try {
      const resp = await fetch(`${API_URL}/delete-donation-drive.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await resp.json();
      if (data.success) fetchDrives();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const fetchDrives = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/list-donation-drives.php`);
      const data = await resp.json();
      if (data.success) {
        setDrives(data.drives);
      }
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const filteredDrives = drives.filter(d => {
    const matchCategory = activeCategory === 'All' || d.category === activeCategory;
    const matchSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Container style={{ paddingTop: 16, flex: 1 }}>
          
           <TacticalHeader 
              title="Donation Hub" 
              showBack
              hideSubtitle
           />

           {/* Admin Quick Action */}
           {isAdmin && (
             <TouchableOpacity 
               onPress={() => {
                 setEditingDrive(null);
                 setFormData({ title: '', description: '', target_amount: '', category: 'Foods', image_url: '', end_date: '', urgent: false });
                 setShowModal(true);
               }} 
               style={{ 
                 marginTop: 16, height: 46, borderRadius: 23, 
                 backgroundColor: 'rgba(245,178,53,0.1)', borderWidth: 1, borderColor: 'rgba(245,178,53,0.3)',
                 flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10
               }}
             >
               <Lucide.PlusCircle size={18} color="#F5B235" />
               <Text style={{ color: '#F5B235', fontWeight: '700', fontSize: 13 }}>Launch New Mission</Text>
             </TouchableOpacity>
           )}

           {/* Search Bar */}
           <View style={{ 
             marginTop: 16,
             flexDirection: 'row', 
             alignItems: 'center', 
             backgroundColor: 'rgba(26,22,18,0.92)', 
             borderRadius: 25, 
             paddingHorizontal: 18, 
             height: 50, 
             marginBottom: 16,
             borderWidth: 1,
             borderColor: 'rgba(255,255,255,0.08)'
           }}>
             <Lucide.Search size={18} color="rgba(255,255,255,0.4)" strokeWidth={2} />
             <TextInput 
               placeholder="Search active relief drives..." 
               placeholderTextColor="rgba(255,255,255,0.3)"
               value={searchQuery}
               onChangeText={setSearchQuery}
               style={{ flex: 1, marginLeft: 10, color: '#FFF', fontSize: 13, fontWeight: '500', fontFamily: DS_FONT_UI }}
             />
             <Lucide.SlidersHorizontal size={18} color="rgba(255,255,255,0.4)" />
           </View>

          <View style={{ height: 38, marginBottom: 16 }}>
            <FlatList 
              horizontal 
              data={CATEGORIES}
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => {
                const isSelected = activeCategory === item;
                return (
                  <TouchableOpacity
                    onPress={() => setActiveCategory(item)}
                    style={{ 
                      paddingHorizontal: 18, 
                      height: 34,
                      borderRadius: 17, 
                      backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.10)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.14)'
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? '#000' : 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        <FlatList
          data={filteredDrives}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDrives(); }} tintColor="#F5B235" />}
          renderItem={({ item }) => (
            <DonationDriveCard 
              drive={item} 
              isAdmin={isAdmin}
              onPress={() => navigation.navigate('DonationDriveDetails', { id: item.id })} 
              onDonate={() => navigation.navigate('DonationPayment', { drive: item })}
              onEdit={() => {
                setEditingDrive(item);
                setFormData({ ...item, urgent: item.urgent === 1 });
                setShowModal(true);
              }}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={{ alignItems: 'center', marginTop: 100 }}>
                <ActivityIndicator color="#F5B235" />
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 100 }}>
                 <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: 12 }}>No active drives found</Text>
              </View>
            )
          }
        />
      </Container>

      {/* Admin Management Modal */}
      <AnimatePresence>
        {showModal && (
          <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { zIndex: 2000, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ width: '90%', maxWidth: 450, backgroundColor: '#151210', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Heading size="md" style={{ color: '#FFF', marginBottom: 20 }}>{editingDrive ? 'Edit Relief Mission' : 'New Relief Mission'}</Heading>
              
              <ScrollView style={{ maxHeight: 500 }}>
                <ValidationInput label="Mission Title" style={{ marginBottom: 16 }}>
                  <TextInput 
                    value={formData.title} 
                    onChangeText={t => setFormData({...formData, title: t})}
                    placeholder="Enter title..." 
                    placeholderTextColor="#444"
                    style={{ color: '#FFF', height: 44 }}
                  />
                </ValidationInput>

                <ValidationInput label="Description" style={{ marginBottom: 16 }}>
                  <TextInput 
                    value={formData.description} 
                    onChangeText={t => setFormData({...formData, description: t})}
                    placeholder="Enter details..." 
                    placeholderTextColor="#444"
                    multiline
                    style={{ color: '#FFF', height: 80, textAlignVertical: 'top' }}
                  />
                </ValidationInput>

                <Row gap={12} style={{ marginBottom: 16 }}>
                  <ValidationInput label="Goal (PHP)" style={{ flex: 1 }}>
                    <TextInput 
                      value={formData.target_amount} 
                      onChangeText={t => setFormData({...formData, target_amount: t})}
                      keyboardType="numeric"
                      placeholder="50000" 
                      placeholderTextColor="#444"
                      style={{ color: '#FFF', height: 44 }}
                    />
                  </ValidationInput>
                  <ValidationInput label="Deadline (YYYY-MM-DD)" style={{ flex: 1 }}>
                    <TextInput 
                      value={formData.end_date} 
                      onChangeText={t => setFormData({...formData, end_date: t})}
                      placeholder="2024-12-31" 
                      placeholderTextColor="#444"
                      style={{ color: '#FFF', height: 44 }}
                    />
                  </ValidationInput>
                </Row>

                <ValidationInput label="Image URL" style={{ marginBottom: 20 }}>
                  <TextInput 
                    value={formData.image_url} 
                    onChangeText={t => setFormData({...formData, image_url: t})}
                    placeholder="https://..." 
                    placeholderTextColor="#444"
                    style={{ color: '#FFF', height: 44 }}
                  />
                </ValidationInput>
              </ScrollView>

              <Row gap={12}>
                <PrimaryButton 
                  title="Cancel" 
                  onPress={() => setShowModal(false)} 
                  variant="gray" 
                  style={{ flex: 1 }} 
                />
                <PrimaryButton 
                  title="Save Mission" 
                  onPress={handleSave} 
                  variant="tactical" 
                  style={{ flex: 1 }} 
                />
              </Row>
            </MotiView>
          </View>
        )}
      </AnimatePresence>

      </SafeAreaView>
    </Screen>
  );
};

export default DonationDrivesScreen;
