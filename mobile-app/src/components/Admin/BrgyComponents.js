import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Row, Col, Heading, Card, Container } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const BrgyHeader = ({ user, onLogout }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <Container style={{ paddingVertical: 12 }}>
        <Row justify="space-between" align="center">
          <Row align="center">
            <View style={[atomic.justifyCenter, atomic.aic, { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary + '08', borderWidth: 1.5, borderColor: theme.primary + '15' }]}>
              <Lucide.Building2 size={22} color={theme.primary} strokeWidth={2.5} />
            </View>
            <Col style={atomic.ml16}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.primary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {user?.barangay || user?.brgy_name || 'SECTOR OPS'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>Barangay Hall</Text>
            </Col>
          </Row>
          <TouchableOpacity 
            onPress={onLogout}
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: theme.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border
            }}
          >
            <Lucide.LogOut size={20} color={theme.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
        </Row>
      </Container>
    </View>
  );
};

export const BrgyStats = ({ count }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card variant="elevated" statusColor={theme.warning} style={{ padding: 24, borderRadius: 28 }} shadowIntensity="sm">
      <Row justify="space-between" align="center">
        <Col style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.warning, letterSpacing: 2 }}>PENDING INTEL</Text>
          <Text style={{ fontSize: 36, fontWeight: '600', color: theme.text, marginTop: 4 }}>{count}</Text>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.textMuted, marginTop: 2 }}>Reports awaiting verification</Text>
        </Col>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.warning + '10', justifyContent: 'center', alignItems: 'center' }}>
          <Lucide.ClipboardCheck size={24} color={theme.warning} strokeWidth={2.5} />
        </View>
      </Row>
    </Card>
  );
};

export const BrgyReportCard = ({ report, onVerify, onReject }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card 
      variant="elevated" 
      statusColor={theme.warning}
      style={{ padding: 0, borderRadius: 24, overflow: 'hidden' }}
      shadowIntensity="xs"
    >
      <View style={[atomic.p20]}>
        <Row justify="space-between" align="center" style={atomic.mb16}>
          <Row align="center">
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.warning + '08', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Lucide.AlertTriangle size={18} color={theme.warning} strokeWidth={2.5} />
            </View>
            <Col>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>{report.displayType} Incident</Text>
              <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>SECTOR REPORT</Text>
            </Col>
          </Row>
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.surfaceVariant }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary }}>FIELD DATA</Text>
          </View>
        </Row>

        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.textSecondary, lineHeight: 22, marginBottom: 16 }}>
          {report.description}
        </Text>

        <Row align="center" style={atomic.mb20}>
          <Lucide.MapPin size={14} color={theme.textMuted} strokeWidth={2.5} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, marginLeft: 6 }}>
            {report.location_text || (report.barangay ? `Brgy. ${report.barangay}` : 'Operational Zone')} • {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Row>

        <Row gap={12}>
          <TouchableOpacity 
            onPress={onVerify}
            style={{ flex: 1, height: 52, backgroundColor: theme.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', ...theme.shadows.xs }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', letterSpacing: 0.5 }}>VERIFY</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onReject}
            style={{ flex: 1, height: 52, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.error, letterSpacing: 0.5 }}>REJECT</Text>
          </TouchableOpacity>
        </Row>
      </View>
    </Card>
  );
};
