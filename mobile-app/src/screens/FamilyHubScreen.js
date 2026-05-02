import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image as RNImage, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import * as Lucide from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { useTheme } from '../context/ThemeContext';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import { useAuth } from '../context/AuthContext';
import { 
  Screen, TacticalCard, Row, Col, Heading, Badge, Divider, 
  IconBox, Container, PrimaryButton, useResponsive,
  ValidationInput,
  DS_FONT_UI,
  DS_TACTICAL
} from '../components/DesignSystem';

import TacticalBottomNav from '../components/Navigation/TacticalBottomNav';
import { TacticalHeader } from '../components/Home/TacticalComponents';

const FamilyMemberCard = ({ member, isMe, onUpdateStatus, theme }) => {
  const isSafe = member.status === 'Safe';
  const needsHelp = member.status === 'Needs Help';
  
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${isSafe ? '22c55e' : 'ef4444'}(${member.longitude},${member.latitude})/${member.longitude},${member.latitude},14.5,0/400x200?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return (
    <TacticalCard noPadding style={{ marginBottom: 20 }}>
      <View style={{ padding: 14 }}>
        <Row align="center" justify="space-between" style={{ marginBottom: 16 }}>
          <Row align="center" gap={12}>
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: isSafe ? '#22C55E' : '#EF4444' }}>
              <RNImage source={{ uri: member.profile_image }} style={{ width: '100%', height: '100%' }} />
            </View>
            <View>
              <Heading size="sm" style={{ color: '#FFF' }}>{member.name}</Heading>
              <Row align="center" gap={6} style={{ marginTop: 2 }}>
                 <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isSafe ? '#22C55E' : '#EF4444' }} />
                 <Text style={{ color: isSafe ? '#22C55E' : '#EF4444', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI }}>
                   {isSafe ? 'Marked Safe' : 'Needs Help'}
                 </Text>
              </Row>
            </View>
          </Row>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI }}>10:45 AM</Text>
            <TouchableOpacity onPress={() => onUpdateStatus()} style={{ marginTop: 6 }}>
               <Text style={{ color: DS_TACTICAL.primary, fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI, textTransform: 'none' }}>Update</Text>
            </TouchableOpacity>
          </View>
        </Row>

        <View style={{ height: 140, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          <RNImage source={{ uri: mapUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={{ position: 'absolute', top: '50%', left: '50%', width: 100, height: 100, borderRadius: 50, marginLeft: -50, marginTop: -50, backgroundColor: isSafe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', transform: [{ scale: 1.2 }] }} />
        </View>

        <Row gap={12}>
          <PrimaryButton
            title="View Map"
            onPress={() => {}}
            style={{ flex: 1 }}
            variant="gray"
          />
          <PrimaryButton
            title="Marked Safe"
            onPress={() => {}}
            style={{ flex: 1 }}
            variant={isSafe ? 'secondary' : 'danger'}
            lucideIcon={isSafe ? 'Check' : 'AlertTriangle'}
          />
        </Row>
      </View>
    </TacticalCard>
  );
};

const FamilyMemberListItem = ({ member, theme }) => {
  const isSafe = member.status === 'Safe';
  const needsHelp = member.status === 'Needs Help';
  
  return (
    <TouchableOpacity style={{ 
      marginBottom: 12, 
      backgroundColor: 'rgba(21,17,14,0.94)', 
      borderRadius: 22, 
      padding: 14, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.07)' 
    }}>
      <Row align="center" justify="space-between">
        <Row align="center" gap={12}>
          <RNImage source={{ uri: member.profile_image }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: isSafe ? '#22C55E' : '#EF4444' }} />
          <View>
            <Heading size="sm" style={{ color: '#F4F0E8', fontSize: 13, fontWeight: '600' }}>{member.name}</Heading>
            <Text style={{ color: 'rgba(236,231,223,0.4)', fontSize: 9, fontWeight: '700', fontFamily: DS_FONT_UI, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{member.relationship}</Text>
          </View>
        </Row>
        <Row gap={12} align="center">
           <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isSafe ? 'rgba(34,197,94,0.1)' : needsHelp ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Lucide.Activity size={20} color={isSafe ? '#22C55E' : needsHelp ? '#EF4444' : '#666'} />
           </View>
           <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#000', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
              <RNImage source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${isSafe ? '22c55e' : 'ef4444'}(${member.longitude},${member.latitude})/${member.longitude},${member.latitude},14,0/80x80?access_token=${MAPBOX_ACCESS_TOKEN}` }} style={{ width: '100%', height: '100%' }} />
           </View>
        </Row>
      </Row>
    </TouchableOpacity>
  );
};

const FamilyHubScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { safeTop } = useResponsive();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const me = members.find(m => m.user_id === user?.id || (m.relationship === 'Self' && !m.user_id)) || members[0];
  const others = members.filter(m => m.id !== me?.id);

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      {/* Tactical Header with Safe Area Padding */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <TacticalHeader 
          title="Family Hub" 
          showBack
        />
      </View>

      <Container style={{ flex: 1, paddingTop: 16 }}>

        <View style={{ height: 16 }} />

        {/* Tactical Search */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: 'rgba(26,22,18,0.92)', 
          borderRadius: 25, 
          paddingHorizontal: 18, 
          height: 50, 
          marginBottom: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)'
        }}>
          <Lucide.Search size={18} color="rgba(255,255,255,0.4)" strokeWidth={2.4} />
          <TextInput 
            placeholder="Search family members..." 
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, marginLeft: 10, color: '#FFF', fontSize: 13, fontWeight: '500', fontFamily: DS_FONT_UI }}
          />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 200 }}
          style={{ marginHorizontal: -4 }}
        >
           {me && (
             <FamilyMemberCard 
               member={me} 
               isMe={true} 
               onUpdateStatus={(s) => {/* update logic */}} 
               theme={theme} 
             />
           )}

           <View style={{ height: 12 }} />
           <Text style={{ color: 'rgba(236,231,223,0.4)', letterSpacing: 0.5, marginBottom: 16, marginLeft: 4, fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI }}>Connected Members</Text>

           {others.map(m => (
             <FamilyMemberListItem key={m.id} member={m} theme={theme} />
           ))}
        </ScrollView>
      </Container>
      
      <TacticalBottomNav navigation={navigation} activeRoute="Family" />
    </Screen>
  );
};

export default FamilyHubScreen;
