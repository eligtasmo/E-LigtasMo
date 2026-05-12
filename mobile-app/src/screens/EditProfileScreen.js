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
  const [initialData, setInitialData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    gender: 'Male',
    address: '',
    currentPassword: '',
    newPassword: '',
  });

  const [barangays, setBarangays] = useState([]);
  const [showBrgyPicker, setShowBrgyPicker] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await AuthService.checkSession();
        if (user) {
          const data = {
            fullName: user.full_name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.contact_number || '',
            gender: user.gender || 'Male',
            address: user.brgy_name || user.barangay || '',
            currentPassword: '',
            newPassword: '',
          };
          setFormData(data);
          setInitialData(data);
        }

        // Fetch Barangays
        const bRes = await fetch(`${API_URL}/list-barangays.php`);
        const bData = await bRes.json();
        if (bData.success) {
          setBarangays(bData.barangays.map(b => b.name));
        }
      } catch (error) {}
    };
    init();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Check if anything changed (excluding passwords unless they are being set)
    const hasProfileChanged = 
      formData.fullName !== initialData.fullName ||
      formData.username !== initialData.username ||
      formData.email !== initialData.email ||
      formData.phone !== initialData.phone ||
      formData.gender !== initialData.gender ||
      formData.address !== initialData.address;
    
    const isChangingPassword = formData.newPassword.length > 0;

    if (!hasProfileChanged && !isChangingPassword) {
      Alert.alert('No Changes', 'You haven\'t modified any information.');
      return;
    }

    setLoading(true);

    if (!formData.phone || formData.phone.length !== 11 || !formData.phone.startsWith('09')) {
      Alert.alert('Invalid Number', 'Please enter a valid 11-digit phone number starting with 09.');
      setLoading(false);
      return;
    }

    if (isChangingPassword && formData.newPassword.length < 6) {
      Alert.alert('Short Password', 'New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const session = await AuthService.checkSession();
      if (!session || !session.token) {
        Alert.alert('Error', 'Session expired. Please login again.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/users.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          username: formData.username,
          full_name: formData.fullName,
          email: formData.email,
          contact_number: formData.phone,
          brgy_name: formData.address,
          city: 'Santa Cruz',
          province: 'Laguna',
          gender: formData.gender,
          current_password: formData.currentPassword,
          new_password: formData.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          // Update local session with new data
          const updatedUser = { ...session, ...data.user };
          await AsyncStorage.setItem('CURRENT_USER', JSON.stringify(updatedUser));
        }
        Alert.alert('Success', data.message);
        if (data.changed || isChangingPassword) {
          navigation.goBack();
        }
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
            title="Account Settings" 
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

            <TouchableOpacity 
              onPress={() => setShowBrgyPicker(true)}
              style={{ marginBottom: 16 }}
            >
              <Text style={styles.inputLabel}>Barangay (Santa Cruz, Laguna)</Text>
              <View style={styles.inputContainer}>
                <Lucide.MapPin size={18} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                <Text style={[styles.textInput, { color: formData.address ? '#FFF' : 'rgba(255,255,255,0.3)' }]}>
                  {formData.address || 'Select Barangay'}
                </Text>
                <Lucide.ChevronDown size={16} color="rgba(255,255,255,0.2)" />
              </View>
            </TouchableOpacity>

            {/* SECURITY SECTION */}
            <View style={{ marginTop: 24, marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Change Password (Optional)</Text>
                
                <TacticalInput 
                  label="Current Password" 
                  icon={Lucide.Lock} 
                  value={formData.currentPassword} 
                  onChangeText={(t) => handleChange('currentPassword', t)}
                  secureTextEntry
                  placeholder="Required to change password"
                />

                <TacticalInput 
                  label="New Password" 
                  icon={Lucide.Key} 
                  value={formData.newPassword} 
                  onChangeText={(t) => handleChange('newPassword', t)}
                  secureTextEntry
                  placeholder="Min 6 characters"
                />
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

      {/* Barangay Picker Modal */}
      {showBrgyPicker && (
        <View style={StyleSheet.absoluteFillObject}>
           <TouchableOpacity 
             style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }} 
             onPress={() => setShowBrgyPicker(false)} 
           />
           <MotiView 
             from={{ translateY: 300 }} 
             animate={{ translateY: 0 }}
             style={{ 
               position: 'absolute', 
               bottom: 0, 
               left: 0, 
               right: 0, 
               height: '60%', 
               backgroundColor: '#0D0D0D', 
               borderTopLeftRadius: 32, 
               borderTopRightRadius: 32,
               padding: 24
             }}
           >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>Select Barangay</Text>
                 <TouchableOpacity onPress={() => setShowBrgyPicker(false)}>
                    <Lucide.X size={20} color="#FFF" />
                 </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                 {barangays.map((b) => (
                   <TouchableOpacity 
                     key={b} 
                     onPress={() => { handleChange('address', b); setShowBrgyPicker(false); }}
                     style={{ 
                       paddingVertical: 16, 
                       borderBottomWidth: 1, 
                       borderBottomColor: 'rgba(255,255,255,0.05)',
                       flexDirection: 'row',
                       alignItems: 'center',
                       justifyContent: 'space-between'
                     }}
                   >
                      <Text style={{ color: formData.address === b ? '#F5B235' : '#FFF', fontSize: 14 }}>{b}</Text>
                      {formData.address === b && <Lucide.Check size={16} color="#F5B235" />}
                   </TouchableOpacity>
                 ))}
              </ScrollView>
           </MotiView>
        </View>
      )}
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
