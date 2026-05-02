import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col, Stat } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const ShelterStats = ({ total, available, open }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card variant="elevated" statusColor={theme.primary} style={{ padding: 20, marginBottom: 24, borderRadius: 28 }} shadowIntensity="sm">
      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 2, marginBottom: 20 }}>LOGISTICS TELEMETRY</Text>
      <Row align="center" gap={8}>
        <Stat label="Total Nodes" value={total} lucideIcon="Home" color={theme.primary} />
        <Stat label="Available" value={available} lucideIcon="Users" color={theme.success} />
        <Stat label="Active Status" value={open} lucideIcon="CheckCircle" color={theme.secondary} />
      </Row>
    </Card>
  );
};

export const ShelterCard = ({ shelter, userRole, onLocate, onUpdate }) => {
  const { theme, atomic } = useTheme();

  const percentage = shelter.capacity > 0 ? Math.round((shelter.occupancy / shelter.capacity) * 100) : 0;
  
  const getStatusConfig = () => {
    if (percentage >= 90) return { color: theme.error, label: 'CRITICAL', icon: 'ShieldAlert' };
    if (percentage >= 70) return { color: theme.warning, label: 'HIGH LOAD', icon: 'AlertTriangle' };
    return { color: theme.success, label: 'OPTIMAL', icon: 'CheckCircle' };
  };

  const config = getStatusConfig();
  const Icon = Lucide[config.icon];

  return (
    <Card 
      variant="elevated" 
      statusColor={shelter.status === 'Open' ? config.color : theme.textMuted}
      style={{ marginBottom: 16, padding: 0, borderRadius: 24, overflow: 'hidden' }}
      shadowIntensity="xs"
    >
      <View style={{ padding: 20 }}>
        <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
          <Row align="center" style={{ flex: 1 }}>
            <View style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 14, 
              backgroundColor: theme.primary + '08',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: theme.primary + '15'
            }}>
              <Lucide.Building2 size={22} color={theme.primary} strokeWidth={2.5} />
            </View>
            <Col style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }} numberOfLines={1}>
                {shelter.name}
              </Text>
              <Row align="center" style={{ marginTop: 2 }}>
                <Lucide.MapPin size={10} color={theme.textMuted} strokeWidth={3} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textMuted, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {shelter.address || shelter.location || 'LAGUNA SECTOR'}
                </Text>
              </Row>
            </Col>
          </Row>
          <View style={{ backgroundColor: (shelter.status === 'Open' ? theme.success : theme.textMuted) + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: shelter.status === 'Open' ? theme.success : theme.textMuted, letterSpacing: 1 }}>{shelter.status?.toUpperCase()}</Text>
          </View>
        </Row>

        <View style={{ marginBottom: 20 }}>
          <Row justify="space-between" align="center" style={{ marginBottom: 8 }}>
            <Row align="center">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.color, marginRight: 8 }} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.textSecondary, letterSpacing: 1 }}>OCCUPANCY: {getOccLabel(percentage)}</Text>
            </Row>
            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text }}>{shelter.occupancy} / {shelter.capacity}</Text>
          </Row>
          <View style={{ height: 10, backgroundColor: theme.surfaceVariant, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
            <View style={{ width: `${Math.min(100, percentage)}%`, height: '100%', backgroundColor: config.color, borderRadius: 5 }} />
          </View>
          
          {(shelter.updated_by || shelter.created_by) && (
            <Row align="center" style={{ marginTop: 12 }}>
              <Lucide.UserCheck size={10} color={theme.textMuted} strokeWidth={3} />
              <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, marginLeft: 4, fontStyle: 'italic' }}>
                Updated by: {shelter.updated_by || shelter.created_by} 
                {shelter.updated_at ? ` • ${new Date(shelter.updated_at).toLocaleDateString()}` : ''}
              </Text>
            </Row>
          )}
        </View>

        <Row gap={12}>
          <TouchableOpacity 
            style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            onPress={onLocate}
          >
            <Lucide.Navigation size={16} color={theme.text} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text, marginLeft: 8, letterSpacing: 0.5 }}>LOCATE</Text>
          </TouchableOpacity>
          {(['admin', 'coordinator', 'captain', 'brgy'].includes(userRole)) && (
            <TouchableOpacity 
              style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.xs }}
              onPress={onUpdate}
            >
              <Lucide.FileEdit size={16} color="#fff" strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', marginLeft: 8, letterSpacing: 0.5 }}>UPDATE</Text>
            </TouchableOpacity>
          )}
        </Row>
      </View>
    </Card>
  );
};

const getOccLabel = (pct) => {
  if (pct >= 90) return 'CRITICAL';
  if (pct >= 70) return 'HIGH';
  if (pct >= 40) return 'MODERATE';
  return 'OPTIMAL';
};
