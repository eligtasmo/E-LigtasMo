import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Badge, Col, Row } from '../DesignSystem';

export const ReportPreviewGrid = ({ reports, onReportPress }) => {
  const { theme, atomic } = useTheme();

  if (!reports || reports.length === 0) {
    return (
      <Card variant="flat" style={{ padding: 40, alignItems: 'center', borderStyle: 'dashed', borderRadius: 24, backgroundColor: theme.background }}>
        <LucideIcons.Search size={28} color={theme.textMuted} strokeWidth={2} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 16 }}>No recent tactical reports</Text>
      </Card>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
      {reports.slice(0, 4).map((report, index) => {
        const sev = String(report.severity || 'Info').toLowerCase();
        const variant = sev === 'critical' || sev === 'high' ? 'danger' : sev === 'moderate' || sev === 'medium' ? 'warning' : 'info';
        const sevColor = sev === 'critical' || sev === 'high' ? theme.error : sev === 'moderate' || sev === 'medium' ? theme.warning : theme.primary;
        
        const locationText = report.location_text || 
                            (report.barangay ? `Brgy. ${report.barangay}` : 'Laguna');

        return (
          <TouchableOpacity 
            key={report.id || index} 
            style={{ width: '50%', padding: 8 }}
            onPress={() => onReportPress(report)}
            activeOpacity={0.8}
          >
            <Card 
              variant="elevated" 
              statusColor={sevColor}
              shadowIntensity="xs"
              style={{ 
                height: 148, 
                borderRadius: 24, 
                borderWidth: 1,
                borderColor: theme.border,
                padding: 0,
              }}
            >
              <Col justify="space-between" style={{ height: '100%', padding: 16 }}>
                <View>
                  <Row align="center" justify="space-between" style={{ marginBottom: 12 }}>
                    <Badge label={sev.toUpperCase()} variant={variant} />
                    <LucideIcons.ArrowUpRight size={14} color={theme.textMuted} strokeWidth={3} />
                  </Row>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, lineHeight: 18 }} numberOfLines={2}>
                    {report.description || 'Sector Alert'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.8 }}>
                   <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginRight: 8 }} />
                   <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textSecondary, flex: 1, letterSpacing: 0.5 }} numberOfLines={1}>
                      {locationText.toUpperCase()}
                   </Text>
                </View>
              </Col>
            </Card>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
