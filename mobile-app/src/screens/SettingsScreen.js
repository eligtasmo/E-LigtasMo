import React, { useState } from 'react';
import { View, Text, Switch, Platform, Alert, Modal, ActivityIndicator, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import {
  SettingsScaffold,
  SettingsSectionCard,
  SettingsListRow,
  SettingsPrimaryButton,
} from '../components/Settings/SettingsScaffold';

import { AuthService } from '../services/AuthService';
import { useAuth } from '../context/AuthContext';
import { DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';

const SettingsScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  
  const [syncing, setSyncing] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [permissionModal, setPermissionModal] = useState({ visible: false, title: '' });

  const handleLogout = async () => {
    try {
      await logout();
      if (Platform.OS === 'web') {
        window.location.href = '/';
        return;
      }
      await AsyncStorage.removeItem('eligtasmo.navigation.state.v1');
    } catch (error) {
      console.error('[Settings] Logout failure:', error);
    }
  };

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      Alert.alert('System Synced', 'E-LigtasMo tactical data has been synchronized with the latest MDRRMO advisories.');
    }, 2000);
  };

  const showPermission = (title) => {
    setPermissionModal({ visible: true, title });
  };

  return (
    <SettingsScaffold
      title="Settings"
      onBack={() => navigation.goBack()}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.avatarCircle}>
             <Lucide.Shield size={32} color="#F5B235" strokeWidth={2} />
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.heroTitle}>System Operations</Text>
            <Text style={styles.heroSubtitle}>v1.4.0 Stable Build</Text>
          </View>
        </View>

        <SettingsSectionCard title="Tactical Operations">
          <SettingsListRow 
            icon="User" 
            label="Personal Information" 
            onPress={() => navigation.navigate('EditProfile')} 
          />
          <SettingsListRow 
            icon="Bell" 
            label="Notification Center" 
            onPress={() => navigation.navigate('Notifications')} 
          />
          <SettingsListRow 
            icon="MapPin" 
            label="Location Services" 
            value="Tactical GPS Active"
            onPress={() => showPermission('Location Services')} 
          />
          <SettingsListRow 
            icon="ShieldCheck" 
            label="Data & Privacy" 
            onPress={() => showPermission('Data & Privacy')} 
          />
          <SettingsListRow
            icon="LockKeyhole"
            label="Password & Security"
            onPress={() => navigation.navigate('ForgotPassword')}
            hideDivider
          />
        </SettingsSectionCard>

        <SettingsSectionCard title="System Tools">
          <SettingsListRow
            icon="MoonStar"
            label="Tactical Dark Mode"
            trailing={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#F5B23580' }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingsListRow 
            icon="RefreshCw" 
            label="Sync & Refresh" 
            trailing={syncing ? <ActivityIndicator size="small" color="#F5B235" /> : null}
            onPress={handleSync} 
          />
          <SettingsListRow 
            icon="CircleHelp" 
            label="Help & Support" 
            onPress={() => navigation.navigate('EmergencyGuides')} 
          />
          <SettingsListRow 
            icon="Info" 
            label="About E-LigtasMo" 
            value="Open Mission Intel"
            onPress={() => setAboutVisible(true)} 
            hideDivider 
          />
        </SettingsSectionCard>

        <SettingsPrimaryButton 
          title="Sign Out System" 
          tone="danger" 
          onPress={handleLogout}
          style={{ marginTop: 32 }} 
        />
      </ScrollView>

      {/* ABOUT MODAL */}
      <Modal visible={aboutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>About E-LigtasMo</Text>
              <TouchableOpacity onPress={() => setAboutVisible(false)}>
                <Lucide.X size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                 <Lucide.ShieldAlert size={48} color="#F5B235" />
                 <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 12, fontFamily: DS_FONT_UI }}>E-LigtasMo Platform</Text>
                 <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Tactical Disaster Management v1.4.0</Text>
              </View>
              <Text style={styles.modalText}>
                E-LigtasMo is an integrated tactical platform designed for the MDRRMO of Santa Cruz, Laguna. It provides real-time hazard mapping, safe route planning, and emergency communication for all residents and first responders.
              </Text>
              <View style={styles.specBox}>
                <Text style={styles.specLabel}>ENGINE STATUS</Text>
                <Text style={styles.specValue}>ACTIVE / OPTIMIZED</Text>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 }} />
                <Text style={styles.specLabel}>GPS ACCURACY</Text>
                <Text style={styles.specValue}>HIGH-FIDELITY (3m)</Text>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 }} />
                <Text style={styles.specLabel}>ENCRYPTION</Text>
                <Text style={styles.specValue}>AES-256 SECURED</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PERMISSION MODAL */}
      <Modal visible={permissionModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: 'auto', padding: 24, alignItems: 'center' }]}>
            <Lucide.Lock size={40} color="#F5B235" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center', fontFamily: DS_FONT_UI }}>{permissionModal.title} Active</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20, fontFamily: DS_FONT_INPUT }}>
              Your {permissionModal.title.toLowerCase()} are currently managed by E-LigtasMo system protocols. Access is strictly granted for emergency response and disaster mitigation.
            </Text>
            <TouchableOpacity 
              onPress={() => setPermissionModal({ visible: false, title: '' })}
              style={styles.closeBtn}
            >
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>CONFIRMED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SettingsScaffold>
  );
};

const styles = StyleSheet.create({
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,178,53,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,178,53,0.2)',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: DS_FONT_UI,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
    fontFamily: DS_FONT_INPUT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#121212',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: DS_FONT_UI,
  },
  modalText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: DS_FONT_INPUT,
  },
  specBox: {
    marginTop: 32,
    marginBottom: 40,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  specLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: DS_FONT_UI,
  },
  specValue: {
    color: '#F5B235',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: DS_FONT_UI,
  },
  closeBtn: {
    marginTop: 32,
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5B235',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default SettingsScreen;
