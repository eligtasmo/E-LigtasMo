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

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0, scale: 0.8, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000 }}
          style={styles.logoContainer}
        >
          <View style={styles.logoHex}>
            <RNImage source={require('../../assets/eligtasmo_logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.logoPulse} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 1000, delay: 300 }}
          style={styles.textWrap}
        >
          <Text style={styles.title}>E-LigtasMo</Text>
          <Text style={styles.subtitle}>OPERATIONS CENTER</Text>
          <View style={styles.divider} />
          <Text style={styles.caption}>INTELLIGENT DISASTER RESPONSE SYSTEM</Text>
        </MotiView>
      </View>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 1000, delay: 600 }}
        style={styles.footer}
      >
        <View style={styles.statusIndicator}>
          <ShieldCheck size={16} color="#B37213" />
          <MotiText
            from={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
            style={styles.statusText}
          >
            SECURE SESSION INITIALIZED
          </MotiText>
        </View>
        <Text style={styles.copyright}>LGU SANTA CRUZ • ELIGTASMO ENGINE</Text>
      </MotiView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(179, 114, 19, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(179, 114, 19, 0.05)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHex: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    zIndex: 2,
  },
  logo: {
    width: 80,
    height: 80,
  },
  logoPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 40,
    backgroundColor: 'rgba(179, 114, 19, 0.1)',
    zIndex: 1,
  },
  textWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: FONT_UI,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    letterSpacing: 3,
    fontFamily: FONT_UI,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#B37213',
    marginVertical: 24,
  },
  caption: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: FONT_UI,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: FONT_UI,
  },
  copyright: {
    marginTop: 20,
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
    letterSpacing: 1.5,
    fontFamily: FONT_UI,
  },
});

export default LandingScreen;
