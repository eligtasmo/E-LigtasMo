import React, { useEffect } from 'react';
import { View, Text, Image as RNImage, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { ShieldCheck } from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import { FONT_UI, FONT_BODY } from '../constants/typography';

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
      <StatusBar style="light" />

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
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
        <Text style={styles.copyright}>TACTICAL OPERATIONS ENGINE</Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    tintColor: '#FFFFFF', // Force white logo if it supports tinting
  },
  textWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: FONT_UI,
  },
  loaderLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 20,
    overflow: 'hidden',
    borderRadius: 1,
  },
  loaderActive: {
    width: 30,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  copyright: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: FONT_UI,
  },
});


export default LandingScreen;
