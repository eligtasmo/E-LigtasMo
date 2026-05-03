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

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card 
        variant="glass" 
        statusColor={config.color}
        style={{ marginBottom: 20, padding: 0, borderRadius: 28, overflow: 'hidden', borderLeftWidth: 6, borderLeftColor: config.color, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' }}
        shadowIntensity="none"
      >
        <View style={{ padding: 22 }}>
          <Row align="center" style={{ marginBottom: 18 }}>
            <View style={{ 
              width: 52, 
              height: 52, 
              borderRadius: 18, 
              backgroundColor: config.color + '15',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: config.color + '30'
            }}>
              <Icon size={26} color={config.color} strokeWidth={2.5} />
            </View>
            
            <Col style={{ flex: 1, marginLeft: 16 }}>
              <Row justify="space-between" align="center">
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, letterSpacing: -0.3 }} numberOfLines={1}>
                  {report.address || 'LAGUNA SECTOR'}
                </Text>
                <View style={{ backgroundColor: config.color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: config.color + '40' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: config.color, letterSpacing: 1 }}>{config.label}</Text>
                </View>
              </Row>
              <Row align="center" style={{ marginTop: 6 }}>
                 <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Lucide.MapPin size={11} color="rgba(255,255,255,0.6)" strokeWidth={3} />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      {report.barangay ? `${report.barangay}` : 'FIELD SECTOR'}
                    </Text>
                 </View>
                 <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10 }} />
                 <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
                    {formatRelativeTime(report.created_at)}
                 </Text>
              </Row>
            </Col>
          </Row>

          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.04)', 
            padding: 20, 
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            marginBottom: 20
          }}>
            <Text style={{ fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.85)', lineHeight: 24 }} numberOfLines={3}>
              {report.description || 'Verified situational awareness report synchronized via encrypted tactical link.'}
            </Text>
          </View>

          <Row justify="space-between" align="center">
            <Row align="center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
               <Lucide.ShieldCheck size={14} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
               <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  INTEL ID: #{report.id?.toString().padStart(4, '0')}
               </Text>
            </Row>
             <TouchableOpacity 
               activeOpacity={0.7}
               onPress={onPress}
               style={{ 
                 flexDirection: 'row', 
                 alignItems: 'center', 
                 backgroundColor: '#2F7BFF' + '20', 
                 paddingHorizontal: 18, 
                 paddingVertical: 10, 
                 borderRadius: 14,
                 borderWidth: 1,
                 borderColor: '#2F7BFF' + '40'
               }}
             >
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#2F7BFF', letterSpacing: 1, marginRight: 8 }}>ANALYSIS</Text>
                <Lucide.ChevronRight size={16} color="#2F7BFF" strokeWidth={3} />
             </TouchableOpacity>
          </Row>
        </View>
      </Card>
    </TouchableOpacity>
  );
};
