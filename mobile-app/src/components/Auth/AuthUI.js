import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { Screen, Row, useResponsive, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';

const ACCENT = '#FFFFFF'; 
const AUTH_BG = '#0F0F0F'; // Lighter black

export const AUTH_COLORS = {
  ACCENT: '#FFFFFF',
  BG: '#0F0F0F',
  FIELD: 'transparent',
  BORDER: 'rgba(255,255,255,0.2)',
  TEXT_MAIN: '#FFFFFF',
  TEXT_MUTED: '#9CA3AF',
};

export const AUTH_FONTS = {
  FONT_HEADING: DS_FONT_UI,
  FONT_INPUT: DS_FONT_INPUT,
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '400',
    marginLeft: 2,
    fontFamily: DS_FONT_UI,
  },
  shellTitle: { 
    fontSize: 30, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    fontFamily: DS_FONT_UI,
    letterSpacing: -0.5,
    marginBottom: 24,
    marginTop: 20,
  },
  fieldLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    marginBottom: 10, 
    fontFamily: DS_FONT_UI, 
  },
  fieldContainer: {
    height: 54,
    borderRadius: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  textInput: { 
    flex: 1, 
    fontSize: 16, 
    color: '#FFFFFF', 
    fontFamily: DS_FONT_UI,
    textAlign: 'left',
  },
  errorText: { 
    fontSize: 12, 
    color: '#EF4444', 
    marginTop: 6, 
    fontWeight: '500', 
    fontFamily: DS_FONT_UI, 
  },
  primaryAction: {
    height: 52,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  primaryActionText: { 
    color: '#000000', 
    fontSize: 17, 
    fontWeight: '700', 
    fontFamily: DS_FONT_UI 
  },
});

export const AuthProgressBar = ({ currentStep, totalSteps = 4 }) => (
  <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', flexDirection: 'row' }}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View
        key={i}
        style={{
          flex: 1,
          height: '100%',
          backgroundColor: i < currentStep ? '#FFFFFF' : 'transparent',
          marginHorizontal: 0.5,
        }}
      />
    ))}
  </View>
);

export const AuthScreenShell = ({
  children,
  title,
  onBack,
  footer,
  scroll = true,
  step,
  totalSteps = 4,
}) => {
  const { safeTop } = useResponsive();
  const safeInsetsTop = safeTop || 0;

  return (
    <View style={{ flex: 1, backgroundColor: AUTH_BG }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: safeInsetsTop }}>
        {onBack && (
          <View style={styles.header}>
              <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                  <Lucide.ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
          </View>
        )}
        {step ? (
          <View style={{ paddingBottom: 10 }}>
            <AuthProgressBar currentStep={step} totalSteps={totalSteps} />
          </View>
        ) : null}
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={onBack ? 60 : 0}
      >
        {scroll ? (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 }}
          >
            {title ? <Text style={styles.shellTitle}>{title}</Text> : null}
            {children}
            {footer ? <View style={{ paddingVertical: 20 }}>{footer}</View> : null}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {title ? <Text style={styles.shellTitle}>{title}</Text> : null}
            {children}
            {footer ? <View style={{ paddingVertical: 20 }}>{footer}</View> : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};


export const AuthField = ({ label, icon: Icon, children, error, hint, required, noContainer }) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={{ marginBottom: 28 }}>
      {label ? (
        <Text style={styles.fieldLabel}>
          {label}{required ? ' *' : ''}
        </Text>
      ) : null}
      {noContainer ? (
        <View>{children}</View>
      ) : (
        <View
          style={[
            styles.fieldContainer,
            error ? { borderColor: '#EF4444' } : isFocused ? { borderColor: '#FFFFFF' } : null
          ]}
        >
          <View style={{ flex: 1 }}>
            {React.Children.map(children, child => {
              if (!React.isValidElement(child)) return null;
              return React.cloneElement(child, {
                onFocus: (e) => {
                  setIsFocused(true);
                  child.props.onFocus && child.props.onFocus(e);
                },
                onBlur: (e) => {
                  setIsFocused(false);
                  child.props.onBlur && child.props.onBlur(e);
                },
              });
            })}
          </View>
          {Icon && <Icon size={20} color="#FFFFFF" strokeWidth={2} style={{ marginLeft: 12 }} />}
        </View>
      )}
      {hint ? (
        <Text style={{ fontSize: 15, color: '#FFFFFF', marginTop: 10, lineHeight: 22, fontWeight: '600', fontFamily: DS_FONT_UI }}>
           {hint}
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export const AuthTextInput = React.forwardRef(({ style, editable = true, onClear, value, ...props }, ref) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
    <TextInput
      ref={ref}
      editable={editable}
      placeholderTextColor="rgba(255,255,255,0.4)"
      selectionColor="#FFFFFF"
      value={value}
      style={[
        styles.textInput,
        { color: editable ? '#FFFFFF' : '#9CA3AF' },
        style,
      ]}
      {...props}
    />
    {(onClear && value && value.length > 0) ? (
      <TouchableOpacity onPress={onClear} style={{ padding: 4 }}>
        <Lucide.X size={20} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    ) : null}
  </View>
));

export const AuthGlassCard = ({ children, style }) => (
  <View style={[{ width: '100%', paddingVertical: 16 }, style]}>
    {children}
  </View>
);

export const AuthTextLink = ({ prefix, linkLabel, onPress }) => (
  <Row justify="center" align="center" style={{ marginTop: 24 }}>
    {prefix ? <Text style={{ color: '#9CA3AF', fontSize: 14, fontFamily: DS_FONT_UI }}>{prefix} </Text> : null}
    <TouchableOpacity onPress={onPress}>
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', fontFamily: DS_FONT_UI, textDecorationLine: 'underline' }}>{linkLabel}</Text>
    </TouchableOpacity>
  </Row>
);

export const AuthPrimaryAction = ({ title, onPress, loading, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
    style={[
      styles.primaryAction,
      disabled && { opacity: 0.5 }
    ]}
  >
    {loading ? (
       <ActivityIndicator color="#000000" size="small" />
    ) : (
      <Text style={styles.primaryActionText}>{title}</Text>
    )}
  </TouchableOpacity>
);

export const AuthStepDots = ({ currentStep, totalSteps }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 }}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <View
        key={i}
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i === currentStep - 1 ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
        }}
      />
    ))}
  </View>
);

export const AuthChoiceGrid = ({ options, selected, onSelect, value, onChange, row = true }) => {
  const activeValue = selected || value;
  const handlePress = onSelect || onChange || (() => {});
  return (
    <View style={{ flexDirection: row ? 'row' : 'column', gap: 10 }}>
      {options.map((option) => {
        const isActive = activeValue === option.id;
        const Icon = option.icon;
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => handlePress(option.id)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              height: 52, // Same as textbox
              borderRadius: 8,
              backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {Icon && <Icon size={18} color={isActive ? '#000000' : '#FFFFFF'} style={{ marginRight: 8 }} />}
            <Text style={{ 
              color: isActive ? '#000000' : '#FFFFFF', 
              fontSize: 15, 
              fontWeight: isActive ? '700' : '600',
              fontFamily: DS_FONT_UI 
            }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const AuthSelect = ({ value, label, onPress, error }) => (
  <View style={{ marginBottom: 28 }}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.fieldContainer,
        error ? { borderColor: '#EF4444' } : null
      ]}
    >
      <Text style={{ flex: 1, fontSize: 16, color: value ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontFamily: DS_FONT_UI }}>
        {value || 'Select option'}
      </Text>
      <Lucide.ChevronDown size={20} color="#FFFFFF" />
    </TouchableOpacity>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);


