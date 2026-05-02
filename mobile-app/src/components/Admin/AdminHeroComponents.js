import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Row, Col, Heading, Card, Tag } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AdminHeader = ({ onLogout }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[atomic.px16, atomic.py16, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Row justify="space-between" align="center">
        <Row align="center">
          <View style={[atomic.p10, atomic.mr12, { borderRadius: 14, backgroundColor: theme.primary, elevation: 4 }]}>
            <MaterialCommunityIcons name="shield-account" size={24} color="#fff" />
          </View>
          <Col>
            <Heading size="sm">Settings</Heading>
            <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.primary, letterSpacing: 1 }]}>
              AUTHORIZED ACCESS
            </Text>
          </Col>
        </Row>
        <TouchableOpacity onPress={onLogout} style={[atomic.p12, { borderRadius: 12, backgroundColor: theme.surfaceVariant }]}>
          <MaterialCommunityIcons name="logout" size={20} color={theme.textMuted} />
        </TouchableOpacity>
      </Row>
    </View>
  );
};

export const AdminHeroStatus = ({ level, depth, color }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card variant="raised" style={[atomic.mb24, { borderLeftWidth: 6, borderLeftColor: color }]}>
       <Row justify="space-between" align="center" style={atomic.mb16}>
         <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.textSecondary, letterSpacing: 1 }]}>SYSTEM OVERVIEW</Text>
         <View style={[atomic.px8, atomic.py4, atomic.row, atomic.aic, { borderRadius: 10, backgroundColor: theme.primaryBg }]}>
           <MaterialCommunityIcons name="shield-check" size={14} color={theme.primary} />
           <Text style={[atomic.t.tiny, atomic.t.heavy, atomic.ml4, { color: theme.primary }]}>ADMIN MODE</Text>
         </View>
       </Row>

       <Row align="center" gap={16} style={atomic.mb16}>
          <MaterialCommunityIcons name="monitor-dashboard" size={44} color={color} />
          <Col>
            <Text style={[atomic.t.h3, atomic.t.heavy, { color }]}>{level?.toUpperCase()}</Text>
            <Text style={[atomic.t.body, { color: theme.textSecondary }]}>{depth}</Text>
          </Col>
       </Row>

       <View style={[atomic.pt12, { borderTopWidth: 1, borderTopColor: theme.border }]}>
         <Row justify="space-between">
            <Text style={[atomic.t.tiny, { color: theme.textMuted }]}>Last check: 10 mins ago</Text>
            <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.textSecondary }]}>SOURCE: SYSTEM CORE</Text>
         </Row>
       </View>
    </Card>
  );
};

export const WeatherCard = ({ weather, description }) => {
  const { theme, atomic } = useTheme();

  if (!weather) return null;

  return (
    <Card variant="flat" style={[atomic.mb12, { backgroundColor: theme.surfaceVariant }]}>
      <Row align="center">
        <View style={[atomic.p10, atomic.mr16, { borderRadius: 12, backgroundColor: theme.primaryBg }]}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={24} color={theme.primary} />
        </View>
        <Col style={atomic.l.flex}>
           <Text style={[atomic.t.body, atomic.t.heavy, { color: theme.text }]}>Santa Cruz Weather</Text>
           <Text style={[atomic.t.caption, { color: theme.textSecondary }]}>
             {description} • Prec: {weather.current?.precipitation || '0'}mm
           </Text>
        </Col>
        <Col align="flex-end">
           <Text style={[atomic.t.body, atomic.t.heavy, { color: theme.primary }]}>{weather.current?.temperature_2m || '--'}°C</Text>
           <Text style={[atomic.t.tiny, { color: theme.textMuted }]}>Live Data</Text>
        </Col>
      </Row>
    </Card>
  );
};
