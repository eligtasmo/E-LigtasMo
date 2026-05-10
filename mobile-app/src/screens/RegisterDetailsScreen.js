import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Lucide from 'lucide-react-native';

import { AuthService } from '../services/AuthService';
import { API_URL } from '../config';
import {
  AuthScreenShell,
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AuthChoiceGrid,
  AuthStepDots,
  AuthGlassCard,
  AUTH_COLORS,
  AUTH_FONTS,
} from '../components/Auth/AuthUI';
import { RegisterStep1 } from '../components/Identity/RegisterStep1';
import { RegisterStep2 } from '../components/Identity/RegisterStep2';

const { ACCENT, TEXT_MAIN, TEXT_MUTED, BORDER } = AUTH_COLORS;
const { FONT_HEADING, FONT_INPUT } = AUTH_FONTS;

const RegisterDetailsScreen = ({ navigation, route }) => {
  const { email, code } = route.params || {};
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    gender: 'Male',
    email: email || '',
    phone: '',
    password: '',
    confirmPassword: '',
    street: '',
    barangay: '',
    city: 'Santa Cruz',
    province: 'Laguna',
  });

  const [barangays, setBarangays] = useState([
    "Alipit", "Bagumbayan", "Bubukal", "Calios", "Duhat", 
    "Gatid", "Jasaan", "Labuin", "Malinao", "Oogong", 
    "Pagsawitan", "Palasan", "Patimbao", "Poblacion I", 
    "Poblacion II", "Poblacion III", "Poblacion IV", "Poblacion V", 
    "San Jose", "San Juan", "San Pablo Norte", "San Pablo Sur", 
    "Santisima Cruz", "Santo Angel Central", "Santo Angel Norte", 
    "Santo Angel Sur"
  ]);
  const [brgyPickerVisible, setBrgyPickerVisible] = useState(false);
  const [brgyQuery, setBrgyQuery] = useState('');

  useEffect(() => {
    fetchBarangays();
  }, []);

  const fetchBarangays = async () => {
    try {
      const res = await fetch(`${API_URL}/list-barangays.php`);
      const data = await res.json();
      if (data.success && data.barangays && data.barangays.length > 0) {
        setBarangays(data.barangays.map(b => b.name));
      }
    } catch (e) {
      console.warn('Failed to fetch barangays');
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    const { username, firstName, lastName, phone, password, confirmPassword } = formData;
    if (!username || !firstName || !lastName || !phone || !password || !confirmPassword) {
      setErrorText('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }
    if (password.length < 10) {
        setErrorText('Password must be at least 10 characters.');
        return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorText('Include upper, lower, number, and special character.');
      return;
    }
    setErrorText('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const { street, barangay, city } = formData;
    if (!street || !barangay || !city) {
      setErrorText('Please provide your complete address.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const result = await AuthService.register(formData.username, formData.password, {
        fullName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        address: {
          street: formData.street,
          barangay: formData.barangay,
          city: formData.city,
          province: formData.province
        }
      });

      if (result.success) {
        Alert.alert('Success', 'Account created successfully! Please sign in.', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        // Show detailed message if available, otherwise fallback
        const msg = result.details || result.message || 'Registration failed. Please try again.';
        setErrorText(msg);
      }
    } catch (error) {
      setErrorText('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell 
      title="Create Account" 
      onBack={() => step === 1 ? navigation.goBack() : setStep(1)}
      step={step + 2}
      totalSteps={4}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {errorText ? (
          <View style={{ padding: 12, marginBottom: 24, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 4, borderWidth: 1, borderColor: '#EF4444' }}>
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{errorText}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <RegisterStep1
            formData={formData}
            updateField={updateField}
            onNext={handleNext}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
          />
        ) : (
          <RegisterStep2
            formData={formData}
            updateField={updateField}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            loading={loading}
            brgyPickerVisible={brgyPickerVisible}
            setBrgyPickerVisible={setBrgyPickerVisible}
            brgyQuery={brgyQuery}
            setBrgyQuery={setBrgyQuery}
            barangays={barangays}
          />
        )}
      </ScrollView>
    </AuthScreenShell>
  );
};



export default RegisterDetailsScreen;
