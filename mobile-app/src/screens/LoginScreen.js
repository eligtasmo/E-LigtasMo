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
    <AuthScreenShell title="Sign In">
      <View style={{ marginTop: 10 }}>
        <AuthField label="Email or Username" required>
          <AuthTextInput
            value={identity}
            onChangeText={setIdentity}
            onClear={() => setIdentity('')}
            autoCapitalize="none"
            placeholder="Enter your email"
          />
        </AuthField>

        <AuthField label="Password" required>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AuthTextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              {showPassword ? <Lucide.EyeOff size={22} color="#FFFFFF" /> : <Lucide.Eye size={22} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </AuthField>

        <View style={{ alignItems: 'flex-end', marginBottom: 32 }}>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: FONT_INPUT, textDecorationLine: 'underline' }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {errorText ? (
          <View style={{ padding: 12, marginBottom: 24, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 4, borderWidth: 1, borderColor: '#EF4444' }}>
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{errorText}</Text>
          </View>
        ) : null}

        <AuthPrimaryAction title="Sign In" onPress={handleAuth} loading={loading} />

        <View style={{ alignItems: 'center', marginTop: 40, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 15, fontFamily: FONT_INPUT }}>New to E-LigtasMo? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: FONT_INPUT, textDecorationLine: 'underline' }}>Create Account</Text>
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </AuthScreenShell>
  );
};



export default LoginScreen;
