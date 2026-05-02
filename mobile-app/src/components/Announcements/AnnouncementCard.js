import React from 'react';
import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { TacticalCard, Row, Col, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AnnouncementCard = ({ item, isAdmin, onEdit, onDelete, onPress }) => {
  const { theme } = useTheme();

  const getStatusConfig = (type) => {
    const t = String(type || 'info').toLowerCase();
    if (t.includes('warning') || t.includes('disaster')) return { color: '#B37213', label: 'Disaster' };
    if (t.includes('safety')) return { color: '#3B82F6', label: 'Safety Tips' };
    if (t.includes('recovery')) return { color: '#10B981', label: 'Recovery' };
    return { color: '#3B82F6', label: 'Mission Update' };
  };

  const config = getStatusConfig(item.type);
  const fallbackImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';

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
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ padding: 14 }}>
        <Row align="center" justify="space-between" style={{ marginBottom: 12 }}>
          <Row align="center" gap={10}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
               <Lucide.Megaphone size={14} color={config.color} />
            </View>
            <Col>
              <Text style={{ color: config.color, fontSize: 10, fontWeight: '700', letterSpacing: 0.2, fontFamily: DS_FONT_UI }}>{config.label}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '500', marginTop: 2, fontFamily: DS_FONT_INPUT }}>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </Col>
          </Row>
          <Lucide.ChevronRight size={14} color="rgba(255,255,255,0.15)" />
        </Row>

        <Text style={{ color: '#F4F0E8', fontSize: 12, fontWeight: '500', marginBottom: 6, lineHeight: 18, fontFamily: DS_FONT_UI }}>{item.title}</Text>
        <Text style={{ color: 'rgba(242,238,230,0.55)', fontSize: 10, lineHeight: 16, marginBottom: 14, fontFamily: DS_FONT_INPUT }} numberOfLines={2}>{item.message}</Text>

        <View style={{ height: 140, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
           <RNImage source={{ uri: item.image_url || fallbackImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>

        <Row gap={10}>
          <TouchableOpacity 
            onPress={onPress}
            activeOpacity={0.86}
            style={{ flex: 1, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 11, fontFamily: DS_FONT_UI }}>Read More</Text>
          </TouchableOpacity>

          {isAdmin && (
            <Row gap={6}>
              <TouchableOpacity onPress={() => onEdit(item)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Lucide.FileEdit size={14} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item.id)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' }}>
                <Lucide.Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </Row>
          )}
        </Row>
      </TouchableOpacity>
    </TacticalCard>
  );
};
