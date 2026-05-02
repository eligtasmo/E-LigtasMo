import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col } from '../DesignSystem';

export const BarangayFloodStrip = ({ barangays, risks, userBarangay, onBarangayPress }) => {
  const { theme, atomic } = useTheme();

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={{ marginBottom: 12 }}
      contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 4, gap: 12 }}
    >
      {barangays.map((brgy, index) => {
        const riskData = risks[brgy.name] || { score: 0 };
        const score = riskData.score;
        
        const risk = (() => {
          if (score >= 10) return { level: 'CRITICAL', color: theme.error, icon: 'ShieldAlert' };
          if (score >= 5) return { level: 'HIGH RISK', color: '#F87171', icon: 'Waves' };
          if (score >= 2) return { level: 'CAUTION', color: theme.warning, icon: 'TriangleAlert' };
          if (score >= 1) return { level: 'MONITOR', color: theme.primary, icon: 'Eye' };
          return { level: 'NORMAL', color: theme.success, icon: 'ShieldCheck' };
        })();
        
        const isUserBrgy = userBarangay && brgy.name.toLowerCase() === userBarangay.toLowerCase();
        const IconComponent = LucideIcons[risk.icon] || LucideIcons.Shield;

        return (
          <TouchableOpacity 
            key={index} 
            onPress={() => onBarangayPress(brgy)}
            activeOpacity={0.8}
            style={{ width: 140 }}
          >
            <Card 
              variant="elevated" 
              statusColor={risk.color}
              shadowIntensity={isUserBrgy ? 'sm' : 'none'}
              style={{
                padding: 0,
                borderRadius: 20,
                backgroundColor: isUserBrgy ? theme.surface : theme.background,
                borderColor: isUserBrgy ? theme.primary : theme.border,
                borderWidth: isUserBrgy ? 1.5 : 1,
              }}
            >
              <Col align="center" style={[atomic.p16]}>
                <View style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 14, 
                  backgroundColor: risk.color + '08',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: risk.color + '15'
                }}>
                  <IconComponent size={22} color={risk.color} strokeWidth={2.5} />
                </View>
                <Text 
                  numberOfLines={1} 
                  style={{ fontSize: 13, fontWeight: '700', color: theme.text, textAlign: 'center', width: '100%' }}
                >
                  {brgy.name}
                </Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: risk.color, letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' }}>
                  {risk.level}
                </Text>
              </Col>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};
