import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col, Heading, PrimaryButton, ValidationInput } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const ShelterEditModal = ({ visible, onClose, shelter, form, setForm, onSave, onDelete, saving }) => {
  const { theme, atomic } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.justifyEnd, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[atomic.p24, { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <Row justify="space-between" align="center" style={atomic.mb20}>
            <Col>
              <Heading size="md">Update Status</Heading>
              <Text style={[atomic.t.caption, { color: theme.textSecondary }]}>{shelter?.name}</Text>
            </Col>
            <TouchableOpacity onPress={onClose} style={atomic.p4}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </Row>

          <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, { color: theme.textSecondary }]}>SHELTER STATUS</Text>
          <Row gap={8} style={atomic.mb20}>
            {['Open', 'Full', 'Closed'].map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setForm({ ...form, status: s })}
                style={[
                  atomic.l.flex, atomic.py12, atomic.alignCenter, { borderRadius: 12, borderWidth: 1.5 },
                  { 
                    borderColor: form.status === s ? theme.primary : theme.border, 
                    backgroundColor: form.status === s ? theme.primaryBg : theme.surfaceVariant 
                  }
                ]}
              >
                <Text style={[atomic.t.tiny, atomic.t.bold, { color: form.status === s ? theme.primary : theme.textSecondary }]}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </Row>

          <Row gap={12}>
            <ValidationInput label="CURRENT OCCUPANCY" style={atomic.l.flex}>
              <TextInput
                style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                keyboardType="numeric"
                value={form.occupancy}
                onChangeText={(t) => setForm({ ...form, occupancy: t })}
              />
            </ValidationInput>
            <ValidationInput label="TOTAL CAPACITY" style={atomic.l.flex}>
              <TextInput
                style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                keyboardType="numeric"
                value={form.capacity}
                onChangeText={(t) => setForm({ ...form, capacity: t })}
              />
            </ValidationInput>
          </Row>

          <PrimaryButton 
            title="Update Shelter" 
            onPress={onSave} 
            loading={saving} 
            style={atomic.mt20} 
          />

          <TouchableOpacity 
            onPress={onDelete}
            style={[atomic.mt12, atomic.p12, atomic.aic]}
            disabled={saving}
          >
            <Text style={[atomic.t.caption, atomic.t.bold, { color: theme.error }]}>DELETE SHELTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const ShelterCreateModal = ({ visible, onClose, form, setForm, onSave, saving }) => {
  const { theme, atomic } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.justifyEnd, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[atomic.p24, { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
          <Row justify="space-between" align="center" style={atomic.mb20}>
            <Heading size="md">Add New Shelter</Heading>
            <TouchableOpacity onPress={onClose} style={atomic.p4}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </Row>

          <ValidationInput label="SHELTER NAME">
            <TextInput
              style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
              placeholder="e.g. San Jose Elementary School"
              placeholderTextColor={theme.placeholder}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
          </ValidationInput>

          <ValidationInput label="ADDRESS" style={atomic.mt12}>
            <TextInput
              style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
              placeholder="Enter complete address"
              placeholderTextColor={theme.placeholder}
              value={form.address}
              onChangeText={(t) => setForm({ ...form, address: t })}
            />
          </ValidationInput>

          <Row gap={12} style={atomic.mt12}>
            <ValidationInput label="CAPACITY" style={atomic.l.flex}>
              <TextInput
                style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.placeholder}
                value={form.capacity}
                onChangeText={(t) => setForm({ ...form, capacity: t })}
              />
            </ValidationInput>
            <ValidationInput label="CATEGORY" style={atomic.l.flex}>
              <TextInput
                style={[atomic.t.body, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                placeholder="e.g. Center"
                placeholderTextColor={theme.placeholder}
                value={form.category}
                onChangeText={(t) => setForm({ ...form, category: t })}
              />
            </ValidationInput>
          </Row>

          <PrimaryButton 
            title="Create Shelter Facility" 
            onPress={onSave} 
            loading={saving} 
            style={atomic.mt24} 
          />
        </View>
      </View>
    </Modal>
  );
};
