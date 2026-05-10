import React from 'react';
import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { TacticalCard, Row, Col, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AnnouncementCard = ({ item, isAdmin, onEdit, onDelete, onPress }) => {
  const { theme } = useTheme();

  const getStatusConfig = (type) => {
    const t = String(type || 'info').toLowerCase();
    if (t.includes('warning') || t.includes('disaster')) return { color: '#FF9E0B', label: 'Disaster', bg: 'rgba(255,158,11,0.1)' };
    if (t.includes('safety')) return { color: '#3B82F6', label: 'Safety Tips', bg: 'rgba(59,130,246,0.1)' };
    if (t.includes('recovery')) return { color: '#10B981', label: 'Recovery', bg: 'rgba(16,185,129,0.1)' };
    if (t.includes('prepare')) return { color: '#F472B6', label: 'Preparedness', bg: 'rgba(244,114,182,0.1)' };
    return { color: '#3B82F6', label: 'News', bg: 'rgba(59,130,246,0.1)' };
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
      <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={{ padding: 18 }}>
        <Col>
          <Row align="center" justify="space-between" style={{ marginBottom: 10 }}>
             <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: config.bg }}>
                <Text style={{ color: config.color, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{config.label}</Text>
             </View>
             <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '500' }}>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </Row>

          <Text style={{ color: '#F4F0E8', fontSize: 16, fontWeight: '700', marginBottom: 6, fontFamily: DS_FONT_UI }} numberOfLines={2}>{item.title}</Text>
          <Text style={{ color: 'rgba(242,238,230,0.5)', fontSize: 12, marginBottom: 16, lineHeight: 18, fontFamily: DS_FONT_INPUT }} numberOfLines={2}>{item.message}</Text>

          <Row align="center" gap={10}>
            <TouchableOpacity 
              onPress={onPress}
              activeOpacity={0.8}
              style={{ height: 36, paddingHorizontal: 20, borderRadius: 18, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#000', fontWeight: '800', fontSize: 11, fontFamily: DS_FONT_UI }}>Read More</Text>
            </TouchableOpacity>

            {isAdmin && (
              <Row gap={8} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => onEdit(item)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Lucide.FileEdit size={16} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.id)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Lucide.Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </Row>
            )}
          </Row>
        </Col>
      </TouchableOpacity>
    </TacticalCard>
  );
};
