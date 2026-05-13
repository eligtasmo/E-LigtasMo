import React, { useEffect } from 'react';
import { View, Text, Image as RNImage, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { AuthService } from '../services/AuthService';
import { FONT_UI } from '../constants/typography';

const LandingScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const user = await AuthService.checkSession();
        if (user) {
          const role = String(user.role).toLowerCase();
          if (role === 'admin') navigation.replace('AdminDashboard');
          else if (role === 'coordinator') navigation.replace('CoordinatorDashboard');
          else if (role === 'brgy') navigation.replace('BrgyDashboard');
          else navigation.replace('Main');
        } else {
          navigation.replace('Login');
        }
      } catch (error) {
        navigation.replace('Login');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 1200 }}
          style={styles.logoContainer}
        >
          <RNImage source={require('../../assets/eligtasmo_logo.png')} style={styles.logo} resizeMode="contain" />
        </MotiView>

        <MotiView
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'timing', duration: 800, delay: 500 }}
          style={styles.textWrap}
        >
          <Text style={styles.title}>E-LigtasMo</Text>
          <View style={styles.loaderLine}>
            <MotiView
              from={{ translateX: -60 }}
              animate={{ translateX: 60 }}
              transition={{ type: 'timing', duration: 1500, loop: true }}
              style={styles.loaderActive}
            />
          </View>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 1000, delay: 1000 }}
        style={styles.footer}
      >
        <Text style={styles.copyright}>MISSION READY PLATFORM</Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 60,
  },
  textWrap: {
    marginTop: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: FONT_UI,
  },
  loaderLine: {
    width: 60,
    height: 3,
    backgroundColor: '#F3F4F6',
    marginTop: 24,
    overflow: 'hidden',
    borderRadius: 2,
  },
  loaderActive: {
    width: 30,
    height: '100%',
    backgroundColor: '#16A34A',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: FONT_UI,
  },
});

export default LandingScreen;
