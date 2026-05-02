import React from 'react';
import { View, Text, Image as RNImage, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const ProfileHero = ({ user, avatar, onEdit }) => {
  const { theme, atomic } = useTheme();

  const roleLabel = (user?.role || 'Resident').toString().charAt(0).toUpperCase() + (user?.role || 'Resident').toString().slice(1);
  const barangayLabel = user?.brgy_name || user?.barangay || 'Laguna Sector';

  return (
    <Card variant="glass" glow={true} style={{ padding: 20, marginBottom: 20 }}>
      <Row justify="space-between" align="center">
        <Row align="center" style={{ flex: 1 }}>
          <View style={{ position: 'relative' }}>
            <RNImage 
              source={{ uri: avatar }} 
              style={{ 
                width: 72, 
                height: 72, 
                borderRadius: 22, 
                borderWidth: 2, 
                borderColor: theme.secondary 
              }} 
            />
            <TouchableOpacity 
              onPress={onEdit}
              style={{ 
                position: 'absolute', 
                bottom: -2, 
                right: -2, 
                width: 28, 
                height: 28, 
                borderRadius: 10, 
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: theme.surface,
              }}
            >
              <Lucide.Camera size={12} color="#fff" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          <Col style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.secondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {roleLabel} Officer
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 2, letterSpacing: -0.5 }} numberOfLines={1}>
              {user?.full_name || 'Resident User'}
            </Text>
            <Row align="center" style={{ marginTop: 6 }}>
              <Lucide.MapPin size={10} color={theme.textMuted} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, marginLeft: 4 }}>{barangayLabel}</Text>
            </Row>
          </Col>
        </Row>
      </Row>

      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', 
        borderRadius: 18, 
        marginTop: 20, 
        padding: 16,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.glassBorder
      }}>
        <Col>
          <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Account Status</Text>
          <Row align="center" style={{ marginTop: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success, marginRight: 6 }} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>Verified</Text>
          </Row>
        </Col>
        <Col align="flex-end">
          <Text style={{ fontSize: 9, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Member Since</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginTop: 4 }}>2024</Text>
        </Col>
      </View>
    </Card>
  );
};
