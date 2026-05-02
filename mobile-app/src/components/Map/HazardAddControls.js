import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col, PrimaryButton, ValidationInput } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const HazardAddControls = ({ onPlace, onCancel }) => {
  const { theme, atomic } = useTheme();

  return (
    <>
      <View style={[atomic.abs, atomic.center, { top: 0, bottom: 0, left: 0, right: 0 }]} pointerEvents="none">
         <MaterialCommunityIcons name="crosshairs" size={40} color={theme.primary} />
      </View>
      <View style={[atomic.abs, { bottom: 40, left: 16, right: 16, gap: 12 }]}>
        <TouchableOpacity 
          style={[atomic.py16, atomic.alignCenter, { backgroundColor: theme.primary, borderRadius: 16, elevation: 5 }]}
          onPress={onPlace}
        >
          <Text style={[atomic.t.body, atomic.t.bold, { color: '#fff' }]}>Place Hazard Here</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[atomic.py16, atomic.alignCenter, { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, elevation: 3 }]}
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.justifyEnd, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[atomic.p24, { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <Row justify="space-between" align="center" style={atomic.mb20}>
            <Text style={[atomic.t.h4, atomic.t.heavy, { color: theme.text }]}>New Hazard Report</Text>
            <TouchableOpacity onPress={onClose} style={atomic.p4}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </Row>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, { color: theme.textSecondary }]}>HAZARD TYPE</Text>
          <Row gap={8} style={atomic.mb20}>
             {['Flood', 'Fire', 'Crash', 'Other'].map(t => (
               <TouchableOpacity 
                 key={t}
                 onPress={() => setForm({...form, type: t})}
                 style={[
                   atomic.px12, atomic.py8, { borderRadius: 12, borderWidth: 1.5 },
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

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, atomic.mt12, { color: theme.textSecondary }]}>SEVERITY</Text>
          <Row gap={8} style={atomic.mb20}>
             {['Low', 'Medium', 'High', 'Critical'].map(s => (
               <TouchableOpacity 
                 key={s}
                 onPress={() => setForm({...form, severity: s})}
                 style={[
                   atomic.px12, atomic.py8, atomic.l.flex, atomic.alignCenter, { borderRadius: 12, borderWidth: 1.5 },
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

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, { color: theme.textSecondary }]}>PASSABLE BY</Text>
          <Row gap={8} style={[atomic.mb24, { flexWrap: 'wrap' }]}>
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
                     atomic.px12, atomic.py8, { borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
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
            style={atomic.mt12} 
          />
        </View>
      </View>
    </Modal>
  );
};
