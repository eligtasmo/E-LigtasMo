import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col, Heading, PrimaryButton } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';
import * as Lucide from 'lucide-react-native';

export const ReportActions = ({ 
  status, 
  isFlood, 
  onApprove, 
  onReject, 
  onResolve, 
  updating 
}) => {
  const { theme, atomic } = useTheme();

  const isVerified = status === 'Verified' || status === 'Approved' || status === 'Resolved';
  const isResolved = status === 'Resolved';
  const isRejected = status === 'Rejected';

  return (
    <Card 
        variant="glass" 
        shadowIntensity="none" 
        style={{ 
            padding: 24, 
            borderRadius: 24, 
            borderWidth: 1.5, 
            borderColor: theme.border,
            backgroundColor: theme.surfaceVariant 
        }}
    >
      <Heading size="sm" style={{ marginBottom: 20 }}>COMMAND CENTER ACTIONS</Heading>
      
      <Row gap={12}>
        {!isVerified && !isRejected && (
          <TouchableOpacity 
            style={{ 
                flex: 1, 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingVertical: 14, 
                borderRadius: 16, 
                backgroundColor: theme.primary,
                ...theme.shadows.sm
            }}
            onPress={onApprove}
            disabled={updating}
          >
            <Lucide.ShieldCheck size={20} color={theme.mode === 'dark' ? '#000' : '#fff'} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.mode === 'dark' ? '#000' : '#fff', marginLeft: 8, letterSpacing: 0.5 }}>VERIFY</Text>
          </TouchableOpacity>
        )}

        {!isFlood && !isResolved && !isRejected && (
          <TouchableOpacity 
            style={{ 
                flex: 1, 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingVertical: 14, 
                borderRadius: 16, 
                backgroundColor: theme.success,
                ...theme.shadows.sm
            }}
            onPress={onResolve}
            disabled={updating}
          >
            <Lucide.CheckCircle size={20} color="#fff" strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff', marginLeft: 8, letterSpacing: 0.5 }}>RESOLVE</Text>
          </TouchableOpacity>
        )}

        {!isRejected && !isResolved && (
          <TouchableOpacity 
            style={{ 
                flex: 1, 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingVertical: 14, 
                borderRadius: 16, 
                backgroundColor: theme.error + '10', 
                borderWidth: 1.5, 
                borderColor: theme.error 
            }}
            onPress={onReject}
            disabled={updating}
          >
            <Lucide.XCircle size={20} color={theme.error} strokeWidth={2.5} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.error, marginLeft: 8, letterSpacing: 0.5 }}>REJECT</Text>
          </TouchableOpacity>
        )}

        {(isVerified || isRejected) && (
          <View style={{ flex: 1, padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
              LOCKED STATUS: {status?.toUpperCase()}
            </Text>
          </View>
        )}
      </Row>
    </Card>
  );
};

export const SopManager = ({ runs, loading, onInitiate, onComplete }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card 
        variant="glass" 
        shadowIntensity="none" 
        style={{ 
            padding: 24, 
            borderRadius: 24, 
            borderWidth: 1.5, 
            borderColor: theme.border,
            backgroundColor: theme.surfaceVariant 
        }}
    >
      <Row justify="space-between" align="center" style={{ marginBottom: 20 }}>
        <Heading size="sm">SOP PROTOCOL</Heading>
        {runs.length === 0 && !loading && (
          <View style={{ backgroundColor: theme.textMuted + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted }}>INACTIVE</Text>
          </View>
        )}
      </Row>

      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : runs.length === 0 ? (
        <View style={{ padding: 16, alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary, textAlign: 'center', marginBottom: 16 }}>No Standard Operating Procedure has been initiated for this sector.</Text>
          <PrimaryButton title="Initiate Protocol" onPress={onInitiate} size="sm" lucideIcon="Zap" />
        </View>
      ) : (
        runs.map((run, idx) => (
          <View key={run.id} style={{ padding: 16, marginBottom: 10, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border }}>
             <Row justify="space-between" align="center">
                <Col>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, letterSpacing: 1 }}>RUN IDENTIFIER #{run.id}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 4 }}>{run.status_label || 'In Progress'}</Text>
                </Col>
                {run.status !== 'completed' && (
                  <TouchableOpacity 
                    onPress={() => onComplete(run.id)}
                    style={{ backgroundColor: theme.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, ...theme.shadows.xs }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>COMPLETE</Text>
                  </TouchableOpacity>
                )}
             </Row>
          </View>
        ))
      )}
    </Card>
  );
};
