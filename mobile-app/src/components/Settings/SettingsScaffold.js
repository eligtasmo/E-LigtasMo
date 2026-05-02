import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Lucide from 'lucide-react-native';
import { MotiView } from 'moti';

import { useTheme } from '../../context/ThemeContext';
import { Screen, Container, TacticalCard, Row, Col, DS_FONT_INPUT, DS_FONT_UI } from '../DesignSystem';
import { TacticalHeader } from '../Home/TacticalComponents';

export const SettingsScaffold = ({
  title,
  subtitle,
  onBack,
  rightAction,
  hero,
  children,
  hideSubtitle,
  hideIcon
}) => {
  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Container style={{ paddingTop: 16, flex: 1 }}>
          <TacticalHeader 
            title={title} 
            subtitle={subtitle} 
            showBack={!!onBack}
            onBack={onBack}
            hideSubtitle={hideSubtitle}
            hideIcon={hideIcon}
          />

          <ScrollView 
            contentContainerStyle={{ paddingBottom: 120, paddingTop: 16 }} 
            showsVerticalScrollIndicator={false}
          >
            {hero}
            {children}
          </ScrollView>
        </Container>
      </SafeAreaView>
    </Screen>
  );
};

export const SettingsSectionCard = ({ title, children, style }) => {
  return (
    <View style={[{ marginTop: 24 }, style]}>
      {title && (
        <Text style={{ 
          color: 'rgba(255,255,255,0.4)', 
          fontSize: 10, 
          fontWeight: '700', 
          fontFamily: DS_FONT_UI, 
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 12,
          marginLeft: 4
        }}>
          {title}
        </Text>
      )}
      <TacticalCard noPadding style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
        {children}
      </TacticalCard>
    </View>
  );
};

export const SettingsListRow = ({
  icon,
  label,
  value,
  subtitle,
  trailing,
  onPress,
  hideDivider,
  color,
}) => {
  const Icon = Lucide[icon] || Lucide.Circle;
  const primaryColor = color || '#F4F0E8';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: color ? (color + '15') : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
         <Icon size={18} color={color || '#FFF'} strokeWidth={2.5} />
      </View>

      <Col style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: primaryColor, fontSize: 13, fontWeight: '600', fontFamily: DS_FONT_UI }}>{label}</Text>
        {subtitle ? (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '400', fontFamily: DS_FONT_INPUT, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
        {value ? (
          <Text style={{ color: '#F5B235', fontSize: 11, fontWeight: '600', fontFamily: DS_FONT_UI, marginTop: 2 }}>{value}</Text>
        ) : null}
      </Col>

      <View style={{ marginLeft: 8 }}>
        {trailing || (onPress && <Lucide.ChevronRight size={16} color="rgba(255,255,255,0.2)" strokeWidth={2.5} />)}
      </View>
      {!hideDivider && <View style={{ position: 'absolute', bottom: 0, left: 66, right: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
    </TouchableOpacity>
  );
};

export const ProfileHeroCard = ({ name, email, role, action }) => {
  return (
    <TacticalCard style={{ marginBottom: 16 }}>
      <Row align="center" gap={16}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
           <Text style={{ fontSize: 24, fontWeight: '700', color: '#000' }}>{(name || 'U').charAt(0)}</Text>
        </View>
        <Col style={{ flex: 1 }}>
          <Text style={{ color: '#F5B235', fontSize: 10, fontWeight: '700', fontFamily: DS_FONT_UI, textTransform: 'uppercase', letterSpacing: 1 }}>{role || 'Mission Profile'}</Text>
          <Text style={{ color: '#F4F0E8', fontSize: 18, fontWeight: '700', fontFamily: DS_FONT_UI, marginTop: 2 }}>{name}</Text>
          {email && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: DS_FONT_INPUT, marginTop: 2 }}>{email}</Text>}
        </Col>
      </Row>
    </TacticalCard>
  );
};

export const SettingsPrimaryButton = ({ title, onPress, tone = 'primary', style }) => {
  const isDanger = tone === 'danger';
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        { 
          height: 46, 
          borderRadius: 23, 
          backgroundColor: isDanger ? 'rgba(239,68,68,0.1)' : '#F5B235', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderWidth: isDanger ? 1 : 0,
          borderColor: isDanger ? 'rgba(239,68,68,0.2)' : 'transparent'
        },
        style
      ]}
    >
      <Text style={{ color: isDanger ? '#EF4444' : '#000', fontWeight: '700', fontSize: 13, fontFamily: DS_FONT_UI }}>{title}</Text>
    </TouchableOpacity>
  );
};
