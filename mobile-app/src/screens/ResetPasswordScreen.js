import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Text, Image as RNImage } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import {
  AuthScreenShell,
  AuthGlassCard,
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AUTH_FONTS,
  AUTH_COLORS,
} from '../components/Auth/AuthUI';

const { FONT_HEADING, FONT_INPUT } = AUTH_FONTS;
const { TEXT_MUTED, ACCENT } = AUTH_COLORS;

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email, code } = route.params || {};
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorText('Please complete both fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const result = await AuthService.resetPassword(email, code, newPassword, confirmPassword);
      if (result?.success) {
        Alert.alert('Security Updated', 'Your password has been reset successfully.', [
          { text: 'Login', onPress: () => navigation.replace('Login') },
        ]);
      } else {
        setErrorText(result?.message || 'We could not update your password.');
      }
    } catch (error) {
      setErrorText('Unable to update password right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell title="Reset Password" onBack={() => navigation.goBack()}>
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
            Create a new password for your account
        </Text>
      </View>

      <AuthField label="New password" icon={Lucide.Lock}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder="••••••••••••"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ padding: 8 }}>
            {showNewPassword ? <Lucide.EyeOff size={20} color="rgba(255,255,255,0.4)" /> : <Lucide.Eye size={20} color="rgba(255,255,255,0.4)" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthField label="Confirm password" icon={Lucide.Lock}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="••••••••••••"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 8 }}>
            {showConfirmPassword ? <Lucide.EyeOff size={20} color="rgba(255,255,255,0.4)" /> : <Lucide.Eye size={20} color="rgba(255,255,255,0.4)" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Reset password" onPress={handleReset} loading={loading} />

      <View style={{ alignItems: 'center', marginTop: 30 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: ACCENT, fontSize: 15, fontWeight: '700', fontFamily: FONT_INPUT }}>Back to login</Text>
          </TouchableOpacity>
      </View>
    </AuthScreenShell>
  );
};

export default ResetPasswordScreen;
