import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AdminHeader = ({ onSos, onLogout }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[{ backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <SafeAreaView edges={['top']} style={[atomic.px16, atomic.pb16, atomic.pt8]}>
        <Row justify="space-between" align="center">
          <Row align="center">
            <View style={[
              atomic.justifyCenter, 
              atomic.aic, 
              { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary + '08', borderWidth: 1.5, borderColor: theme.primary + '15' }
            ]}>
              <Lucide.ShieldCheck size={24} color={theme.primary} strokeWidth={2.5} />
            </View>
            <Col style={atomic.ml16}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: theme.primary, letterSpacing: 2, textTransform: 'uppercase' }}>COMMAND EOC</Text>
              <Heading size="xs" style={{ marginTop: 2 }}>MDRRMO Laguna</Heading>
            </Col>
          </Row>

          <Row align="center" gap={12}>
            <TouchableOpacity 
              onPress={onSos} 
              style={[
                atomic.row, 
                atomic.aic, 
                atomic.px12, 
                atomic.py8, 
                { backgroundColor: theme.error, borderRadius: 12, ...theme.shadows.xs }
              ]}
            >
              <Lucide.Phone size={14} color="#fff" strokeWidth={3} />
              <Text style={{ fontSize: 11, fontWeight: '600', marginLeft: 6, color: '#fff', letterSpacing: 1 }}>SOS</Text>
            </TouchableOpacity>
            
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
        </Row>
      </SafeAreaView>
    </View>
  );
};

const Heading = ({ children, style }) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 16, fontWeight: '600', color: theme.text }, style]}>{children}</Text>;
};
