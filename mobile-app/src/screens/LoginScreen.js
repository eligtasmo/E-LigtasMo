import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image as RNImage, StyleSheet } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import { useAuth } from '../context/AuthContext';
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

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleAuth = async () => {
    if (!identity.trim() || !password.trim()) {
      setErrorText('Enter your credentials to continue.');
      return;
    }
    setLoading(true);
    setErrorText('');
    try {
      const result = await login(identity.trim(), password.trim());
      if (!result?.success) {
        setErrorText(result?.message || 'Invalid credentials.');
      }
    } catch (error) {
      setErrorText('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell title="Login" onBack={() => navigation.navigate('Landing')}>
      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 30 }}>
        <RNImage
          source={require('../../assets/eligtasmo_logo.png')}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT_MAIN, marginTop: 15, fontFamily: FONT_HEADING }}>E-LIGTASMO</Text>
        <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4, fontFamily: FONT_INPUT }}>Your Disaster Safety Companion</Text>
      </View>

      <AuthField label="Email" icon={Lucide.Mail}>
        <AuthTextInput
          value={identity}
          onChangeText={setIdentity}
          autoCapitalize="none"
          placeholder="Email or Phone Number"
        />
      </AuthField>

      <AuthField label="Password" icon={Lucide.Lock}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••••••"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
            {showPassword ? <Lucide.EyeOff size={20} color={TEXT_MUTED} /> : <Lucide.Eye size={20} color={TEXT_MUTED} />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setRememberMe(!rememberMe)}>
            <View style={{ 
                width: 18, 
                height: 18, 
                borderRadius: 4, 
                borderWidth: 1, 
                borderColor: BORDER, 
                marginRight: 8, 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: rememberMe ? ACCENT : 'transparent' 
            }}>
                {rememberMe && <Lucide.Check size={12} color="#000" strokeWidth={4} />}
            </View>
            <Text style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: FONT_INPUT }}>Remember Me</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT, fontFamily: FONT_INPUT }}>Forgot Password</Text>
        </TouchableOpacity>
      </View>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Login" onPress={handleAuth} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 40, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row' }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 13, fontFamily: FONT_INPUT }}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', fontFamily: FONT_INPUT }}>Create an Account</Text>
            </TouchableOpacity>
        </View>
      </View>
    </AuthScreenShell>
  );
};

export default LoginScreen;
