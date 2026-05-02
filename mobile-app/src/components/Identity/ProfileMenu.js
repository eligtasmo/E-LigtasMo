import React from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col, Divider } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const ProfileInfo = ({ user }) => {
  const { theme, atomic } = useTheme();

  return (
    <Card variant="glass" style={{ padding: 20, marginBottom: 20 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Emergency Contacts
      </Text>
      
      <Row align="center">
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
          <Lucide.Mail size={18} color={theme.primary} />
        </View>
        <Col style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' }}>OFFICIAL EMAIL</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2 }}>{user?.email || 'Add your email'}</Text>
        </Col>
      </Row>

      <Divider style={{ marginVertical: 16, opacity: 0.3 }} />

      <Row align="center">
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
          <Lucide.Phone size={18} color={theme.primary} />
        </View>
        <Col style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase' }}>MOBILE HOTLINE</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2 }}>{user?.contact_number || user?.phone || 'Add your phone'}</Text>
        </Col>
      </Row>
    </Card>
  );
};

export const ProfileMenuSection = ({ title, items }) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, marginBottom: 12, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {title}
      </Text>
      <Card variant="glass" style={{ paddingVertical: 4 }}>
        {items.map((item, index) => {
          const Icon = item.lucideIcon ? Lucide[item.lucideIcon] : Lucide.ChevronRight;
          return (
            <TouchableOpacity 
              key={index} 
              onPress={item.onPress}
              activeOpacity={0.7}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 16,
                borderBottomWidth: index === items.length - 1 ? 0 : 1, 
                borderBottomColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }}
            >
              <View style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 10, 
                backgroundColor: item.variant === 'danger' ? theme.error + '15' : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.lucideIcon ? <Icon size={18} color={item.variant === 'danger' ? theme.error : theme.text} strokeWidth={2} /> : null}
              </View>
              <Col style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: item.variant === 'danger' ? theme.error : theme.text }}>{item.label}</Text>
                {item.subtitle && <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{item.subtitle}</Text>}
              </Col>
              {item.rightElement || <Lucide.ChevronRight size={18} color={theme.textMuted} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </Card>
    </View>
  );
};
