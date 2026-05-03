import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage, ScrollView } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import * as Lucide from 'lucide-react-native';
import { MotiView } from 'moti';
import { DrawerActions } from '@react-navigation/native';

import { AuthService } from '../../services/AuthService';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../DesignSystem';

const CustomSidebar = (props) => {
  const { navigation, state } = props;
  const { theme } = useTheme();
  const { isMobile } = useResponsive();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AuthService.checkSession();
      if (userData) setUser(userData);
    };
    loadUser();
  }, []);

  const menuItems = [
    { label: 'Homepage', icon: Lucide.Home, route: 'Home' },
    { label: 'Live Hazard Map', icon: Lucide.Map, route: 'HazardMap' },
    { label: 'Safe Route Planner', icon: Lucide.Route, route: 'RoutePlanner' },
    { label: 'HERE Tactical Planner', icon: Lucide.Locate, route: 'HEREPlanner' },
    { label: 'Emergency Mode', icon: Lucide.Zap, route: 'QuickReport' },
    { label: 'Emergency Hotlines', icon: Lucide.Phone, route: 'EmergencyHotlines' },
    { label: 'Donation Drives', icon: Lucide.Heart, route: 'DonationDrives' },
    { label: 'Evacuation Centers', icon: Lucide.MapPin, route: 'Shelters' },
    { label: 'Community Chat', icon: Lucide.MessageSquare, route: 'Placeholder' },
    { label: 'Alerts & Notifications', icon: Lucide.Bell, route: 'Notifications' },
    { label: 'Disaster News & Updates', icon: Lucide.Newspaper, route: 'Announcements' },
  ];

  const activeRouteName = state.routeNames[state.index];

  return (
    <View style={styles.container}>

      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.closeDrawer())}
            style={styles.closeBtn}
          >
            <Lucide.X size={24} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <RNImage
              source={require('../../../assets/eligtasmo_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>E-LigtasMo</Text>
            <Text style={styles.brandTagline}>Your Disaster Safety Companion</Text>
          </View>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <RNImage
            source={user?.profile_image ? { uri: user.profile_image } : require('../../../assets/eligtasmo_logo.png')}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name || 'Darwin Piodos'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'darwinpiodos@gmail.com'}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => {
            const isActive = activeRouteName === item.route;
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  if (item.route === 'Home') {
                    // Role-aware homepage navigation
                    const role = String(user?.role || '').toLowerCase();
                    if (role === 'admin') navigation.navigate('AdminDashboard');
                    else if (role === 'coordinator') navigation.navigate('CoordinatorDashboard');
                    else if (role === 'brgy') navigation.navigate('BrgyDashboard');
                    else navigation.navigate('Main');
                  } else if (item.route !== 'Placeholder') {
                    navigation.navigate(item.route);
                  }
                }}
                activeOpacity={0.7}
                style={[
                  styles.menuItem,
                  isActive && styles.activeMenuItem
                ]}
              >
                <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                  <Icon size={18} color={isActive ? '#2A231C' : 'rgba(242,238,232,0.6)'} strokeWidth={2.2} />
                </View>
                <Text style={[
                  styles.menuLabel,
                  isActive && styles.activeMenuLabel
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Footer / Settings */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Lucide.Settings size={20} color="rgba(255,255,255,0.4)" strokeWidth={2} />
          <Text style={styles.settingsLabel}>Settings & Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  brandLogo: {
    width: 52,
    height: 52,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F4F0E8',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 9,
    color: 'rgba(242,238,230,0.45)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F1EA',
  },
  userEmail: {
    fontSize: 11,
    color: 'rgba(242,238,230,0.5)',
    marginTop: 1,
    fontWeight: '500',
  },
  menuList: {
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: '#F6F2EB',
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeIconContainer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(242,238,232,0.7)',
    marginLeft: 14,
    letterSpacing: -0.1,
  },
  activeMenuLabel: {
    color: '#2A231C',
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 12,
    color: 'rgba(242,238,230,0.4)',
    fontWeight: '700',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default CustomSidebar;
