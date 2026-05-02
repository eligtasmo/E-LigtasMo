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
  { value: 'Male', label: 'Male', icon: Lucide.Mars },
  { value: 'Female', label: 'Female', icon: Lucide.Venus },
  { value: 'Prefer not to say', label: 'Prefer not', icon: Lucide.UserRound },
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
      <AuthField label="Username" icon={Lucide.AtSign} hint="Use letters, numbers, or underscores." error={fieldErrors.username}>
        <AuthTextInput
          value={formData.username}
          onChangeText={(text) => updateField('username', text)}
          autoCapitalize="none"
          placeholder="juan_delacruz"
        />
      </AuthField>

      <View style={{ flexDirection: stackNames ? 'column' : 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AuthField label="First Name" icon={Lucide.UserRound} error={fieldErrors.firstName}>
            <AuthTextInput
              value={formData.firstName}
              onChangeText={(text) => updateField('firstName', text)}
              placeholder="Juan"
            />
          </AuthField>
        </View>
        <View style={{ flex: 1 }}>
          <AuthField label="Last Name" icon={Lucide.BadgeCheck} error={fieldErrors.lastName}>
            <AuthTextInput
              value={formData.lastName}
              onChangeText={(text) => updateField('lastName', text)}
              placeholder="Dela Cruz"
            />
          </AuthField>
        </View>
      </View>

      <AuthField label="Gender" icon={Lucide.Users} error={fieldErrors.gender}>
        <AuthChoiceGrid compact options={GENDER_OPTIONS} value={formData.gender} onChange={(value) => updateField('gender', value)} />
      </AuthField>

      <AuthField label="Email Address" icon={Lucide.Mail} error={fieldErrors.email}>
        <AuthTextInput
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="juan@example.com"
        />
      </AuthField>

      <AuthField label="Mobile Number" icon={Lucide.Smartphone} error={fieldErrors.phone}>
        <AuthTextInput
          value={formData.phone}
          onChangeText={(text) => updateField('phone', text)}
          keyboardType="phone-pad"
          placeholder="09123456789"
        />
      </AuthField>

      <AuthField label="Password" icon={Lucide.LockKeyhole} hint="At least 10 characters with upper, lower, number, and symbol." error={fieldErrors.password}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            secureTextEntry={!showPassword}
            placeholder="Create a strong password"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowPassword?.(!showPassword)} style={{ padding: 8 }}>
            {showPassword ? <Lucide.EyeOff size={18} color="#64748B" /> : <Lucide.Eye size={18} color="#64748B" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthField label="Confirm Password" icon={Lucide.ShieldCheck} error={fieldErrors.confirmPassword}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AuthTextInput
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            secureTextEntry={!showConfirmPassword}
            placeholder="Repeat your password"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword?.(!showConfirmPassword)} style={{ padding: 8 }}>
            {showConfirmPassword ? <Lucide.EyeOff size={18} color="#64748B" /> : <Lucide.Eye size={18} color="#64748B" />}
          </TouchableOpacity>
        </View>
      </AuthField>

      <AuthPrimaryAction title="Continue" icon={Lucide.ArrowRight} onPress={onNext} />
    </View>
  );
};
