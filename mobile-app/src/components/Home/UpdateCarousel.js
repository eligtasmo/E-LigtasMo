import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col } from '../DesignSystem';

export const UpdateCarousel = ({ 
  latestAnnouncement, 
  weatherData, 
  onAnnouncementPress, 
  onWeatherPress 
}) => {
  const { theme, atomic } = useTheme();

  const getAnnouncementColors = (type) => {
    const t = String(type || 'info').toLowerCase();
    if (t === 'critical' || t === 'error') return { icon: theme.error, label: 'URGENT INTEL' };
    if (t === 'warning') return { icon: theme.warning, label: 'ADVISORY' };
    return { icon: theme.primary, label: 'BROADCAST' };
  };

  const annInfo = getAnnouncementColors(latestAnnouncement?.type);
  const WeatherIcon = Lucide.CloudSun;

  return (
    <View style={{ gap: 12 }}>
      {/* TACTICAL WEATHER SNAP */}
      <TouchableOpacity activeOpacity={0.8} onPress={onWeatherPress}>
        <Card 
          variant="glass" 
          style={{ padding: 0 }}
          shadowIntensity="xs"
        >
          <Row align="center" style={[atomic.p16]}>
            <View style={[atomic.justifyCenter, atomic.aic, { width: 52, height: 52, backgroundColor: theme.primary + '08', borderRadius: 16, borderWidth: 1, borderColor: theme.primary + '15' }]}>
              <WeatherIcon size={26} color={theme.primary} strokeWidth={2.2} />
            </View>
            
            <Col style={{ flex: 1, marginLeft: 16 }}>
               <Row align="center">
                  <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text }}>{weatherData?.temp}</Text>
                  <View style={{ marginLeft: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.primary + '10' }}>
                     <Text style={{ fontSize: 9, fontWeight: '700', color: theme.primary, letterSpacing: 1 }}>REAL-TIME</Text>
                  </View>
               </Row>
               <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 1 }}>
                  {weatherData?.desc} • View Flow Radar
               </Text>
            </Col>
            <Lucide.ChevronRight size={18} color={theme.textMuted} strokeWidth={2.5} />
          </Row>
        </Card>
      </TouchableOpacity>

      {/* INTELLIGENCE FEED */}
      <TouchableOpacity activeOpacity={0.8} onPress={onAnnouncementPress}>
        <Card 
          variant="elevated" 
          statusColor={annInfo.icon}
          style={{ padding: 0 }}
          shadowIntensity="xs"
        >
          <Row align="center" style={[atomic.p16]}>
            <View style={[atomic.justifyCenter, atomic.aic, { width: 52, height: 52, backgroundColor: annInfo.icon + '08', borderRadius: 16, borderWidth: 1, borderColor: annInfo.icon + '15' }]}>
              <Lucide.Radio size={26} color={annInfo.icon} strokeWidth={2.2} />
            </View>
            
            <Col style={{ flex: 1, marginLeft: 16 }}>
               <Text style={{ fontSize: 9, fontWeight: '700', color: annInfo.icon, letterSpacing: 1.5 }}>
                  {annInfo.label} • {latestAnnouncement?.date ? new Date(latestAnnouncement.date).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase() : 'ACTIVE'}
               </Text>
               <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, marginTop: 2 }} numberOfLines={1}>
                  {latestAnnouncement?.title || 'System Normal'}
               </Text>
               <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textSecondary, opacity: 0.8 }} numberOfLines={1}>
                  {latestAnnouncement?.message || 'Awaiting sector updates...'}
               </Text>
            </Col>
            <Lucide.ChevronRight size={18} color={theme.textMuted} strokeWidth={2.5} />
          </Row>
        </Card>
      </TouchableOpacity>
    </View>
  );
};
