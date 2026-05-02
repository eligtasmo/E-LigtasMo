import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const MetricsGrid = ({ metrics }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[atomic.row, { flexWrap: 'wrap', gap: 10, marginBottom: 24 }]}>
      {metrics.map((item, index) => (
        <View key={index} style={[atomic.p16, { width: '48%', backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, gap: 4 }]}>
          <Row justify="space-between" align="center" style={atomic.mb4}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textMuted }}>{item.label.toUpperCase()}</Text>
            <MaterialCommunityIcons name={item.icon} size={16} color={item.color} />
          </Row>
          <Text style={{ fontSize: 22, fontWeight: '400', color: theme.text }}>{item.value}</Text>
          <Text style={{ fontSize: 10, color: theme.textMuted }}>{item.sub}</Text>
        </View>
      ))}
    </View>
  );
};

export const AdminQuickActions = ({ actions }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[atomic.row, { flexWrap: 'wrap', gap: 10, marginBottom: 24 }]}>
      {actions.map((action, index) => (
        <TouchableOpacity 
          key={index} 
          onPress={action.onPress}
          style={[
            atomic.p12, 
            atomic.alignCenter,
            { 
              width: '48%', 
              backgroundColor: theme.surface, 
              borderRadius: 16, 
              borderWidth: 1, 
              borderColor: theme.border,
              flexDirection: 'row',
              justifyContent: 'flex-start',
              gap: 12
            }
          ]}
        >
          <View style={[
            atomic.justifyCenter, 
            atomic.aic, 
            { width: 36, height: 36, borderRadius: 10, backgroundColor: action.color + '08' }
          ]}>
            <MaterialCommunityIcons name={action.icon} size={20} color={action.color} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text, flex: 1 }}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
