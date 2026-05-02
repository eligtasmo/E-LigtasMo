import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AlertCard = ({ item, onPress }) => {
  const { theme } = useTheme();

  const getAlertConfig = (type) => {
    const t = String(type || 'info').toLowerCase();
    if (t.includes('earthquake')) return { color: '#FF4B5F', icon: 'Activity', label: 'EARTHQUAKE DETECTED', bg: 'rgba(255,75,95,0.1)' };
    if (t.includes('flood')) return { color: '#F59E0B', icon: 'Waves', label: 'FLOOD ADVISORY', bg: 'rgba(245,158,11,0.1)' };
    if (t.includes('fire')) return { color: '#FF7E3D', icon: 'Flame', label: 'FIRE ALERT', bg: 'rgba(255,126,61,0.1)' };
    return { color: '#3B82F6', icon: 'Info', label: 'SYSTEM ALERT', bg: 'rgba(59,130,246,0.1)' };
  };

  const config = getAlertConfig(item.type || item.title);
  const Icon = Lucide[config.icon] || Lucide.AlertTriangle;

  // Simulate a map preview based on type
  const mapPreviewUrl = item.type?.toLowerCase().includes('earthquake') 
    ? 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s-l+ff0000(121.05,14.58)/121.05,14.58,12,0/400x200?access_token=YOUR_TOKEN_HERE' 
    : 'https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s-l+ff0000(121.05,14.58)/121.05,14.58,12,0/400x200?access_token=YOUR_TOKEN_HERE';

  // Fallback map preview
  const fallbackMap = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop';

  return (
    <Card 
      variant="glass" 
      noPadding
      style={{ 
        marginBottom: 14, 
        borderRadius: 22, 
        backgroundColor: 'rgba(21,17,14,0.94)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)'
      }}
    >
      <View style={{ padding: 14 }}>
        <Row align="center" style={{ marginBottom: 12 }}>
          <View style={{ 
            width: 38, 
            height: 38, 
            borderRadius: 12, 
            backgroundColor: config.color,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} color="#FFF" strokeWidth={2.2} />
          </View>
          <Col style={{ flex: 1, marginLeft: 12 }}>
            <Row justify="space-between" align="center">
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#F4F0E8', fontFamily: DS_FONT_UI }}>{item.title}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '500', fontFamily: DS_FONT_INPUT }}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Row>
            <Text style={{ fontSize: 10, color: 'rgba(242,238,230,0.6)', marginTop: 2, fontFamily: DS_FONT_INPUT }}>{item.message}</Text>
          </Col>
        </Row>

      <Row align="center" gap={8} style={{ marginBottom: 12 }}>
        <Lucide.Link2 size={10} color="#F59E0B" />
        <Text style={{ fontSize: 7, fontWeight: '700', color: '#F59E0B', letterSpacing: 0.5, fontFamily: DS_FONT_UI }}>{item.isSocial ? item.title.toUpperCase() : 'SYSTEM BROADCAST'}</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ fontSize: 8, fontWeight: '600', color: config.color, fontFamily: DS_FONT_UI }}>{item.severity || (item.isSocial ? 'TACTICAL INTEL' : 'OFFICIAL')}</Text>
      </Row>

      {/* Map Preview */}
      <View style={{ height: 110, borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
        <RNImage 
          source={{ uri: fallbackMap }} 
          style={{ width: '100%', height: '100%', opacity: 0.8 }}
          resizeMode="cover"
        />
        <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, { backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' }]}>
           <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: config.color + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: config.color + '50' }}>
              <Icon size={20} color={config.color} />
           </View>
        </View>
      </View>

      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.86}
        style={{ 
          height: 38, 
          borderRadius: 19, 
          backgroundColor: '#FFFFFF', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)'
        }}
      >
        <Lucide.ExternalLink size={12} color="#000" style={{ marginRight: 6 }} />
        <Text style={{ color: '#000', fontSize: 11, fontWeight: '700', fontFamily: DS_FONT_UI }}>Show Full Advisory</Text>
      </TouchableOpacity>
      </View>
    </Card>
  );
};
