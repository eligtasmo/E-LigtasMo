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
    <AuthScreenShell title="Verify Code" onBack={() => navigation.goBack()}>
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
            The confirmation code is sent to your email address
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 30 }}>
        {otp.map((digit, index) => (
        <View
            key={index}
            style={{
            flex: 1,
            height: 56,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: digit ? ACCENT : 'rgba(255,255,255,0.1)',
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
            style={{ fontSize: 24, fontWeight: '700', textAlign: 'center', width: '100%', color: digit ? ACCENT : '#FFF', fontFamily: FONT_HEADING }}
            />
        </View>
        ))}
      </View>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Confirm" onPress={handleVerify} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 30 }}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: FONT_INPUT }}>
            Didn't receive a code?{' '}
            {timer > 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_INPUT }}>{`Resend in ${timer}s`}</Text>
            ) : (
                <Text style={{ color: ACCENT, fontWeight: '700', fontFamily: FONT_INPUT }} onPress={handleResend}>Resend</Text>
            )}
          </Text>
      </View>
    </AuthScreenShell>
  );
};

export default VerifyOtpScreen;
