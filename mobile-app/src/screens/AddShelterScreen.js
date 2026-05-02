import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../config';

const AddShelterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [region, setRegion] = useState({
    latitude: 14.2833, // Default to Santa Cruz, Laguna
    longitude: 121.4167,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    occupancy: '0',
    status: 'available',
    lat: 14.2833,
    lng: 121.4167,
    address: '',
    contact_person: '',
    contact_number: ''
  });

  useEffect(() => {
    (async () => {
      // Just request permissions, don't move map to user location
      // This keeps the map focused on Santa Cruz, Laguna
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Just log, don't block
      }
      
      // Fetch initial address for the default center
      fetchAddress(14.2833, 121.4167);
    })();
  }, []);

  const fetchAddress = async (lat, lng) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result.length > 0) {
        const addr = result[0];
        const addressString = `${addr.street || ''} ${addr.district || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
        setFormData(prev => ({ ...prev, address: addressString }));
      }
    } catch (error) {
    }
  };

  const handleDragEnd = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    updateLocation(latitude, longitude);
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    updateLocation(latitude, longitude);
  };

  const updateLocation = async (latitude, longitude) => {
    setFormData(prev => ({
      ...prev,
      lat: latitude,
      lng: longitude
    }));
    await fetchAddress(latitude, longitude);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.capacity) {
      Alert.alert('Error', 'Please fill in Name and Capacity');
      return;
    }

    if (!formData.lat || !formData.lng || 
        Math.abs(formData.lat) < 0.0001 || Math.abs(formData.lng) < 0.0001) {
      Alert.alert('Error', 'Invalid location. Please select a location on the map.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/shelters-add.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && (data.success || data.id)) {
        Alert.alert('Success', 'Shelter added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to add shelter');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Shelter</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapContainer}>
          <Text style={styles.label}>Location (Tap or drag marker to adjust)</Text>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              onPress={handleMapPress}
              minZoomLevel={13}
              maxZoomLevel={20}
            >
              <Marker
                coordinate={{ latitude: formData.lat, longitude: formData.lng }}
                draggable
                onDragEnd={handleDragEnd}
                title="Shelter Location"
              />
            </MapView>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#1E88E5" />
              </View>
            )}
          </View>
          <Text style={styles.addressText}>
            {formData.address || 'Locating...'}
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Shelter Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="e.g. Barangay Hall Evacuation Center"
          />

          <View style={styles.row}>
            <View style={[styles.column, { marginRight: 8 }]}>
              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                value={formData.capacity}
                onChangeText={(text) => setFormData(prev => ({ ...prev, capacity: text }))}
                placeholder="e.g. 100"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.column, { marginLeft: 8 }]}>
              <Text style={styles.label}>Current Occupancy</Text>
              <TextInput
                style={styles.input}
                value={formData.occupancy}
                onChangeText={(text) => setFormData(prev => ({ ...prev, occupancy: text }))}
                placeholder="e.g. 0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.status}
              onValueChange={(itemValue) => setFormData(prev => ({ ...prev, status: itemValue }))}
            >
              <Picker.Item label="Available" value="available" />
              <Picker.Item label="Full" value="full" />
              <Picker.Item label="Maintenance" value="maintenance" />
            </Picker>
          </View>

          <Text style={styles.label}>Contact Person</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_person}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_person: text }))}
            placeholder="Name of person in charge"
          />

          <Text style={styles.label}>Contact Number</Text>
          <TextInput
            style={styles.input}
            value={formData.contact_number}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_number: text }))}
            placeholder="e.g. 09123456789"
            keyboardType="phone-pad"
          />

          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Add Shelter</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  pickerContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButton: {
    backgroundColor: '#1E88E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddShelterScreen;
