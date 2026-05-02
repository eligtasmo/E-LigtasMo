import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const ReportCard = ({ report, onPress }) => {
  const { theme, atomic } = useTheme();

  const getStatusConfig = (severity, status) => {
    const s = String(severity || status || 'Info').toLowerCase();
    if (s === 'critical' || s === 'high' || s === 'severe' || s === 'danger') 
      return { color: theme.error, label: 'CRITICAL', icon: 'ShieldAlert' };
    if (s === 'moderate' || s === 'medium' || s === 'warning') 
      return { color: theme.warning, label: 'WARNING', icon: 'AlertTriangle' };
    if (s === 'verified' || s === 'resolved' || s === 'success') 
      return { color: theme.success, label: 'VERIFIED', icon: 'CheckCircle' };
    if (s === 'rejected' || s === 'denied' || s === 'invalid')
      return { color: theme.error, label: 'REJECTED', icon: 'XCircle' };
    return { color: theme.warning, label: 'PENDING', icon: 'Clock' };
  };

  const config = getStatusConfig(report.severity, report.status);
  const Icon = Lucide[config.icon];

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card 
        variant="elevated" 
        statusColor={config.color}
        style={{ marginBottom: 16, padding: 0, borderRadius: 24, overflow: 'hidden' }}
        shadowIntensity="xs"
      >
        <View style={{ padding: 20 }}>
          <Row align="center" style={{ marginBottom: 16 }}>
            <View style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 14, 
              backgroundColor: config.color + '08',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: config.color + '15'
            }}>
              <Icon size={22} color={config.color} strokeWidth={2.5} />
            </View>
            
            <Col style={{ flex: 1, marginLeft: 16 }}>
              <Row justify="space-between" align="center">
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }} numberOfLines={1}>
                  {report.address || 'LAGUNA SECTOR'}
                </Text>
                <View style={{ backgroundColor: config.color + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: config.color, letterSpacing: 0.5 }}>{config.label}</Text>
                </View>
              </Row>
              <Row align="center" style={{ marginTop: 4 }}>
                 <Lucide.MapPin size={10} color={theme.textMuted} strokeWidth={3} />
                 <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                   {report.barangay ? `${report.barangay}` : 'LOCAL AREA'}
                 </Text>
              </Row>
            </Col>
          </Row>

          <View style={{ 
            backgroundColor: theme.surfaceVariant, 
            padding: 16, 
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary, lineHeight: 22 }} numberOfLines={2}>
              {report.description || 'Verified situational awareness report submitted to operational commands.'}
            </Text>
          </View>

          <Row justify="space-between" align="center">
            <Row align="center">
               <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.color, marginRight: 8 }} />
               <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                  INTEL SYNC: {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </Text>
            </Row>
             <Row align="center" gap={4}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary, letterSpacing: 0.8 }}>OPEN INTEL</Text>
                <Lucide.Crosshair size={14} color={theme.primary} strokeWidth={3} />
             </Row>
          </Row>
        </View>
      </Card>
    </TouchableOpacity>
  );
};
