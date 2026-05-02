import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image as RNImage } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { 
  Screen, TacticalCard, Row, Col, Heading, Badge, Divider, 
  IconBox, Container, PrimaryButton, useResponsive,
  ValidationInput,
  DS_FONT_UI,
  DS_TACTICAL
} from '../components/DesignSystem';
import { TacticalHeader } from '../components/Home/TacticalComponents';

const RELATIONSHIPS = ['Father', 'Mother', 'Sister', 'Brother', 'Aunt', 'Friend'];

const AddFamilyMemberScreen = ({ navigation, route }) => {
  const { group_id } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedRel, setSelectedRel] = useState('Friend');
  const [phone, setPhone] = useState('+63 945 566 3459');
  const [location, setLocation] = useState('Cebu City');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleAdd = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/add-family-member.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id, name, relationship: selectedRel, contact_number: phone, profile_image: image || null })
      });
      const data = await resp.json();
      if (data.success) {
        Alert.alert('Success', 'Family member added successfully');
        navigation.goBack();
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };
  const { safeTop } = useResponsive();

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      {/* Tactical Header with Safe Area Padding */}
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <TacticalHeader 
          title="Add Member" 
          showBack
        />
      </View>

      <Container style={{ flex: 1, paddingTop: 16 }}>

        <View style={{ height: 24 }} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          <ValidationInput 
             label="Full Name"
             lucideIcon="User"
          >
            <TextInput 
              placeholder="Enter full name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          </ValidationInput>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: 'rgba(236,231,223,0.4)', fontSize: 10, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4, fontFamily: DS_FONT_UI }}>Relationship</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {RELATIONSHIPS.map(rel => (
                <TouchableOpacity 
                  key={rel}
                  onPress={() => setSelectedRel(rel)}
                  style={{ 
                    paddingHorizontal: 20, 
                    height: 44, 
                    borderRadius: 22, 
                    backgroundColor: selectedRel === rel ? DS_TACTICAL.primary : '#1A1A1A', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderWidth: 1, 
                    borderColor: selectedRel === rel ? DS_TACTICAL.primary : 'rgba(255,255,255,0.05)' 
                  }}
                >
                  <Text style={{ color: selectedRel === rel ? '#FFF' : 'rgba(255,255,255,0.4)', fontWeight: '700', fontSize: 12, fontFamily: DS_FONT_UI }}>{rel.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A1A', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                 <Lucide.Plus size={20} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>
          </View>

          <ValidationInput 
             label="Contact Number"
             lucideIcon="Phone"
          >
             <TextInput 
               placeholder="+63 945 566 3459"
               value={phone}
               onChangeText={setPhone}
               placeholderTextColor="rgba(255,255,255,0.2)"
             />
          </ValidationInput>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: 'rgba(236,231,223,0.4)', fontSize: 10, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4, fontFamily: DS_FONT_UI }}>Designated Location</Text>
            <View style={{ height: 50, backgroundColor: '#1A1A1A', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
              <Lucide.MapPin size={20} color={DS_TACTICAL.primary} />
              <Text style={{ flex: 1, marginLeft: 12, color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: DS_FONT_UI }}>{location}</Text>
              <Lucide.ChevronDown size={18} color="rgba(255,255,255,0.2)" />
            </View>
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: 'rgba(236,231,223,0.4)', fontSize: 10, fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 4, fontFamily: DS_FONT_UI }}>Profile Image</Text>
            <TouchableOpacity 
              onPress={pickImage}
              style={{ height: 200, backgroundColor: '#1A1A1A', borderRadius: 28, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            >
              {image ? (
                <RNImage source={{ uri: image }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Lucide.Camera size={28} color="rgba(255,255,255,0.1)" />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '700', fontSize: 14, fontFamily: DS_FONT_UI, textTransform: 'uppercase', letterSpacing: 1 }}>Upload Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Container>

      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: '#080808', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
         <PrimaryButton 
           title={loading ? "PROCESSING..." : "ADD FAMILY MEMBER"}
           onPress={handleAdd}
           loading={loading}
           variant="tactical"
         />
      </View>
    </Screen>
  );
};

export default AddFamilyMemberScreen;
