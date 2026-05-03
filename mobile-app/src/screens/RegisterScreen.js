import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import {
  AuthScreenShell,
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AUTH_COLORS,
  AUTH_FONTS,
} from '../components/Auth/AuthUI';

const { ACCENT, TEXT_MAIN, TEXT_MUTED, BORDER } = AUTH_COLORS;
const { FONT_HEADING, FONT_INPUT } = AUTH_FONTS;

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleNext = async () => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const result = await AuthService.sendOtp(cleanEmail, 'signup');
      if (result?.success) {
        navigation.navigate('VerifyOtp', { email: cleanEmail, mode: 'signup' });
      } else {
        setErrorText(result?.error || 'Unable to send verification code.');
      }
    } catch (error) {
      setErrorText('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell title="Sign Up" onBack={() => navigation.navigate('Login')}>
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 30 }}>
        <RNImage
          source={require('../../assets/eligtasmo_logo.png')}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT_MAIN, marginTop: 15, fontFamily: FONT_HEADING }}>E-LIGTASMO</Text>
        <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4, fontFamily: FONT_INPUT }}>Your Disaster Safety Companion</Text>
      </View>

      <View style={{ marginBottom: 30, paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 15, color: TEXT_MAIN, textAlign: 'center', lineHeight: 22, fontFamily: FONT_INPUT, fontWeight: '600' }}>
            Start your registration
        </Text>
        <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20, marginTop: 8, fontFamily: FONT_INPUT }}>
            Enter your email address and we'll send you a verification code to get started.
        </Text>
      </View>

      <AuthField label="Email" icon={Lucide.Mail}>
        <AuthTextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="juan@example.com"
        />
      </AuthField>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Send Verification Code" onPress={handleNext} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 30, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row' }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 13, fontFamily: FONT_INPUT }}>Already a member? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', fontFamily: FONT_INPUT }}>Sign In</Text>
            </TouchableOpacity>
        </View>
      </View>
    </AuthScreenShell>
  );
};

export default RegisterScreen;
