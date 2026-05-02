import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image as RNImage, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Screen, Card, TacticalCard, Row, Col, Heading, Badge, Container,
  DS_FONT_UI
} from '../components/DesignSystem';

import TacticalBottomNav from '../components/Navigation/TacticalBottomNav';
import { TacticalHeader } from '../components/Home/TacticalComponents';

const FamilyMemberCard = ({ member, theme }) => {
  const isSafe = member.status === 'Safe';
  const needsHelp = member.status === 'Needs Help';
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${isSafe ? '22c55e' : 'ef4444'}(${member.longitude},${member.latitude})/${member.longitude},${member.latitude},14.5,0/400x200?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return (
    <TacticalCard noPadding style={{ marginBottom: 16 }}>
      <View style={{ padding: 14 }}>
        <Row align="center" justify="space-between" style={{ marginBottom: 16 }}>
          <Row align="center" gap={12}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: isSafe ? '#22C55E' : '#EF4444' }}>
              <RNImage source={{ uri: member.profile_image }} style={{ width: '100%', height: '100%' }} />
            </View>
            <View>
              <Text style={{ color: '#F4F0E8', fontWeight: '700', fontSize: 13, fontFamily: DS_FONT_UI }}>{member.name}</Text>
              <Row align="center" gap={6} style={{ marginTop: 2 }}>
                 <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isSafe ? '#22C55E' : '#EF4444' }} />
                 <Text style={{ color: isSafe ? '#22C55E' : '#EF4444', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI }}>
                   {isSafe ? 'Marked Safe' : 'Needs Help'}
                 </Text>
              </Row>
            </View>
          </Row>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'rgba(236,231,223,0.3)', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI }}>10:45 AM</Text>
            <TouchableOpacity style={{ marginTop: 4 }}>
               <Text style={{ color: '#F5B235', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI }}>REQUEST</Text>
            </TouchableOpacity>
          </View>
        </Row>

        <View style={{ height: 140, borderRadius: 18, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <RNImage source={{ uri: mapUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={{ position: 'absolute', top: '50%', left: '50%', width: 100, height: 100, borderRadius: 50, marginLeft: -50, marginTop: -50, backgroundColor: isSafe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', transform: [{ scale: 1.2 }] }} />
        </View>

        <Row gap={12}>
          <TouchableOpacity style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#F4F0E8', fontWeight: '600', fontSize: 11, fontFamily: DS_FONT_UI }}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: isSafe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: isSafe ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: isSafe ? '#22C55E' : '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
               <Lucide.Check size={10} color="#000" strokeWidth={3} />
            </View>
            <Text style={{ color: isSafe ? '#22C55E' : '#EF4444', fontWeight: '700', fontSize: 11, fontFamily: DS_FONT_UI }}>SAFE</Text>
          </TouchableOpacity>
        </Row>
      </View>
    </TacticalCard>
  );
};

const FamilyGroupPanelScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('All');

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/list-family-members.php?user_id=${user?.id || 1}`);
      const data = await resp.json();
      if (data.success) {
        setGroup(data.group);
        setMembers(data.members);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  if (loading) return <Screen style={{ backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#F5B235" size="large" /></Screen>;

  const filteredMembers = members.filter(m => {
    if (filter === 'Safe') return m.status === 'Safe';
    if (filter === 'Needs Help') return m.status === 'Needs Help';
    return true;
  });

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      {/* Tactical Header with Safe Area Padding */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <TacticalHeader 
          title="Group Panel" 
          showBack
        />
      </View>

      <Container style={{ flex: 1, paddingTop: 16 }}>

        <View style={{ height: 24 }} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <Row justify="space-between" align="center" style={{ marginBottom: 20 }}>
            <Text style={{ color: '#F4F0E8', fontWeight: '700', fontSize: 18, fontFamily: DS_FONT_UI }}>{group?.name}</Text>
            <Text style={{ color: 'rgba(236,231,223,0.4)', fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI, letterSpacing: 0.5 }}>Group Members</Text>
          </Row>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginBottom: 32 }}>
             <TouchableOpacity 
               onPress={() => navigation.navigate('AddFamilyMember', { group_id: group?.id })}
               style={{ alignItems: 'center', width: 64 }}
             >
                <View style={{ width: 60, height: 60, borderRadius: 30, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                   <Lucide.Plus size={24} color="rgba(255,255,255,0.4)" />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center', fontFamily: DS_FONT_UI }}>Add{"\n"}Member</Text>
             </TouchableOpacity>

             {members.map(member => (
               <TouchableOpacity key={member.id} style={{ alignItems: 'center', width: 64 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: member.status === 'Safe' ? '#22C55E' : member.status === 'Needs Help' ? '#EF4444' : 'rgba(255,255,255,0.1)', padding: 2 }}>
                     <RNImage source={{ uri: member.profile_image }} style={{ width: '100%', height: '100%', borderRadius: 30 }} />
                     <View style={{ position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: member.status === 'Safe' ? '#22C55E' : member.status === 'Needs Help' ? '#EF4444' : '#666', borderWidth: 2, borderColor: '#191A1A', alignItems: 'center', justifyContent: 'center' }}>
                        <Lucide.SignalHigh size={10} color="#FFF" />
                     </View>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 8, textAlign: 'center', fontFamily: DS_FONT_UI }} numberOfLines={1}>{member.name.split(' ')[0]} {member.name.split(' ')[1]}</Text>
               </TouchableOpacity>
             ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
             {['All', 'Safe', 'Needs Help'].map(f => (
               <TouchableOpacity 
                 key={f}
                 onPress={() => setFilter(f)}
                 style={{ 
                   flex: 1, 
                   height: 38, 
                   borderRadius: 19, 
                   backgroundColor: filter === f ? '#FFF' : 'rgba(255,255,255,0.06)',
                   alignItems: 'center', 
                   justifyContent: 'center',
                   borderWidth: 1,
                   borderColor: filter === f ? '#FFF' : 'rgba(255,255,255,0.08)'
                 }}
               >
                  <Text style={{ color: filter === f ? '#000' : 'rgba(236,231,223,0.5)', fontWeight: '700', fontSize: 11, fontFamily: DS_FONT_UI }}>{f.toUpperCase()}</Text>
               </TouchableOpacity>
             ))}
             <TouchableOpacity style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                <Lucide.ChevronDown size={18} color="#FFF" />
             </TouchableOpacity>
          </View>

          {filteredMembers.map(m => (
            <FamilyMemberCard key={m.id} member={m} theme={theme} />
          ))}
        </ScrollView>
      </Container>
      
      <TacticalBottomNav navigation={navigation} activeRoute="Family" />
    </Screen>
  );
};

export default FamilyGroupPanelScreen;
