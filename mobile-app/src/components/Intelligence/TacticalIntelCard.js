import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { DS_FONT_UI, DS_FONT_INPUT, Row, Col } from '../DesignSystem';
import { API_URL } from '../../config';

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

const HAZARD_ACCENTS = {
  Earthquake: '#FF4B5F',
  Flood: '#3B82F6',
  Fire: '#FF7A2F',
  Landslide: '#F59E0B',
  Storm: '#5AA5FF',
  Road: '#F97316',
  Accident: '#FF5A5A',
  Other: '#A3A3A3',
};

const HAZARD_ICONS = {
  Earthquake: 'Activity',
  Flood: 'Waves',
  Fire: 'Flame',
  Landslide: 'Mountain',
  Storm: 'CloudLightning',
  Road: 'TriangleAlert',
  Accident: 'ShieldAlert',
  Other: 'MapPinned',
};

export const TacticalIntelCard = ({ item, onPress, onZoom, variant = 'grid' }) => {
  const { width: windowWidth } = useWindowDimensions();
  
  const rawMedia = item.media || item.media_path || item.photo_url;
  const mediaUrl = rawMedia ? (rawMedia.startsWith('http') ? rawMedia : `${API_URL}/${rawMedia}`) : null;
  
  const type = (item.type || item.hazard_type || 'Other').toLowerCase();
  let kind = 'Other';
  if (type.includes('flood')) kind = 'Flood';
  else if (type.includes('fire')) kind = 'Fire';
  else if (type.includes('earthquake')) kind = 'Earthquake';
  else if (type.includes('landslide')) kind = 'Landslide';
  else if (type.includes('storm')) kind = 'Storm';
  else if (type.includes('road')) kind = 'Road';
  else if (type.includes('accident')) kind = 'Accident';

  const accent = HAZARD_ACCENTS[kind] || HAZARD_ACCENTS.Other;
  const Icon = Lucide[HAZARD_ICONS[kind]] || Lucide.MapPinned;
  const severity = String(item.severity || 'Moderate').toLowerCase();
  
  let severityColor = '#10B981';
  if (severity === 'high' || severity === 'critical' || severity === 'severe') severityColor = '#EF4444';
  else if (severity === 'medium' || severity === 'moderate' || severity === 'warning') severityColor = '#F5B235';

  if (variant === 'grid') {

    return (
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        style={{ 
          width: (windowWidth - 32 - 20) / 3.01,
          backgroundColor: accent + '12',
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: accent + '20',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 115, 
          overflow: 'hidden'
        }}
      >
        {mediaUrl && (
          <RNImage 
            source={{ uri: mediaUrl }} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }} 
            resizeMode="cover"
          />
        )}
        <View style={{ alignItems: 'center', width: '100%', padding: 12 }}>
          <View style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 10, 
            backgroundColor: mediaUrl ? 'rgba(0,0,0,0.4)' : accent + '15', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 6,
            borderWidth: 1,
            borderColor: accent + '25'
          }}>
            <Icon size={16} color={accent} strokeWidth={2.5} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center', fontFamily: DS_FONT_UI, letterSpacing: -0.2 }}>
            {item.barangay || item.barangay_name || 'Sector'}
          </Text>
          <View style={{ 
            marginTop: 4, 
            paddingHorizontal: 6, 
            paddingVertical: 2, 
            borderRadius: 6, 
            backgroundColor: severityColor + '20',
            borderWidth: 1,
            borderColor: severityColor + '30'
          }}>
            <Text style={{ fontSize: 7, fontWeight: '900', color: severityColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {severity}
            </Text>
          </View>
        </View>
        
        <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Lucide.Clock size={8} color="rgba(255,255,255,0.3)" />
          <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.3)', fontFamily: DS_FONT_INPUT }}>
            {formatRelativeTime(item.created_at || item.time)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }


  // List Variant (Wide)
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.85}
      style={{ 
        backgroundColor: 'rgba(255,255,255,0.04)', 
        borderRadius: 20, 
        padding: 16, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 12
      }}
    >
      <Row justify="space-between" align="center">
        <Row gap={12} align="center" style={{ flex: 1 }}>
          <View style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 14, 
            backgroundColor: accent + '15', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: accent + '25'
          }}>
            <Icon size={20} color={accent} strokeWidth={2.5} />
          </View>
          <Col style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF', fontFamily: DS_FONT_UI }}>{item.type || item.hazard_type || kind}</Text>
            <Row align="center" gap={4}>
              <Lucide.MapPin size={10} color="rgba(255,255,255,0.4)" />
              <Text numberOfLines={1} style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
                {item.address || item.barangay || item.barangay_name || 'Tactical Sector'}
              </Text>
            </Row>
          </Col>
        </Row>
        <Row gap={12} align="center">
          {mediaUrl && (
            <RNImage 
              source={{ uri: mediaUrl }} 
              style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} 
            />
          )}
          <Col align="flex-end">
             <View style={{ backgroundColor: severityColor + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: severityColor + '25', marginBottom: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: severityColor, textTransform: 'uppercase' }}>{severity}</Text>
             </View>
             <View style={{ 
               backgroundColor: (item.status === 'Verified' || item.status === 'Approved' || item.status === 'Resolved') ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', 
               paddingHorizontal: 6, 
               paddingVertical: 2, 
               borderRadius: 4, 
               marginBottom: 4 
             }}>
                <Text style={{ 
                  fontSize: 8, 
                  fontWeight: '800', 
                  color: (item.status === 'Verified' || item.status === 'Approved' || item.status === 'Resolved') ? '#10B981' : '#F59E0B' 
                }}>
                  {(item.status || 'Pending').toUpperCase()}
                </Text>
             </View>
             <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{formatRelativeTime(item.created_at || item.time)}</Text>
          </Col>
        </Row>
      </Row>
      
      {onZoom && (
        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            onZoom(item);
          }}
          style={{ 
            marginTop: 12, 
            paddingTop: 12, 
            borderTopWidth: 1, 
            borderTopColor: 'rgba(255,255,255,0.05)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Lucide.Maximize2 size={12} color="#2F7BFF" />
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#2F7BFF', letterSpacing: 0.5 }}>ZOOM TO SECTOR</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};
