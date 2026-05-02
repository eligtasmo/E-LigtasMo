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

const ACCENT = '#FF9D01';
const AUTH_BG = '#000000';

export const AUTH_COLORS = {
  ACCENT: '#FF9D01',
  BG: '#000000',
  FIELD: 'rgba(255,255,255,0.06)',
  BORDER: 'rgba(255,255,255,0.1)',
  TEXT_MAIN: '#FFFFFF',
  TEXT_MUTED: 'rgba(255,255,255,0.5)',
};

export const AUTH_FONTS = {
  FONT_HEADING: DS_FONT_UI,
  FONT_INPUT: DS_FONT_INPUT,
};

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shellTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFFFFF', 
    fontFamily: DS_FONT_UI,
  },
  fieldLabel: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#FFFFFF', 
    marginBottom: 8, 
    fontFamily: DS_FONT_UI, 
    marginLeft: 2
  },
  fieldContainer: {
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  textInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#FFF', 
    fontFamily: DS_FONT_UI 
  },
  errorText: { 
    fontSize: 12, 
    color: '#FF4B4B', 
    marginTop: 6, 
    fontWeight: '500', 
    fontFamily: DS_FONT_UI, 
    marginLeft: 10 
  },
  primaryAction: {
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  primaryActionText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: '700', 
    fontFamily: DS_FONT_UI 
  },
});

export const AuthScreenShell = ({
  children,
  title,
  onBack,
  footer,
  scroll = true,
}) => {
  const { safeTop } = useResponsive();
  const safeInsetsTop = safeTop || 0;

  const body = (
    <View style={{ 
      flex: 1, 
      paddingTop: safeInsetsTop + 10,
      paddingHorizontal: 24,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        {onBack && (
          <TouchableOpacity 
            onPress={onBack}
            style={styles.backBtn}
          >
            <Lucide.ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1, alignItems: 'center', marginRight: onBack ? 40 : 0 }}>
            <Text style={styles.shellTitle}>{title}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {children}
      </View>
      
      {footer && <View style={{ paddingVertical: 20 }}>{footer}</View>}
    </View>
  );

  return (
    <Screen withOrnament={false} style={{ backgroundColor: AUTH_BG }}>
      {/* Background Glow Effect from image */}
      <View style={{ 
          position: 'absolute', 
          top: -50, 
          left: 0, 
          right: 0, 
          height: 350, 
          backgroundColor: 'rgba(255, 157, 1, 0.12)', 
          borderRadius: 200,
          transform: [{ scaleX: 2 }],
          opacity: 0.4
      }} />
      
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
            {body}
          </ScrollView>
        ) : body}
      </KeyboardAvoidingView>
    </Screen>
  );
};

export const AuthField = ({ label, icon: Icon, children, error }) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={{ marginBottom: 20 }}>
      {label && (
        <Text style={[styles.fieldLabel, isFocused && { color: ACCENT }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.fieldContainer,
          error ? { borderColor: '#FF4B4B' } : isFocused ? { borderColor: ACCENT } : null
        ]}
      >
        {Icon && <Icon size={20} color={isFocused ? ACCENT : 'rgba(255,255,255,0.4)'} strokeWidth={1.5} />}
        <View style={{ flex: 1, marginLeft: Icon ? 12 : 0 }}>
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                onFocus: (e) => {
                  setIsFocused(true);
                  child.props.onFocus && child.props.onFocus(e);
                },
                onBlur: (e) => {
                  setIsFocused(false);
                  child.props.onBlur && child.props.onBlur(e);
                }
              });
            }
            return child;
          })}
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

export const AuthTextInput = React.forwardRef(({ style, editable = true, ...props }, ref) => (
  <TextInput
    ref={ref}
    editable={editable}
    placeholderTextColor="rgba(255,255,255,0.3)"
    selectionColor={ACCENT}
    style={[
      styles.textInput,
      { color: editable ? '#FFF' : 'rgba(255,255,255,0.4)' },
      style,
    ]}
    {...props}
  />
));

export const AuthGlassCard = ({ children, style }) => (
  <View style={[{ width: '100%' }, style]}>
    {children}
  </View>
);

export const AuthTextLink = ({ prefix, linkLabel, onPress }) => (
  <Row justify="center" align="center" style={{ marginTop: 20 }}>
    {prefix && <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: DS_FONT_UI }}>{prefix} </Text>}
    <TouchableOpacity onPress={onPress}>
      <Text style={{ color: ACCENT, fontSize: 13, fontWeight: '700', fontFamily: DS_FONT_UI }}>{linkLabel}</Text>
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
       <ActivityIndicator color="#000" size="small" />
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
          width: i === currentStep - 1 ? 24 : 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: i === currentStep - 1 ? ACCENT : 'rgba(255,255,255,0.15)',
        }}
      />
    ))}
  </View>
);

export const AuthChoiceGrid = ({ options, selected, onSelect }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.id}
        onPress={() => onSelect(opt.id)}
        style={{
          flex: 1,
          minWidth: '45%',
          height: 64,
          borderRadius: 32,
          backgroundColor: selected === opt.id ? 'rgba(255,157,1,0.1)' : 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: selected === opt.id ? ACCENT : 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexDirection: 'row'
        }}
      >
        {opt.icon && <opt.icon size={20} color={selected === opt.id ? ACCENT : 'rgba(255,255,255,0.4)'} />}
        <Text style={{ fontSize: 13, fontWeight: '600', color: selected === opt.id ? ACCENT : '#FFF', fontFamily: DS_FONT_UI }}>{opt.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const AuthSelect = ({ value, label, onPress, error }) => (
  <View style={{ marginBottom: 20 }}>
    {label && <Text style={styles.fieldLabel}>{label}</Text>}
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.fieldContainer,
        error ? { borderColor: '#FF4B4B' } : null
      ]}
    >
      <Text style={{ flex: 1, fontSize: 15, color: value ? '#FFF' : 'rgba(255,255,255,0.3)', fontFamily: DS_FONT_UI }}>
        {value || 'Select option'}
      </Text>
      <Lucide.ChevronDown size={18} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);
