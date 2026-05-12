import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { API_URL, API_ROOT } from '../config';
import { Screen, Row, Card, Heading, PrimaryButton, ValidationInput } from '../components/DesignSystem';

// Sub-components
import { LocationSection } from '../components/Report/LocationSection';
import { SeverityPicker, FLOOD_LEVELS } from '../components/Report/SeverityPicker';
import { MediaEvidence } from '../components/Report/MediaEvidence';
import { MapPickerModal } from '../components/Report/MapPickerModal';

const QuickReportScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const editReport = route.params?.report || null;
  const isEditing = !!editReport;

  // State
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(!isEditing);
  const [mediaList, setMediaList] = useState([]);
  const [floodLevel, setFloodLevel] = useState(null);
  const [description, setDescription] = useState(editReport?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [useManualLocation, setUseManualLocation] = useState(!!editReport);
  const [selectedCoords, setSelectedCoords] = useState(editReport ? { lat: editReport.lat, lng: editReport.lng } : null);
  
  // Modals
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    if (isEditing) {
      const initial = FLOOD_LEVELS.find(l => l.severity === editReport.severity);
      if (initial) setFloodLevel(initial.id);
    } else {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc);
        }
      } catch (e) {} finally { setLocLoading(false); }
    }
  };

  const submitReport = async () => {
    if (!isEditing && !location && !useManualLocation) {
        Alert.alert('Location Required', 'Acquiring GPS...');
        return;
    }
    if (!floodLevel) {
        Alert.alert('Flood Level Required', 'Please select depth.');
        return;
    }

    if (mediaList.length === 0 && !isEditing) {
        Alert.alert('Photo Evidence Recommended', 'Attaching a photo helps verification.', [
            { text: 'Add Photo', style: 'cancel' },
            { text: 'Submit Anyway', onPress: () => proceedSubmit() }
        ]);
        return;
    }
    proceedSubmit();
  };

  const proceedSubmit = async () => {
    setSubmitting(true);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const user = session ? JSON.parse(session) : {};
      const level = FLOOD_LEVELS.find(l => l.id === floodLevel);
      
      const lat = useManualLocation ? selectedCoords.lat : (location?.coords.latitude || editReport?.lat);
      const lng = useManualLocation ? selectedCoords.lng : (location?.coords.longitude || editReport?.lng);

      const payload = {
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        severity: level.severity,
        description: description ? `${description} (${level.label})` : `Flood: ${level.label}`,
        medias: mediaList.map(m => `data:${m.mime};base64,${m.base64}`),
        barangay: user.brgy_name || null
      };

      let endpoint = isEditing ? 'update-incident-report.php' : 'incident-reports.php';
      if (isEditing) payload.id = editReport.id;

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Report processed.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert("Error", "Network error.");
    } finally { setSubmitting(false); }
  };

  return (
    <Screen ornamentIntensity={0.6}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.surface }}>
        <Row align="center" style={[atomic.px20, atomic.py12, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Heading size="md" style={atomic.ml12}>{isEditing ? 'Edit Report' : 'Tactical Intel'}</Heading>
        </Row>
      </SafeAreaView>

      <ScrollView contentContainerStyle={[atomic.px16, atomic.pt16, atomic.pb40]} showsVerticalScrollIndicator={false}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }}>
          
          <LocationSection 
            locLoading={locLoading}
            location={location}
            useManualLocation={useManualLocation}
            selectedCoords={selectedCoords}
            onReset={() => { setUseManualLocation(false); setSelectedCoords(null); }}
            onOpenMap={() => setMapPickerVisible(true)}
          />

          <SeverityPicker 
            visible={levelModalVisible}
            selectedId={floodLevel}
            onSelect={(id, open) => { if(open) setLevelModalVisible(true); else { setFloodLevel(id); setLevelModalVisible(false); } }}
            onClose={() => setLevelModalVisible(false)}
          />

          <MediaEvidence 
            mediaList={mediaList} 
            setMediaList={setMediaList} 
            isEditing={isEditing} 
            existingMediaPath={editReport?.media_path} 
            apiRoot={API_ROOT} 
          />

          <Card variant="raised" style={atomic.p20}>
            <Row align="center" style={atomic.mb16}>
              <MaterialCommunityIcons name="text-short" size={20} color={theme.text} />
              <Heading size="sm" style={atomic.ml8}>Details (Optional)</Heading>
            </Row>
            <ValidationInput>
              <TextInput
                style={[atomic.t.body, { color: theme.text, minHeight: 80, width: '100%', textAlignVertical: 'top' }]}
                placeholder="Describe current situation..."
                placeholderTextColor={theme.placeholder}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
              />
            </ValidationInput>
          </Card>

          <PrimaryButton 
            title={isEditing ? "UPDATE REPORT" : "SUBMIT REPORT"} 
            onPress={submitReport} 
            loading={submitting} 
            disabled={(!isEditing && locLoading && !useManualLocation)}
            style={atomic.mt24}
          />

        </MotiView>
      </ScrollView>

      <MapPickerModal 
        visible={mapPickerVisible}
        initialCoords={location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null}
        selectedCoords={selectedCoords}
        onCoordsChange={setSelectedCoords}
        onSelect={() => { setUseManualLocation(true); setMapPickerVisible(false); }}
        onClose={() => setMapPickerVisible(false)}
      />
    </Screen>
  );
};

export default QuickReportScreen;
