import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image as RNImage } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import * as Lucide from 'lucide-react-native';
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
    { label: 'Dashboard', icon: Lucide.LayoutDashboard, route: 'Home' },
    { label: 'Hazard Map', icon: Lucide.Map, route: 'HazardMap' },
    { label: 'Safe Routes', icon: Lucide.Route, route: 'RoutePlanner' },
    { label: 'Shelters', icon: Lucide.Shield, route: 'Shelters' },
    { label: 'Announcements', icon: Lucide.Bell, route: 'Notifications' },
    { label: 'Emergency Guides', icon: Lucide.BookOpen, route: 'Announcements' },
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
            <Lucide.X size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.brandContainer}>
            <RNImage
              source={require('../../../assets/eligtasmo_logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>E-LigtasMo</Text>
            <Text style={styles.brandTagline}>Mission Ready Platform</Text>
          </View>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.avatar}>
              <Lucide.User size={20} color="#16A34A" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.full_name || 'Unit Responder'}</Text>
              <Text style={styles.userRole}>{user?.role || 'Volunteer'}</Text>
            </View>
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
                    const role = String(user?.role || '').toLowerCase();
                    if (role === 'admin') navigation.navigate('AdminDashboard');
                    else if (role === 'coordinator') navigation.navigate('CoordinatorDashboard');
                    else if (role === 'brgy') navigation.navigate('BrgyDashboard');
                    else navigation.navigate('Main');
                  } else {
                    navigation.navigate(item.route);
                  }
                }}
                activeOpacity={0.7}
                style={[
                  styles.menuItem,
                  isActive && styles.activeMenuItem
                ]}
              >
                <Icon size={20} color={isActive ? '#FFFFFF' : '#4B5563'} strokeWidth={2.5} />
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

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Lucide.Settings size={18} color="#9CA3AF" />
          <Text style={styles.settingsLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    padding: 8,
  },
  brandContainer: {
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: 140,
    height: 40,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  profileSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  userRole: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  menuList: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeMenuItem: {
    backgroundColor: '#16A34A',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginLeft: 12,
  },
  activeMenuLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
});

export default CustomSidebar;
