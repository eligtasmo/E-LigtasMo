import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MotiView } from 'moti';
import * as Lucide from 'lucide-react-native';
import { DS_FONT_UI } from './DesignSystem';

const { width } = Dimensions.get('window');
const TAB_HEIGHT = Platform.OS === 'ios' ? 62 : 58;

const CurvedTabBar = ({ state, descriptors, navigation, role = 'resident' }) => {
  const { theme, isDark, atomic } = useTheme();
  const insets = useSafeAreaInsets();
  
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  if (focusedOptions.tabBarVisible === false) return null;

  const tabConfigs = useMemo(() => {
    let configs = [];
    switch (role) {
      case 'admin':
        configs = [
          { route: 'Dashboard', icon: 'LayoutGrid', label: 'Home' },
          { route: 'Report', icon: 'ShieldAlert', label: 'Report' },
          { route: 'AdminAction', icon: 'Radar', label: 'Field', isCenter: true },
          { route: 'Users', icon: 'Users', label: 'Users' },
          { route: 'Settings', icon: 'Settings2', label: 'Settings' },
        ];
        break;
      case 'coordinator':
        configs = [
          { route: 'Dashboard', icon: 'LayoutGrid', label: 'Home' },
          { route: 'Report', icon: 'ShieldAlert', label: 'Report' },
          { route: 'CoordinatorAction', icon: 'Route', label: 'Routes', isCenter: true },
          { route: 'Reports', icon: 'FileStack', label: 'Reports' },
          { route: 'Profile', icon: 'Settings2', label: 'Settings' },
        ];
        break;
      case 'brgy':
        configs = [
          { route: 'Dashboard', icon: 'LayoutGrid', label: 'Home' },
          { route: 'Report', icon: 'ShieldAlert', label: 'Report' },
          { route: 'BrgyAction', icon: 'Navigation', label: 'Evac', isCenter: true },
          { route: 'Verify', icon: 'ClipboardCheck', label: 'Settings' },
          { route: 'Alerts', icon: 'Settings2', label: 'Alerts' },
        ];
        break;
      default: // resident
        configs = [
          { route: 'Home', icon: 'LayoutGrid', label: 'Home' },
          { route: 'Report', icon: 'ShieldAlert', label: 'Report' },
          { route: 'SafeRoutes', icon: 'Route', label: 'Routes', isCenter: true },
          { route: 'Donations', icon: 'HeartPulse', label: 'Donation' },
          { route: 'Profile', icon: 'Settings2', label: 'Settings' },
        ];
        break;
    }

    return configs;
  }, [role, state.index, state.routes]);

  return (
    <View style={[styles.mainContainer, { bottom: 0 }]}>
      <View style={[
        styles.barWrapper,
        { 
          backgroundColor: theme.surface,
          paddingBottom: insets.bottom > 20 ? insets.bottom - 12 : insets.bottom,
          height: TAB_HEIGHT + (insets.bottom > 20 ? insets.bottom - 12 : insets.bottom),
        }
      ]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = tabConfigs[index];
          if (!config) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (config.isTacticalOverride) {
              navigation.navigate('ReportIncident');
              return;
            }

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const IconComp = Lucide[config.icon] || Lucide.Home;
          const isRoute = config.icon === 'Route' || config.icon === 'Navigation' || config.icon === 'Radar';

          if (config.isCenter) {
            return (
              <TouchableOpacity 
                key={route.key}
                onPress={onPress} 
                activeOpacity={0.9} 
                style={styles.centerTab}
              >
                <MotiView
                  animate={{ scale: isFocused ? 1.05 : 1 }}
                  style={[
                    styles.centerCircle, 
                    { backgroundColor: config.isTacticalOverride ? '#EF4444' : '#FFFFFF' },
                    config.isTacticalOverride && { shadowColor: '#EF4444' }
                  ]}
                >
                  <IconComp size={28} color={isRoute ? '#000000' : '#000000'} strokeWidth={3} />
                </MotiView>
                <Text style={[styles.tabLabel, { color: '#FFFFFF', textAlign: 'center' }]}>
                  {config.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <MotiView 
                animate={{ opacity: isFocused ? 1 : 0.7 }}
                style={{ alignItems: 'center', justifyContent: 'center' }}
              >
                <IconComp 
                  size={24} 
                  color="#FFFFFF" 
                  strokeWidth={isFocused ? 2.8 : 2.2} 
                />
                <Text style={[styles.tabLabel, { 
                  fontWeight: isFocused ? '800' : '600', 
                  color: '#FFFFFF',
                }]}>
                  {config.label}
                </Text>
              </MotiView>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = {
  mainContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  barWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabItem: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTab: {
    marginTop: -30,
    zIndex: 2,
  },
  centerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#B37213',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0A0A0A',
    shadowColor: '#B37213',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
    fontFamily: DS_FONT_UI,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B37213',
  },
};

export default CurvedTabBar;
