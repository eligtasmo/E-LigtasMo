import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL } from '../config';
import { Container, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';
import { TacticalHeader } from '../components/Home/TacticalComponents';

const ACCENT = '#F5B235';

const TacticalInput = ({ label, icon: Icon, value, onChangeText, placeholder, ...props }) => (
  <View style={{ marginBottom: 16 }}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={styles.inputContainer}>
      <Icon size={18} color="rgba(255,255,255,0.4)" strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        style={styles.textInput}
        {...props}
      />
    </View>
  </View>
);

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    gender: 'Male',
    address: '',
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await AuthService.checkSession();
        if (user) {
          setFormData({
            fullName: user.full_name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.contact_number || '',
            gender: user.gender || 'Male',
            address: user.brgy_name || user.barangay || '',
          });
        }
      } catch (error) {}
    };
    loadUserData();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!formData.phone || formData.phone.length !== 11 || !formData.phone.startsWith('09')) {
      Alert.alert('Invalid Number', 'Please enter a valid 11-digit phone number starting with 09.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/update-user.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          full_name: formData.fullName,
          email: formData.email,
          contact_number: formData.phone,
          brgy_name: formData.address,
          city: 'Santa Cruz',
          province: 'Laguna',
          gender: formData.gender
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Profile updated successfully.');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <Container style={{ flex: 1, paddingTop: 16 }}>
          <TacticalHeader 
            title="Edit Profile" 
            showBack 
            onBack={() => navigation.goBack()}
            hideSubtitle
          />

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 24, paddingBottom: 100 }}
          >
            <TacticalInput 
              label="Full Name" 
              icon={Lucide.User} 
              value={formData.fullName} 
              onChangeText={(t) => handleChange('fullName', t)}
              placeholder="Your full name"
            />

            <TacticalInput 
              label="Username" 
              icon={Lucide.AtSign} 
              value={formData.username} 
              onChangeText={(t) => handleChange('username', t)}
              autoCapitalize="none"
              placeholder="your_alias"
            />

            <TacticalInput 
              label="Email Address" 
              icon={Lucide.Mail} 
              value={formData.email} 
              onChangeText={(t) => handleChange('email', t)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />

            <TacticalInput 
              label="Contact Number" 
              icon={Lucide.Phone} 
              value={formData.phone} 
              onChangeText={(t) => {
                const cleaned = t.replace(/[^\d]/g, '').slice(0, 11);
                handleChange('phone', cleaned);
              }}
              keyboardType="phone-pad"
              placeholder="09123456789"
              maxLength={11}
            />

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['Male', 'Female', 'Other'].map((item) => {
                  const isSelected = formData.gender === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => handleChange('gender', item)}
                      style={{ 
                        flex: 1,
                        height: 34,
                        borderRadius: 17, 
                        backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.10)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.14)'
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? '#000' : 'rgba(255,255,255,0.5)' }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TacticalInput 
              label="Barangay / Address" 
              icon={Lucide.MapPin} 
              value={formData.address} 
              onChangeText={(t) => handleChange('address', t)}
              placeholder="Enter your barangay"
            />

            {/* SECURITY SECTION */}
            <View style={{ marginTop: 24, marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Security & Auth</Text>
                <TouchableOpacity 
                  onPress={() => {
                    console.log('[EditProfile] Navigating to ForgotPassword');
                    navigation.navigate('ForgotPassword');
                  }}
                  style={styles.securityBtn}
                >
                  <Lucide.KeyRound size={16} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.securityBtnText}>Change Account Password</Text>
                  <Lucide.ChevronRight size={14} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={loading}
              style={styles.saveBtn}
            >
              <View style={styles.saveIconCircle}>
                 <Lucide.Check size={12} color="#000" strokeWidth={3} />
              </View>
              <Text style={styles.saveBtnText}>{loading ? 'SAVING...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Container>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  inputLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: DS_FONT_UI,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputContainer: {
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(26,22,18,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: DS_FONT_UI,
  },
  saveBtn: {
    marginTop: 20,
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#FFFFFF',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveIconCircle: {
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#F5B235', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 10,
  },
  saveBtnText: {
    color: '#000', 
    fontWeight: '700', 
    fontSize: 13, 
    fontFamily: DS_FONT_UI,
  },
  securityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  securityBtnText: {
    flex: 1,
    marginLeft: 12,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: DS_FONT_UI,
  },
});

export default EditProfileScreen;
