import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { useResponsive } from '../DesignSystem';
import {
  AuthField,
  AuthTextInput,
  AuthPrimaryAction,
  AuthChoiceGrid,
} from '../Auth/AuthUI';

const GENDER_OPTIONS = [
  { id: 'Male', label: 'Male', icon: Lucide.Mars },
  { id: 'Female', label: 'Female', icon: Lucide.Venus },
];

export const RegisterStep1 = ({
  formData,
  updateField,
  onNext,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  fieldErrors = {},
}) => {
  const { width } = useResponsive();
  const stackNames = width < 420;

  return (
    <View>
      <AuthField label="Username" required error={fieldErrors.username}>
        <AuthTextInput
          value={formData.username}
          onChangeText={(text) => updateField('username', text)}
          onClear={() => updateField('username', '')}
          autoCapitalize="none"
          placeholder="Enter a username"
        />
      </AuthField>

      <View style={{ flexDirection: stackNames ? 'column' : 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AuthField label="First Name" required error={fieldErrors.firstName}>
            <AuthTextInput
              value={formData.firstName}
              onChangeText={(text) => updateField('firstName', text)}
              onClear={() => updateField('firstName', '')}
              placeholder="First name"
            />
          </AuthField>
        </View>
        <View style={{ flex: 1 }}>
          <AuthField label="Last Name" required error={fieldErrors.lastName}>
            <AuthTextInput
              value={formData.lastName}
              onChangeText={(text) => updateField('lastName', text)}
              onClear={() => updateField('lastName', '')}
              placeholder="Last name"
            />
          </AuthField>
        </View>
      </View>

      <AuthField label="Gender" required error={fieldErrors.gender} noContainer={true}>
        <AuthChoiceGrid 
          options={GENDER_OPTIONS} 
          selected={formData.gender} 
          onSelect={(value) => updateField('gender', value)} 
          row={true}
        />
      </AuthField>

      <AuthField label="Mobile Number" required error={fieldErrors.phone}>
        <AuthTextInput
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          onClear={() => updateField('phone', '')}
          keyboardType="phone-pad"
          placeholder="09123456789"
        />
      </AuthField>

      <AuthField 
        label="Password" 
        required 
        hint="Password must be at least 10 characters with upper, lower, number, and special character."
        error={fieldErrors.password}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry={!showPassword}
            placeholder="Create a password"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowPassword?.(!showPassword)} style={{ padding: 8 }}>
            {showPassword ? <Lucide.EyeOff size={22} color="#FFFFFF" /> : <Lucide.Eye size={22} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthField label="Confirm Password" required error={fieldErrors.confirmPassword}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry={!showConfirmPassword}
            placeholder="Repeat password"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword?.(!showConfirmPassword)} style={{ padding: 8 }}>
            {showConfirmPassword ? <Lucide.EyeOff size={22} color="#FFFFFF" /> : <Lucide.Eye size={22} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthPrimaryAction title="Next" onPress={onNext} />
    </View>
  );
};


