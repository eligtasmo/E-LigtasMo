import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Image as RNImage, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, Row, Col, PrimaryButton, ValidationInput } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const HazardAddControls = ({ onPlace, onCancel }) => {
  const { theme, atomic } = useTheme();

  return (
    <>
      <View style={[atomic.l.abs, atomic.l.center, { top: 0, bottom: 0, left: 0, right: 0 }]} pointerEvents="none">
         <MaterialCommunityIcons name="crosshairs" size={40} color={theme.primary} />
      </View>
      <View style={[atomic.l.abs, { bottom: 40, left: 16, right: 16, gap: 12 }]}>
        <TouchableOpacity 
          style={[atomic.s.py16, atomic.l.alignCenter, { backgroundColor: theme.primary, borderRadius: 16, elevation: 5 }]}
          onPress={onPlace}
        >
          <Text style={[atomic.t.body, atomic.t.bold, { color: '#fff' }]}>Place Hazard Here</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[atomic.s.py16, atomic.l.alignCenter, { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, elevation: 3 }]}
          onPress={onCancel}
        >
          <Text style={[atomic.t.body, atomic.t.bold, { color: theme.textSecondary }]}>Exit Add Mode</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export const HazardModal = ({ visible, onClose, form, setForm, onSave, saving }) => {
  const { theme, atomic } = useTheme();

  const handleCapture = async () => {
    const currentMedias = form.medias || [];
    if (currentMedias.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum 3 photos per hazard.');
      return;
    }

    Alert.alert('Visual Evidence', 'Capture tactical imagery for this hazard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          const res = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
          if (!res.canceled) {
            setForm(prev => ({
              ...prev,
              medias: [...(prev.medias || []), `data:image/jpeg;base64,${res.assets[0].base64}`]
            }));
          }
        }
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.3, base64: true });
          if (!res.canceled) {
            setForm(prev => ({
              ...prev,
              medias: [...(prev.medias || []), `data:image/jpeg;base64,${res.assets[0].base64}`]
            }));
          }
        }
      }
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.l.fill, atomic.l.justifyEnd, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[atomic.s.p24, { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <Row justify="space-between" align="center" style={atomic.s.mb20}>
            <Text style={[atomic.t.h4, atomic.t.heavy, { color: theme.text }]}>New Hazard Report</Text>
            <TouchableOpacity onPress={onClose} style={atomic.s.p4}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </Row>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.s.mb8, { color: theme.textSecondary }]}>HAZARD TYPE</Text>
          <Row gap={8} style={atomic.s.mb20}>
             {['Flood', 'Fire', 'Crash', 'Other'].map(t => (
               <TouchableOpacity 
                 key={t}
                 onPress={() => setForm({...form, type: t})}
                 style={[
                   atomic.s.px12, atomic.s.py8, { borderRadius: 12, borderWidth: 1.5 },
                   { borderColor: form.type === t ? theme.primary : theme.border, backgroundColor: form.type === t ? theme.primaryBg : theme.surfaceVariant }
                 ]}
               >
                 <Text style={[atomic.t.tiny, atomic.t.bold, { color: form.type === t ? theme.primary : theme.textSecondary }]}>{t.toUpperCase()}</Text>
               </TouchableOpacity>
             ))}
          </Row>

          <ValidationInput label="DESCRIPTION">
            <TextInput
              style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
              placeholder="e.g. Moderate flooding near bridge"
              placeholderTextColor={theme.placeholder}
              value={form.description}
              onChangeText={(t) => setForm({...form, description: t})}
            />
          </ValidationInput>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.s.mb8, atomic.s.mt12, { color: theme.textSecondary }]}>SEVERITY</Text>
          <Row gap={8} style={atomic.s.mb20}>
             {['Low', 'Medium', 'High', 'Critical'].map(s => (
               <TouchableOpacity 
                 key={s}
                 onPress={() => setForm({...form, severity: s})}
                 style={[
                   atomic.s.px12, atomic.s.py8, atomic.l.flex, atomic.l.alignCenter, { borderRadius: 12, borderWidth: 1.5 },
                   { 
                     borderColor: form.severity === s ? (s === 'Critical' ? theme.error : theme.primary) : theme.border, 
                     backgroundColor: form.severity === s ? (s === 'Critical' ? theme.errorBg : theme.primaryBg) : theme.surfaceVariant 
                   }
                 ]}
               >
                 <Text style={[atomic.t.tiny, atomic.t.bold, { color: form.severity === s ? (s === 'Critical' ? theme.error : theme.primary) : theme.textSecondary }]}>{s.toUpperCase()}</Text>
               </TouchableOpacity>
             ))}
          </Row>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.s.mb8, { color: theme.textSecondary }]}>VISUAL EVIDENCE</Text>
          <Row gap={8} style={atomic.s.mb20}>
            <TouchableOpacity 
              onPress={handleCapture}
              style={[atomic.l.center, { width: 60, height: 60, borderRadius: 12, backgroundColor: theme.surfaceVariant, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name="camera-plus" size={24} color={theme.primary} />
            </TouchableOpacity>
            {(form.medias || []).map((m, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <RNImage source={{ uri: m }} style={{ width: 60, height: 60, borderRadius: 12 }} />
                <TouchableOpacity 
                  onPress={() => setForm(prev => ({ ...prev, medias: prev.medias.filter((_, i) => i !== idx) }))}
                  style={{ position: 'absolute', top: -5, right: -5, backgroundColor: theme.error, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </Row>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.s.mb8, { color: theme.textSecondary }]}>PASSABLE BY</Text>
          <Row gap={8} style={[atomic.s.mb24, { flexWrap: 'wrap' }]}>
             {[
               { id: 'driving-car', icon: 'car', label: 'Car' },
               { id: 'driving-hgv', icon: 'truck', label: 'Truck' },
               { id: 'cycling-regular', icon: 'bike', label: 'Bike' },
               { id: 'foot-walking', icon: 'walk', label: 'Walking' }
             ].map(m => {
               const isAllowed = form.allowedVehicles?.includes(m.id);
               return (
                 <TouchableOpacity 
                   key={m.id}
                   onPress={() => {
                     const current = form.allowedVehicles || [];
                     const next = isAllowed ? current.filter(x => x !== m.id) : [...current, m.id];
                     setForm({...form, allowedVehicles: next});
                   }}
                   style={[
                     atomic.s.px12, atomic.s.py8, { borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
                     { borderColor: isAllowed ? theme.primary : theme.border, backgroundColor: isAllowed ? theme.primaryBg : theme.surfaceVariant }
                   ]}
                 >
                   <MaterialCommunityIcons name={m.icon} size={14} color={isAllowed ? theme.primary : theme.textSecondary} />
                   <Text style={[atomic.t.tiny, atomic.t.bold, { color: isAllowed ? theme.primary : theme.textSecondary }]}>{m.label}</Text>
                 </TouchableOpacity>
               );
             })}
          </Row>

          <PrimaryButton 
            title="Submit Hazard Report" 
            onPress={onSave} 
            loading={saving} 
            style={atomic.s.mt12} 
          />
        </View>
      </View>
    </Modal>
  );
};
