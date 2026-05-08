import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Row, useResponsive, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';

export const SearchHeader = ({
  startLabel,
  destination,
  onStartSearch,
  onBack,
  autoFocus = false,
  insets,
  suggestions = [],
  onSelectSuggestion,
  onUseMyLocation,
  onReport,
  activeInput = 'dest', // 'start' | 'dest'
}) => {
  const { theme, atomic } = useTheme();
  const { width, safeTop } = useResponsive();

  return (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5000,
        paddingTop: safeTop,
        paddingHorizontal: 16,
        pointerEvents: 'box-none'
      }}
    >
      <View style={{ width: '100%', pointerEvents: 'auto' }}>
        {/* Header Row */}
        <Row justify="space-between" align="center" style={{ marginBottom: 8 }}>
          <Row align="center" gap={10}>
            <TouchableOpacity 
              activeOpacity={0.86} 
              onPress={onBack} 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Lucide.ChevronLeft size={18} color="#EEE8DF" strokeWidth={2.2} />
            </TouchableOpacity>
            <View 
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,170,41,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Lucide.Navigation size={15} color="#F7F3EC" strokeWidth={2.1} />
            </View>
            <Text 
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: '#F3EEE6',
                letterSpacing: -0.4,
                fontFamily: DS_FONT_UI,
              }}
            >
              Route Planner
            </Text>
          </Row>

          <Row gap={8}>
            <TouchableOpacity 
              activeOpacity={0.86} 
              onPress={onReport}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.3)',
                shadowColor: '#EF4444',
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <Lucide.ShieldAlert size={18} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </Row>
        </Row>

        {/* Search Bar Pill & Dropdown */}
        <View style={{ zIndex: 3000 }}>
          <View style={{ backgroundColor: '#161412', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}>
            
            {/* Start Location Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
              <View style={{ width: 16, alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#2F7BFF' }} />
              </View>
              <TextInput
                value={startLabel}
                onChangeText={(t) => onStartSearch(t, 'start')}
                placeholder="Starting point"
                placeholderTextColor="rgba(242,238,232,0.40)"
                style={{
                  flex: 1,
                  marginLeft: 12,
                  color: '#F3EEE6',
                  fontSize: 14,
                  fontWeight: '400',
                  paddingVertical: 0,
                  fontFamily: DS_FONT_INPUT,
                }}
              />
              <Row gap={8}>
                <TouchableOpacity onPress={onUseMyLocation} style={{ padding: 6, backgroundColor: 'rgba(47, 123, 255, 0.1)', borderRadius: 8 }}>
                  <Lucide.LocateFixed size={14} color="#2F7BFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </Row>
            </View>

            {/* Destination Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16 }}>
              <View style={{ width: 16, alignItems: 'center' }}>
                <Lucide.MapPin size={14} color="#EF4444" strokeWidth={2.5} />
              </View>
              <TextInput
                value={destination}
                onChangeText={(t) => onStartSearch(t, 'dest')}
                autoFocus={autoFocus}
                placeholder="Search destination"
                placeholderTextColor="rgba(242,238,232,0.40)"
                style={{
                  flex: 1,
                  marginLeft: 12,
                  color: '#F3EEE6',
                  fontSize: 14,
                  fontWeight: '400',
                  paddingVertical: 0,
                  fontFamily: DS_FONT_INPUT,
                }}
              />
              {(destination || '').length > 0 && (
                <TouchableOpacity
                  onPress={() => onStartSearch('', 'dest')}
                  style={{ padding: 4 }}
                >
                  <Lucide.XCircle size={14} color="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {(suggestions || []).length > 0 && (
              <MotiView
                from={{ opacity: 0, translateY: -10, scale: 0.98 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                exit={{ opacity: 0, translateY: -10, scale: 0.98 }}
                style={{
                  position: 'absolute',
                  top: 106,
                  left: 0,
                  right: 0,
                  backgroundColor: '#161412',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                  shadowColor: '#000',
                  shadowOpacity: 0.5,
                  shadowRadius: 30,
                  overflow: 'hidden',
                  maxHeight: 320,
                  marginTop: 8,
                }}
              >
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.id}-${index}`}
                    onPress={() => onSelectSuggestion(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: index === suggestions.length - 1 ? 0 : 1,
                      borderBottomColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#F2EEE8', fontFamily: DS_FONT_UI }} numberOfLines={1}>{item.name}</Text>
                      <Text style={{ fontSize: 11.5, fontWeight: '400', color: 'rgba(242,238,232,0.55)', marginTop: 2, fontFamily: DS_FONT_INPUT }} numberOfLines={1}>{item.address}</Text>
                    </View>
                    <Lucide.ArrowUpLeft size={16} color="rgba(242,238,230,0.3)" strokeWidth={2.1} />
                  </TouchableOpacity>
                ))}
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </View>
    </MotiView>
  );
};
