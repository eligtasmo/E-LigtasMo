import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { TacticalCard, Row, Col, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const NotificationActivityCard = ({ item, onPress }) => {
  const { theme } = useTheme();

  const getNotificationConfig = (type) => {
    const t = String(type || 'info').toLowerCase();
    if (t.includes('volunteer')) return { icon: 'Users', color: '#3B82F6', action: 'View Details' };
    if (t.includes('donation')) return { icon: 'Heart', color: '#EC4899', action: 'See Impact' };
    if (t.includes('check') || t.includes('safe')) return { icon: 'UserCheck', color: '#10B981', action: 'View Location' };
    if (t.includes('warning') || t.includes('disaster')) return { icon: 'Waves', color: '#F5B235', action: 'View Map' };
    return { icon: 'Bell', color: '#F5B235', action: 'Open' };
  };

  const config = getNotificationConfig(item.type || item.title);
  const Icon = Lucide[config.icon] || Lucide.Bell;

  return (
    <TacticalCard 
      noPadding
      style={{ 
        marginBottom: 14,
        backgroundColor: 'rgba(21,17,14,0.94)',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)'
      }}
    >
      <View style={{ padding: 14 }}>
      <Row align="flex-start">
        <View style={{ 
          width: 38, 
          height: 38, 
          borderRadius: 19, 
          backgroundColor: 'rgba(245,178,53,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)'
        }}>
          <Icon size={16} color={config.color} strokeWidth={2.4} />
        </View>

        <Col style={{ flex: 1, marginLeft: 12 }}>
          <Row justify="space-between" align="center">
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#F4F0E8', flex: 1, marginRight: 8, fontFamily: DS_FONT_UI }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500', fontFamily: DS_FONT_INPUT }}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Row>
          
          <Text style={{ fontSize: 9, color: 'rgba(242,238,230,0.5)', marginTop: 4, lineHeight: 14, fontFamily: DS_FONT_INPUT }} numberOfLines={2}>
            {item.message}
          </Text>

          <Row justify="space-between" align="center" style={{ marginTop: 12 }}>
            <TouchableOpacity 
              onPress={onPress}
              activeOpacity={0.86}
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.08)', 
                paddingHorizontal: 10, 
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)'
              }}
            >
            <Text style={{ color: '#F4F0E8', fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI }}>{config.action}</Text>
            </TouchableOpacity>

            {!item.is_read && (
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#B37213' }} />
            )}
          </Row>
        </Col>
      </Row>
      </View>
    </TacticalCard>
  );
};
