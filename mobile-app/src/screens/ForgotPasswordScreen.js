import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import {
  AuthScreenShell,
  AuthGlassCard,
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AuthTextLink,
  AUTH_FONTS,
  AUTH_COLORS,
} from '../components/Auth/AuthUI';

const { FONT_HEADING, FONT_INPUT } = AUTH_FONTS;
const { TEXT_MUTED, ACCENT } = AUTH_COLORS;

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleGetOTP = async () => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setErrorText('Enter the email address linked to your account.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const result = await AuthService.sendOtp(cleanEmail, 'reset');
      if (result?.success) {
        navigation.navigate('VerifyOtp', { email: cleanEmail, mode: 'reset' });
      } else {
        setErrorText(result?.error || 'We could not send your reset code.');
      }
    } catch (error) {
      setErrorText('Unable to send the reset code right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell title="Forgot Password" onBack={() => navigation.goBack()}>
      <View style={{ alignItems: 'center', marginVertical: 30 }}>
        <RNImage
          source={require('../../assets/eligtasmo_logo.png')}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFF', marginTop: 15, letterSpacing: 0.5, fontFamily: FONT_HEADING }}>E-LigtasMo</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontFamily: FONT_INPUT }}>Your disaster safety companion</Text>
      </View>

      <View style={{ marginBottom: 30, paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22, fontFamily: FONT_INPUT }}>
            Enter your email address and we'll send you a confirmation code to reset your password
        </Text>
      </View>

      <AuthField label="Email" icon={Lucide.Mail}>
        <AuthTextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email or phone number"
        />
      </AuthField>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Send code" onPress={handleGetOTP} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 30 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: ACCENT, fontSize: 15, fontWeight: '700', fontFamily: FONT_INPUT }}>Back to login</Text>
          </TouchableOpacity>
      </View>
    </AuthScreenShell>
  );
};

export default ForgotPasswordScreen;
