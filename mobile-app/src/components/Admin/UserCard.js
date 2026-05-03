import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const UserCard = ({ item, onEdit, onUpdateStatus, actionLoading }) => {
  const { theme, atomic } = useTheme();

  const getInitials = (name) => {
    const names = (name || '').split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return (name || 'U').slice(0, 2).toUpperCase();
  };

  const statusStyles = {
    approved: { bg: theme.successBg, fg: theme.success },
    pending: { bg: theme.warningBg, fg: theme.warning },
    rejected: { bg: theme.errorBg, fg: theme.error },
    active: { bg: theme.successBg, fg: theme.success },
    default: { bg: theme.surfaceVariant, fg: theme.textSecondary }
  };

  const currentStatus = (item.status || 'active').toLowerCase();
  const style = statusStyles[currentStatus] || statusStyles.default;

  return (
    <Card variant="raised" style={[atomic.p16, atomic.mb16]}>
      <Row align="center" style={atomic.mb12}>
        <View style={[
          atomic.justifyCenter, 
          atomic.alignCenter, 
          { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.primaryBg }
        ]}>
          <Text style={[atomic.t.body, atomic.t.heavy, { color: theme.primary }]}>{getInitials(item.full_name || item.username)}</Text>
        </View>
        <Col style={[atomic.l.flex, atomic.ml12]}>
          <Row justify="space-between" align="center">
            <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]} numberOfLines={1}>
              {item.full_name || item.username}
            </Text>
            <TouchableOpacity onPress={() => onEdit(item)} style={atomic.p4}>
              <MaterialCommunityIcons name="pencil" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </Row>
          <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.textSecondary, textTransform: 'uppercase' }]}>{item.role}</Text>
        </Col>
      </Row>

      <View style={atomic.gap10}>
        <Row align="center">
          <MaterialCommunityIcons name="email-outline" size={16} color={theme.textMuted} />
          <Text style={[atomic.t.caption, atomic.ml8, { color: theme.text }]}>{item.email}</Text>
        </Row>
        <Row align="center">
          <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.textMuted} />
          <Text style={[atomic.t.caption, atomic.ml8, { color: theme.text }]}>
            {item.brgy_name ? `${item.brgy_name}, ${item.city || ' Santa Cruz'}` : 'Location not set'}
          </Text>
        </Row>
      </View>

      <View style={[atomic.mt16, atomic.pt12, atomic.row, atomic.jcb, atomic.aic, { borderTopWidth: 1, borderTopColor: theme.border }]}>
        <Col>
          <View style={[atomic.px10, atomic.py4, { backgroundColor: style.bg, borderRadius: 8, alignSelf: 'flex-start' }]}>
            <Text style={[atomic.t.tiny, atomic.t.heavy, { color: style.fg }]}>{currentStatus.toUpperCase()}</Text>
          </View>
          {item.created_at && (
            <Text style={[atomic.t.tiny, { color: theme.textMuted, marginTop: 4 }]}>Joined: {new Date(item.created_at).toLocaleDateString()}</Text>
          )}
        </Col>

        <Row gap={8}>
          {currentStatus === 'pending' && (
            <>
              <TouchableOpacity 
                style={[atomic.px12, atomic.py6, { backgroundColor: theme.error, borderRadius: 8 }]}
                onPress={() => onUpdateStatus(item.id, 'rejected')}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[atomic.t.tiny, atomic.t.bold, { color: '#fff' }]}>Reject</Text>}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[atomic.px12, atomic.py6, { backgroundColor: theme.success, borderRadius: 8 }]}
                onPress={() => onUpdateStatus(item.id, 'approved')}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[atomic.t.tiny, atomic.t.bold, { color: '#fff' }]}>Approve</Text>}
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity 
            style={[atomic.p6, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }]}
            onPress={() => {
              const name = item.full_name || item.username;
              require('react-native').Alert.alert(
                'Delete User',
                `Are you sure you want to permanently delete ${name}? This action cannot be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => onUpdateStatus(item.id, 'delete') }
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        </Row>
      </View>
    </Card>
  );
};
