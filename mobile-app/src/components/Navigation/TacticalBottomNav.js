import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Lucide from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { MotiView } from 'moti';
import { Row } from '../DesignSystem';

const { width } = Dimensions.get('window');

const TacticalBottomNav = ({ navigation, activeRoute = 'Family' }) => {
  const { theme } = useTheme();

  const navItems = [
    { name: 'Home', icon: Lucide.LayoutGrid, route: 'Home' },
    { name: 'Map', icon: Lucide.Map, route: 'HazardMap' },
    { name: 'Family', icon: Lucide.Users, route: 'FamilyHub' },
    { name: 'Donations', icon: Lucide.Heart, route: 'DonationDrives' },
  ];

  return (
    <View style={styles.container}>
      <BlurView intensity={80} tint="dark" style={styles.navBar}>
        <Row align="center" gap={12} style={{ flex: 1, paddingHorizontal: 12 }}>
          {navItems.map((item) => {
            const isActive = activeRoute === item.name;
            const Icon = item.icon;

            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => navigation.navigate(item.route)}
                style={[
                  styles.navItem,
                  { backgroundColor: isActive ? '#B37213' : 'rgba(255,255,255,0.06)' }
                ]}
              >
                <Icon 
                  size={22} 
                  color={isActive ? '#000' : 'rgba(255,255,255,0.6)'} 
                  strokeWidth={isActive ? 3 : 2.2} 
                  fill={isActive ? '#000' : 'none'}
                />
              </TouchableOpacity>
            );
          })}
        </Row>

        {/* Hamburger / Menu Toggle */}
        <TouchableOpacity 
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
          <Lucide.Menu size={28} color="#000" strokeWidth={3} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 24,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 18, 16, 0.4)',
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 45,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden'
  },
  navItem: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#B37213',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B37213',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    marginRight: 6
  }
});

export default TacticalBottomNav;
