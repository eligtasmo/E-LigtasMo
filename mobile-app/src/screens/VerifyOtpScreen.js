import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import {
  AuthScreenShell,
  AuthGlassCard,
  AuthPrimaryAction,
  AuthTextInput,
  AUTH_COLORS,
  AUTH_FONTS,
} from '../components/Auth/AuthUI';

const { TEXT_MUTED, ACCENT } = AUTH_COLORS;
const { FONT_HEADING, FONT_INPUT } = AUTH_FONTS;

const OTP_LENGTH = 6;

const VerifyOtpScreen = ({ navigation, route }) => {
  const { email, mode = 'signup' } = route.params || {};
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => setTimer((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text, index) => {
    const nextChar = String(text || '').replace(/[^\d]/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = nextChar;
    setOtp(nextOtp);
    if (nextChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus?.();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setErrorText('Enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const result = await AuthService.verifyOtp(email, code);
      if (!result?.success) {
        setErrorText(result?.error || 'The verification code is invalid.');
        return;
      }

      if (mode === 'reset') {
        navigation.replace('ResetPassword', { email, code });
      } else {
        navigation.replace('RegisterDetails', { email, code });
      }
    } catch (error) {
      setErrorText('Unable to verify the code right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    setOtp(Array(OTP_LENGTH).fill(''));
    try {
      await AuthService.sendOtp(email, mode === 'reset' ? 'reset' : 'signup');
    } catch (error) {
      setErrorText('We could not resend the code right now.');
    }
  };

  return (
    <AuthScreenShell title="Verify Account" onBack={() => navigation.goBack()} step={2} totalSteps={4}>
      <View style={{ alignItems: 'flex-start', marginTop: 10, marginBottom: 30 }}>
        <RNImage
          source={require('../../assets/eligtasmo_logo.png')}
          style={{ width: 64, height: 64, marginBottom: 20 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', fontFamily: FONT_INPUT, lineHeight: 22 }}>
            Enter the confirmation code sent to{'\n'}
            <Text style={{ fontWeight: '600', color: '#FFFFFF' }}>{email}</Text>
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 32 }}>
        {otp.map((digit, index) => (
        <View
            key={index}
            style={{
            flex: 1,
            height: 52,
            borderRadius: 4,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: digit ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            }}
        >
            <AuthTextInput
            ref={(ref) => { inputRefs.current[index] = ref; }}
            value={digit}
            onChangeText={(text) => handleOtpChange(text, index)}
            keyboardType="number-pad"
            maxLength={1}
            style={{ fontSize: 22, fontWeight: '700', textAlign: 'center', width: '100%', color: '#FFFFFF', fontFamily: FONT_HEADING }}
            />
        </View>
        ))}
      </View>

      {errorText ? (
        <View style={{ padding: 12, marginBottom: 20, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{errorText}</Text>
        </View>
      ) : null}

      <AuthPrimaryAction title="Verify" onPress={handleVerify} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 30 }}>
          <Text style={{ color: '#737373', fontSize: 14, fontFamily: FONT_INPUT, marginBottom: 8 }}>
            Didn't receive a code?
          </Text>
          {timer > 0 ? (
              <Text style={{ color: '#A3A3A3', fontSize: 14, fontFamily: FONT_INPUT }}>{`Resend in ${timer}s`}</Text>
          ) : (
              <TouchableOpacity onPress={handleResend}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14, fontFamily: FONT_INPUT, textDecorationLine: 'underline' }}>Resend</Text>
              </TouchableOpacity>
          )}
      </View>
    </AuthScreenShell>
  );
};


export default VerifyOtpScreen;
