import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col } from '../DesignSystem';

/**
 * Standardized List Row for reports, contacts, settings
 */
export const ListItem = ({ icon, title, subtitle, rightElement, onPress, destructive = false }) => {
  const { theme, atomic } = useTheme();
  
  return (
    <TouchableOpacity onPress={onPress}>
      <Row align="center" style={[atomic.py16, atomic.px4, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        {icon && (
          <View style={[atomic.p8, atomic.roundMd, atomic.mr12, { backgroundColor: theme.surfaceVariant }]}>
            <MaterialCommunityIcons name={icon} size={20} color={destructive ? theme.error : theme.primary} />
          </View>
        )}
        <Col style={atomic.l.flex}>
          <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>{title}</Text>
          {subtitle && <Text style={[atomic.t.small, { color: theme.textSecondary }]}>{subtitle}</Text>}
        </Col>
        {rightElement || <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />}
      </Row>
    </TouchableOpacity>
  );
};

/**
 * Modern Search Panel (Floating & Glassmorphic)
 */
export const SearchPanel = ({ value, onChangeText, placeholder, icon = 'magnify', rightElement }) => {
  const { theme, atomic } = useTheme();
  
  return (
    <Card variant="raised" style={[atomic.l.row, atomic.alignCenter, atomic.px12, atomic.py8, { borderRadius: 999 }]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.textMuted} style={atomic.mr8} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          style={[atomic.l.flex, atomic.t.body, { color: theme.text, height: 40 }]}
        />
        {rightElement}
    </Card>
  );
};

/**
 * Standardized Map Controls
 */
export const MapControl = ({ icon, onPress, variant = 'default' }) => {
  const { theme, atomic } = useTheme();
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        atomic.p12, 
        atomic.roundFull, 
        atomic.mb8,
        atomic.e.shadowSm,
        { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={variant === 'primary' ? theme.primary : theme.text} />
    </TouchableOpacity>
  );
};

/**
 * Info Tag / Small Badge
 */
export const Tag = ({ label, color, icon }) => {
  const { theme, atomic } = useTheme();
  
  return (
    <Row align="center" style={[atomic.px8, atomic.py4, atomic.roundFull, { backgroundColor: color + '15', borderWidth: 1, borderColor: color + '30' }]}>
      {icon && <MaterialCommunityIcons name={icon} size={12} color={color} style={atomic.mr4} />}
      <Text style={[atomic.t.small, atomic.t.bold, { color }]}>{label}</Text>
    </Row>
  );
};
