import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { Screen, Container, Card, Row, Col, Heading, PageHeader, Badge } from '../components/DesignSystem';

const EmergencyGuidesScreen = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();

  const guides = [
    {
      id: 'medical',
      title: 'Medical Emergency',
      subtitle: 'First aid and rapid response',
      icon: 'HeartPulse',
      color: '#EC4899',
      topics: ['CPR Protocol', 'Bleeding Control', 'Heat Stroke']
    },
    {
      id: 'fire',
      title: 'Fire & Smoke',
      subtitle: 'Evacuation and safety',
      icon: 'Flame',
      color: '#E67E22',
      topics: ['Exit Routes', 'Fire Extinguisher', 'Smoke Inhalation']
    },
    {
      id: 'flood',
      title: 'Flood & Rain',
      subtitle: 'Disaster preparedness',
      icon: 'Waves',
      color: '#3B82F6',
      topics: ['Water Safety', 'Signal Prep', 'Electric Hazards']
    },
    {
      id: 'earthquake',
      title: 'Earthquake',
      subtitle: 'Drop, Cover, and Hold',
      icon: 'Move',
      color: '#8B5CF6',
      topics: ['Structural Safety', 'Gas Leaks', 'Aftershocks']
    }
  ];

  return (
    <Screen ornamentIntensity={0.2}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <PageHeader 
          title="SAFETY GUIDES" 
          subtitle="Tactical Response Manual"
          onBack={() => navigation.goBack()}
        />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Container>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 800 }}
          >
            {/* Featured Guide Card */}
            <Card variant="glass" style={{ padding: 0, borderRadius: 32, marginBottom: 32, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.primary + '30' }}>
               <View style={{ height: 180, backgroundColor: theme.primary + '10', justifyContent: 'center', alignItems: 'center' }}>
                  <Lucide.ShieldAlert size={80} color={theme.primary} strokeWidth={1.5} />
                  <View style={{ position: 'absolute', bottom: 16, left: 20 }}>
                     <Badge label="HIGH PRIORITY" variant="warning" />
                  </View>
               </View>
               <View style={{ padding: 24 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Ready for Disaster?</Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 20, marginBottom: 20 }}>
                    Our offline-ready safety protocols ensure you have critical information even when cellular networks fail. Review these guides now.
                  </Text>
                  <TouchableOpacity style={{ paddingVertical: 14, backgroundColor: theme.primary, borderRadius: 16, alignItems: 'center' }}>
                     <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14, letterSpacing: 1 }}>START TRAINING</Text>
                  </TouchableOpacity>
               </View>
            </Card>

            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 2, marginBottom: 20, marginLeft: 4 }}>
              EMERGENCY PROTOCOLS
            </Text>

            <View style={{ gap: 20 }}>
              {guides.map((guide, idx) => {
                const Icon = Lucide[guide.icon];
                return (
                  <TouchableOpacity key={guide.id} activeOpacity={0.9}>
                    <Card variant="glass" style={{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border }}>
                       <Row align="center">
                          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: guide.color + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: guide.color + '20' }}>
                             <Icon size={24} color={guide.color} strokeWidth={2.5} />
                          </View>
                          <Col style={{ flex: 1, marginLeft: 16 }}>
                             <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>{guide.title}</Text>
                             <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{guide.subtitle}</Text>
                          </Col>
                          <Lucide.ChevronRight size={20} color={theme.textMuted} opacity={0.3} />
                       </Row>
                       
                       <Row style={{ marginTop: 20, flexWrap: 'wrap', gap: 8 }}>
                          {guide.topics.map((topic, tidx) => (
                            <View key={tidx} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                               <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textSecondary }}>{topic}</Text>
                            </View>
                          ))}
                       </Row>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginTop: 60, letterSpacing: 2, opacity: 0.5 }}>
              PRODUCED BY MDRRMO LAGUNA • SAFETY FIRST
            </Text>
          </MotiView>
        </Container>
      </ScrollView>
    </Screen>
  );
};

export default EmergencyGuidesScreen;
