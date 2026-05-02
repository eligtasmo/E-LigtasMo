import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Row, Col, Heading, Card, Tag } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const CoordinatorHeader = ({ user, onLogout }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[atomic.px16, atomic.py16, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Row justify="space-between" align="center">
        <Row align="center">
          <View style={[atomic.p10, atomic.mr12, { borderRadius: 14, backgroundColor: theme.success, elevation: 4 }]}>
            <Text style={[atomic.t.body, atomic.t.heavy, { color: '#fff' }]}>{user?.barangay?.charAt(0) || 'C'}</Text>
          </View>
          <Col>
            <Heading size="sm">Command Center</Heading>
            <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.textSecondary }]}>
              {user?.barangay || 'Operational Unit'} OPERATIONS
            </Text>
          </Col>
        </Row>
        <Row align="center" gap={12}>
          <View style={[atomic.px8, atomic.py4, atomic.row, atomic.aic, { borderRadius: 12, backgroundColor: theme.successBg, borderWidth: 1, borderColor: theme.success }]}>
            <View style={[atomic.p2, atomic.mr4, atomic.roundFull, { backgroundColor: theme.success }]} />
            <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.success }]}>LIVE</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={[atomic.p8, { borderRadius: 10, backgroundColor: theme.surfaceVariant }]}>
             <MaterialCommunityIcons name="logout" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </Row>
      </Row>
    </View>
  );
};

export const CoordinatorStats = ({ cards }) => {
  const { theme, atomic } = useTheme();

  return (
    <Row justify="space-between" style={atomic.mb24} gap={10}>
      {cards.map((stat, idx) => (
        <Card key={idx} variant="raised" style={[atomic.l.flex, atomic.p12, atomic.aic]}>
          <View style={[atomic.p8, atomic.mb8, { borderRadius: 10, backgroundColor: stat.color + '15' }]}>
            <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
          </View>
          <Heading size="sm" style={{ color: theme.text }}>{stat.value}</Heading>
          <Text style={[atomic.t.tiny, { color: theme.textSecondary, textAlign: 'center' }]} numberOfLines={1}>{stat.label}</Text>
          {stat.trend && (
             <View style={[atomic.mt6, atomic.px8, atomic.py2, { borderRadius: 8, backgroundColor: theme.surfaceVariant }]}>
               <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.textSecondary }]}>{stat.trend.toUpperCase()}</Text>
             </View>
          )}
        </Card>
      ))}
    </Row>
  );
};

export const CoordinatorTeamCard = ({ team }) => {
  const { theme, atomic } = useTheme();

  const isBusy = team.status === 'busy';

  return (
    <Card variant="raised" style={[atomic.mb12, atomic.p16]}>
      <Row justify="space-between" align="center" style={atomic.mb8}>
        <Heading size="xs">{team.name}</Heading>
        <Tag 
          label={isBusy ? 'DEPLOYED' : 'AVAILABLE'} 
          color={isBusy ? theme.error : theme.success} 
          variant="solid" 
        />
      </Row>
      <Text style={[atomic.t.caption, atomic.mb12, { color: theme.textSecondary }]}>
        {team.unit || 'Standard Response Unit'} • {team.active_runs > 0 ? `${team.active_runs} active incidents` : 'Ready for deployment'}
      </Text>
      <Row align="center" gap={-8}>
        {[1, 2, 3].map(i => (
          <View key={i} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: theme.surfaceVariant, borderWidth: 2, borderColor: theme.surface }} />
        ))}
        <Text style={[atomic.t.tiny, atomic.ml16, { color: theme.textMuted }]}>Team Members</Text>
      </Row>
    </Card>
  );
};
