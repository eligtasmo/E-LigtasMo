import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image as RNImage, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { MotiView } from 'moti';

import { AuthService } from '../services/AuthService';
import { useTheme } from '../context/ThemeContext';
import { Screen, Container, Row, Col, Card, DS_FONT_INPUT, DS_FONT_UI } from '../components/DesignSystem';
import { 
  SettingsScaffold, 
  SettingsSectionCard, 
  SettingsListRow,
  ProfileHeroCard 
} from '../components/Settings/SettingsScaffold';

const ACCENT = '#F5B235';

const ProfileScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const loadUserProfile = async () => {
        try {
          const userData = await AuthService.checkSession();
          if (userData) setUser(userData);
        } catch (error) {}
      };
      loadUserProfile();
    }, [])
  );

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      try { await logout(); window.location.href = '/'; } catch (e) {}
      return;
    }

    Alert.alert('Log Out', 'Are you sure you want to end your current session?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Log Out', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await logout();
            await AsyncStorage.removeItem('eligtasmo.navigation.state.v1');
          } catch (error) {}
        } 
      },
    ]);
  };

  const fullName = user?.full_name || 'Resident User';

  return (
    <SettingsScaffold
      title="Settings"
      onBack={() => navigation.goBack()}
      hideSubtitle
    >
      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.avatarContainer}
        >
          <RNImage 
            source={user?.profile_image ? { uri: user.profile_image } : require('../../assets/eligtasmo_logo.png')} 
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
            <Lucide.Camera size={16} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>
        </MotiView>
        <Text style={[styles.userName, { fontFamily: DS_FONT_UI }]}>{fullName}</Text>
        <Text style={[styles.userBio, { fontFamily: DS_FONT_INPUT }]}>Manage your personal details, contact info and password.</Text>
      </View>

      {/* Quick Actions */}
      <Row justify="center" gap={24} style={styles.quickActions}>
        <Col align="center">
          <TouchableOpacity style={styles.quickActionBtn}>
             <View style={styles.iconCircle}>
                <Lucide.FileText size={20} color="#000" strokeWidth={2.5} />
             </View>
          </TouchableOpacity>
          <Text style={[styles.quickActionLabel, { fontFamily: DS_FONT_UI }]}>About E-LigtasMo</Text>
        </Col>
        <Col align="center">
          <TouchableOpacity style={styles.quickActionBtn}>
             <View style={styles.iconCircle}>
                <Lucide.Bell size={20} color="#000" strokeWidth={2.5} />
             </View>
          </TouchableOpacity>
          <Text style={[styles.quickActionLabel, { fontFamily: DS_FONT_UI }]}>Notification</Text>
        </Col>
        <Col align="center">
          <TouchableOpacity style={styles.quickActionBtn}>
             <View style={styles.iconCircle}>
                <Lucide.CircleHelp size={20} color="#000" strokeWidth={2.5} />
             </View>
          </TouchableOpacity>
          <Text style={[styles.quickActionLabel, { fontFamily: DS_FONT_UI }]}>Help & Support</Text>
        </Col>
      </Row>

      <View style={styles.divider} />

      <SettingsSectionCard title="Account Details">
        <SettingsListRow icon="User" label="Personal Information" onPress={() => navigation.navigate('EditProfile')} />
        <SettingsListRow icon="MapPin" label="Location Services" onPress={() => {}} />
        <SettingsListRow icon="Lock" label="Data & Privacy" onPress={() => {}} />
        <SettingsListRow icon="RefreshCw" label="Sync & Refresh" onPress={() => {}} hideDivider />
      </SettingsSectionCard>

      <SettingsSectionCard title="System Actions" style={{ marginBottom: 40 }}>
        <SettingsListRow 
          icon="LogOut" 
          label="Log Out" 
          onPress={handleLogout} 
          color="#EF4444"
          hideDivider
        />
      </SettingsSectionCard>
    </SettingsScaffold>
  );
};

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(245, 178, 53, 0.3)',
    padding: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#080808',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
  },
  userBio: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
    fontWeight: '400',
    lineHeight: 16,
  },
  quickActions: {
    marginBottom: 32,
  },
  quickActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    marginBottom: 12,
  }
});

export default ProfileScreen;
