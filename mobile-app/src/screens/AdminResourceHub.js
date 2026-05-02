import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { Screen, Container, Card, Row, Col, Heading, PageHeader, Divider } from '../components/DesignSystem';

const AdminResourceHub = ({ navigation }) => {
  const { theme, isDark, atomic } = useTheme();

  const resources = [
    {
      title: 'Emergency Hotlines',
      description: 'Manage system-wide emergency contact directory',
      icon: 'PhoneCall',
      color: theme.error,
      route: 'EmergencyHotlines',
      count: '12 Active'
    },
    {
      title: 'Evacuation Shelters',
      description: 'Oversee capacity and logistics of safe zones',
      icon: 'Home',
      color: theme.success,
      route: 'Shelters',
      count: '8 Sites'
    },
    {
      title: 'Responder Network',
      description: 'Manage access levels for coordinators and brgy nodes',
      icon: 'Users',
      color: theme.primary,
      route: 'UserManagement',
      count: '42 Nodes'
    },
    {
      title: 'Operational Guides',
      description: 'Update the safety protocols for resident safety guides',
      icon: 'BookOpen',
      color: theme.accent,
      route: 'Announcements',
      count: 'v2.4'
    }
  ];

  return (
    <Screen ornamentIntensity={0.15}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <SafeAreaView edges={['top']}>
        <PageHeader 
          title="CONTROL HUB" 
          subtitle="System Resource Management"
          onBack={() => navigation.goBack()}
        />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Container>
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 800 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, letterSpacing: 2, marginBottom: 24, marginLeft: 4 }}>
              AUTHORIZED ADMINISTRATIVE CONTROLS
            </Text>

            <View style={{ gap: 16 }}>
              {resources.map((item, index) => {
                const Icon = Lucide[item.icon];
                return (
                  <TouchableOpacity 
                    key={index}
                    onPress={() => navigation.navigate(item.route)}
                    activeOpacity={0.9}
                  >
                    <Card variant="glass" style={{ padding: 24, borderRadius: 28, borderWidth: 1.5, borderColor: theme.border }}>
                      <Row align="center">
                        <View style={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 20, 
                          backgroundColor: item.color + '15', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: item.color + '30'
                        }}>
                          <Icon size={28} color={item.color} strokeWidth={2.5} />
                        </View>
                        
                        <Col style={{ flex: 1, marginLeft: 20 }}>
                          <Row justify="space-between" align="center">
                            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>{item.title}</Text>
                            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted }}>{item.count}</Text>
                            </View>
                          </Row>
                          <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>
                            {item.description}
                          </Text>
                        </Col>
                        
                        <View style={{ marginLeft: 16 }}>
                          <Lucide.ChevronRight size={20} color={theme.textMuted} opacity={0.3} strokeWidth={3} />
                        </View>
                      </Row>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Divider style={{ marginVertical: 40 }} />

            <Card variant="flat" style={{ padding: 24, borderRadius: 28, backgroundColor: theme.primary + '05', borderStyle: 'dashed', borderWidth: 1.5, borderColor: theme.primary + '30' }}>
               <Row align="center" gap={16}>
                  <Lucide.Info size={24} color={theme.primary} strokeWidth={2.5} />
                  <Col style={{ flex: 1 }}>
                     <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Resource Optimization</Text>
                     <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                        All changes to core system hotlines are synchronized in real-time across all resident nodes.
                     </Text>
                  </Col>
               </Row>
            </Card>

            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, textAlign: 'center', marginTop: 40, letterSpacing: 2, opacity: 0.5 }}>
              MDRRMO TACTICAL INFRASTRUCTURE • SECURE HUB
            </Text>
          </MotiView>
        </Container>
      </ScrollView>
    </Screen>
  );
};

export default AdminResourceHub;
