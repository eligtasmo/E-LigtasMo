import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { useResponsive } from '../DesignSystem';
import {
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AuthGlassCard,
} from '../Auth/AuthUI';

export const BarangayPicker = ({ visible, onClose, value, onSelect, query, setQuery, barangays = [] }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.42)' }}>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 18,
            maxHeight: '82%',
          }}
        >
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#D6DCE6', marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#14213D' }}>Select Barangay</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FB' }}>
              <Lucide.X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              minHeight: 54,
              borderRadius: 20,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#D9E3F0',
              paddingHorizontal: 14,
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Lucide.Search size={18} color="#64748B" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search barangay"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 10, color: '#14213D', fontSize: 15, fontWeight: '600', paddingVertical: 10 }}
              />
            </View>
          </View>

          <FlatList
            data={barangays.filter((item) => item.toLowerCase().includes(String(query || '').toLowerCase()))}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const active = value === item;
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#EEF2F7',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: active ? '800' : '600', color: active ? '#171717' : '#14213D' }}>{item}</Text>
                  {active ? <Lucide.Check size={18} color="#171717" /> : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

export const RegisterStep2 = ({
  formData,
  updateField,
  onBack,
  onSubmit,
  loading,
  brgyPickerVisible,
  setBrgyPickerVisible,
  brgyQuery,
  setBrgyQuery,
  barangays,
  fieldErrors = {},
}) => {
  const { width } = useResponsive();
  const stackButtons = width < 430;

  return (
    <View>
      <AuthField label="Street Address" icon={Lucide.MapPin} hint="House number, street, or nearby landmark." error={fieldErrors.street}>
        <AuthTextInput
          value={formData.street}
          onChangeText={(text) => updateField('street', text)}
          placeholder="123 Rizal Street"
        />
      </AuthField>

      <AuthField label="Barangay" icon={Lucide.Home} error={fieldErrors.barangay}>
        <TouchableOpacity onPress={() => setBrgyPickerVisible(true)} activeOpacity={0.92}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: formData.barangay ? '#14213D' : '#94A3B8' }}>
              {formData.barangay || 'Select your barangay'}
            </Text>
            <Lucide.ChevronDown size={18} color="#64748B" />
          </View>
        </TouchableOpacity>
      </AuthField>

      <AuthField label="City / Municipality" icon={Lucide.Building2} error={fieldErrors.city}>
        <AuthTextInput
          value={formData.city}
          onChangeText={(text) => updateField('city', text)}
          placeholder="Santa Cruz"
        />
      </AuthField>

      <AuthField label="Province" icon={Lucide.MapPinned} error={fieldErrors.province}>
        <AuthTextInput value={formData.province} editable={false} />
      </AuthField>

      <AuthGlassCard style={{ marginTop: 6, padding: 14, borderRadius: 24 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#171717', textTransform: 'uppercase', letterSpacing: 1 }}>
          Confirmation
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 8, lineHeight: 21 }}>
          We’ll create your resident account and send a verification code to your email address before you continue.
        </Text>
      </AuthGlassCard>

      <View style={{ flexDirection: stackButtons ? 'column' : 'row', gap: 12, marginTop: 18 }}>
        <TouchableOpacity
          onPress={onBack}
          disabled={loading}
          style={{
            flex: 1,
            minHeight: 56,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: '#D9E3F0',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.58)',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: stackButtons ? undefined : 1.3 }}>
          <AuthPrimaryAction title="Create Account" icon={Lucide.UserPlus} onPress={onSubmit} loading={loading} />
        </View>
      </View>

      <BarangayPicker
        visible={brgyPickerVisible}
        onClose={() => setBrgyPickerVisible(false)}
        value={formData.barangay}
        onSelect={(value) => {
          updateField('barangay', value);
          setBrgyPickerVisible(false);
        }}
        query={brgyQuery}
        setQuery={setBrgyQuery}
        barangays={barangays}
      />
    </View>
  );
};
