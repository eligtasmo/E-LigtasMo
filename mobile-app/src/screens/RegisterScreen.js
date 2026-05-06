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
    <AuthScreenShell title="Create Account" onBack={() => navigation.navigate('Login')} step={1} totalSteps={4}>
      <View style={{ marginTop: 10 }}>
        <AuthField 
          label="Email Address" 
          required
          hint="We'll send you a verification code to this address."
        >
          <AuthTextInput
            value={email}
            onChangeText={setEmail}
            onClear={() => setEmail('')}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />
        </AuthField>

        {errorText ? (
          <View style={{ padding: 12, marginBottom: 24, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 4, borderWidth: 1, borderColor: '#EF4444' }}>
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{errorText}</Text>
          </View>
        ) : null}

        <AuthPrimaryAction title="Next" onPress={handleNext} loading={loading} />

        <View style={{ alignItems: 'center', marginTop: 40, paddingBottom: 60 }}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 15, fontFamily: FONT_INPUT }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: FONT_INPUT, textDecorationLine: 'underline' }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AuthScreenShell>
  );
};



export default RegisterScreen;
