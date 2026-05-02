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

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { firstName, email, password, confirmPassword } = formData;
    
    if (!firstName || !email || !password) {
        setErrorText('Please complete all fields.');
        return;
    }
    if (password !== confirmPassword) {
        setErrorText('Passwords do not match.');
        return;
    }
    if (!agree) {
        setErrorText('You must agree to the Terms & Conditions.');
        return;
    }

    setLoading(true);
    setErrorText('');
    
    try {
        const res = await fetch(`${AuthService.API_URL}/register.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: firstName,
                email: email,
                password: password,
                role: 'resident'
            })
        });
        const data = await res.json();
        
        if (data.success) {
            navigation.replace('Login');
        } else {
            setErrorText(data.message || 'Registration failed.');
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

      <AuthField label="Name" icon={Lucide.User}>
        <AuthTextInput
          value={formData.firstName}
          onChangeText={(text) => updateField('firstName', text)}
          placeholder="Full Name"
        />
      </AuthField>

      <AuthField label="Email" icon={Lucide.Mail}>
        <AuthTextInput
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          autoCapitalize="none"
          placeholder="Email or Phone Number"
        />
      </AuthField>

      <AuthField label="Password" icon={Lucide.Lock}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry={!showPassword}
            placeholder="••••••••••••"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
            {showPassword ? <Lucide.EyeOff size={20} color={TEXT_MUTED} /> : <Lucide.Eye size={20} color={TEXT_MUTED} />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthField label="Retype Password" icon={Lucide.Lock}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry={!showPassword}
            placeholder="••••••••••••"
            style={{ flex: 1 }}
          />
        </View>
      </AuthField>

      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 10 }} 
        onPress={() => setAgree(!agree)}
      >
          <View style={{ 
              width: 18, 
              height: 18, 
              borderRadius: 4, 
              borderWidth: 1, 
              borderColor: BORDER, 
              marginRight: 10, 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: agree ? ACCENT : 'transparent' 
          }}>
              {agree && <Lucide.Check size={12} color="#000" strokeWidth={4} />}
          </View>
          <Text style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: FONT_INPUT }}>
            I agree to the <Text style={{ color: ACCENT }}>Terms & Conditions</Text>
          </Text>
      </TouchableOpacity>

      {errorText ? <Text style={{ color: '#FF4B4B', textAlign: 'center', marginBottom: 15, fontWeight: '600', fontFamily: FONT_INPUT }}>{errorText}</Text> : null}

      <AuthPrimaryAction title="Sign Up" onPress={handleRegister} loading={loading} />

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
