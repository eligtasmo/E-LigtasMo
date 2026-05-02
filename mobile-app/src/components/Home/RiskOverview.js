import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col, Stat, Divider } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const RiskOverview = ({ 
  statusLevel,
  statusLabel,
  statusMessage, 
  statusColor, 
  statusIcon,
  stats,
  updatedAt 
}) => {
  const { theme, atomic } = useTheme();
  const IconComponent = Lucide[statusIcon] || Lucide.ShieldCheck;

  return (
    <Card 
      variant="elevated" 
      statusColor={statusColor} 
      style={{ padding: 0 }}
      shadowIntensity="sm"
    >
      <View style={[atomic.p20]}>
        <Row align="center" justify="space-between">
          <Row align="center">
            <View style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 16, 
              backgroundColor: statusColor + '10',
              alignItems: 'center', 
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: statusColor + '20'
            }}>
              <IconComponent size={24} color={statusColor} strokeWidth={2.5} />
            </View>
            
            <Col style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: statusColor, letterSpacing: 2 }}>{statusLabel}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 2 }}>Local Protocol: Active</Text>
            </Col>
          </Row>
          
          <View style={[atomic.px12, atomic.py6, { backgroundColor: theme.surfaceVariant, borderRadius: 10 }]}>
             <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary }}>{new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()}</Text>
          </View>
        </Row>
        
        <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginTop: 16, lineHeight: 20 }}>
          {statusMessage}
        </Text>

        <Divider style={{ marginVertical: 20, opacity: 0.1 }} />

        <Row align="center" gap={8}>
           <Stat label="Impacted" value={stats?.impacted || 0} color={theme.error} lucideIcon="Map" />
           <Stat label="Verified" value={stats?.verified || 0} color={theme.success} lucideIcon="ShieldCheck" />
           <Stat label="Reports" value={stats?.pending || 0} color={theme.primary} lucideIcon="FileText" />
        </Row>
      </View>

      <View style={{ 
        backgroundColor: theme.surfaceVariant, 
        paddingVertical: 10, 
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.border
      }}>
        <Row align="center" gap={6}>
           <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success }} />
           <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' }}>
             SYSTEM SYNCHRONIZED • {updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'OPERATIONAL'}
           </Text>
        </Row>
      </View>
    </Card>
  );
};
