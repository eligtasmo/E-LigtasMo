import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, Platform, TextInput, Keyboard } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col, Container, useResponsive, DS_FONT_UI } from '../DesignSystem';

export const RouteOptionsSheet = ({
  allRoutes = [],
  selectedRouteIndex = 0,
  setSelectedRouteIndex,
  onStartNavigation,
  collapsed = false,
  onToggleCollapse,
  destinationLabel,
  transportModes = [],
  selectedTravelMode = '',
  onSelectTravelMode,
  insets,
}) => {
  const { theme, atomic } = useTheme();
  const { width, height, isPortrait } = useResponsive();
  const isLandscape = !isPortrait;
  const isCompactMobile = width <= 430;
  const isDiscoveryMode = allRoutes.length === 0;
  
  const isTablet = width > 768;
  const HEADER_BAR_HEIGHT = 52; 
  const GAP = 16;
  const TOP_MARGIN = (insets?.top || 0) + GAP + HEADER_BAR_HEIGHT + GAP;
  const BOTTOM_MARGIN = Math.max(insets?.bottom || 0, 16);
  
  const PEEK_HEIGHT = 180;
  const COLLAPSED_HEIGHT = 300; // More compact layout
  const MAX_HEIGHT = height - TOP_MARGIN - BOTTOM_MARGIN - 16;
  
  const isExpanded = !collapsed && !isDiscoveryMode;
  const useFixedAnchors = isLandscape; // Only landscape uses dual-anchoring for max vertical space
  
  const currentHeight = isDiscoveryMode ? PEEK_HEIGHT : ((collapsed && !isLandscape) ? Math.min(COLLAPSED_HEIGHT, MAX_HEIGHT) : MAX_HEIGHT);
  const panelWidth = isLandscape ? (isTablet ? 420 : 360) : '100%';
  const finalBottom = BOTTOM_MARGIN;

  const selectedRoute = allRoutes[selectedRouteIndex] || allRoutes[0];
  const alternateRoutes = allRoutes.filter((_, index) => index !== selectedRouteIndex);

  // Tactical Grid Logic: Use spacers to enforce boundaries
  const showExpanded = (isLandscape || isExpanded);

  return (
    <View 
      style={{ 
        position: 'absolute', 
        top: 0, bottom: 0, left: 16, right: 16, 
        zIndex: 4000,
        pointerEvents: 'box-none'
      }}
    >
      <MotiView
        animate={{ 
          height: showExpanded ? MAX_HEIGHT + BOTTOM_MARGIN + 16 : currentHeight,
          bottom: 0,
        }}
        style={{
          position: 'absolute',
          width: isLandscape ? panelWidth : '100%',
          right: isLandscape ? 0 : 'auto',
          alignSelf: isLandscape ? 'flex-end' : 'center',
          height: showExpanded ? MAX_HEIGHT + BOTTOM_MARGIN + 16 : currentHeight,
          bottom: 0,
          pointerEvents: 'box-none'
        }}
      >
      <View 
        style={{ 
          width: '100%',
          height: '100%',
          backgroundColor: '#161412',
          borderTopLeftRadius: 32,
          borderTopRightRadius: isLandscape ? 0 : 32,
          borderBottomLeftRadius: isLandscape ? 32 : 0,
          borderBottomRightRadius: 0,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: BOTTOM_MARGIN + 12,
          borderColor: 'rgba(255,255,255,0.18)',
          borderWidth: 1.5,
          boxShadow: '0 15px 25px rgba(0,0,0,0.6)',
          elevation: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto'
        }}
      >
          {!isLandscape && (
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={onToggleCollapse}
              style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: collapsed ? 12 : 20 }} 
            />
          )}
      
      {isDiscoveryMode ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,170,41,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
             <Lucide.Navigation size={22} color="#B37213" strokeWidth={2.1} />
          </View>
          <Text style={{ color: '#F3EEE6', fontSize: 16, fontWeight: '600', fontFamily: DS_FONT_UI }}>Tactical Navigation</Text>
          <Text style={{ color: 'rgba(242,238,230,0.4)', marginTop: 4, fontSize: 13, fontFamily: DS_FONT_UI }}>Search for a destination to begin</Text>
        </View>
      ) : (
        <>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={{ flex: 1, marginHorizontal: -24 }} // Pull content edge-to-edge
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={onToggleCollapse}>
              <Row gap={0} style={{ marginBottom: 12 }}>
                {allRoutes.slice(0, 4).map((r, idx) => {
                  if (!r) return null;
                  const isSelected = selectedRouteIndex === idx;
                  const labels = ['FASTEST', 'BALANCED', 'SAFER', 'ALT'];
                  const accents = ['#2F7BFF', '#F59E0B', '#27AE60', '#6B7280'];
                  // Use a stable but unique key based on route properties
                  const routeKey = `route-v4-${idx}-${r.distMeters || 0}-${r.time || '0'}`;
                  
                  return (
                    <TouchableOpacity 
                      key={routeKey}
                      onPress={() => setSelectedRouteIndex(idx)}
                      activeOpacity={0.85}
                      style={{ 
                        flex: 1, 
                        paddingVertical: 12, 
                        backgroundColor: isSelected ? 'rgba(47, 123, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                        borderBottomWidth: 3,
                        borderBottomColor: isSelected ? accents[idx] : 'transparent',
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: '800', fontFamily: DS_FONT_UI }}>{r.time}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        {r.hazardWarning && <Lucide.AlertTriangle size={10} color="#FF4B4B" strokeWidth={3} />}
                        <Text style={{ color: isSelected ? (r.hazardWarning ? '#FF4B4B' : accents[idx]) : 'rgba(255,255,255,0.15)', fontSize: 8, fontWeight: '800', marginTop: 2, letterSpacing: 1.5 }}>{labels[idx] || 'ALT'}</Text>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, marginTop: 4, fontWeight: '600' }}>{r.distance}</Text>
                    </TouchableOpacity>
                  );
                })}
              </Row>
            </TouchableOpacity>
  
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 24 }}>Transport Mode</Text>
                <View style={{ 
                  flexDirection: 'row', 
                  width: '100%', 
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)'
                }}>
                  {transportModes.reduce((acc, current) => {
                      const x = acc.find(item => item.code === current.code);
                      if (!x) return acc.concat([current]);
                      else return acc;
                    }, []).slice(0, 4).map((mode, idx) => {
                    let iconName = 'walk';
                    if (mode.code.includes('motor') || mode.code.includes('cycle')) iconName = 'motorbike';
                    else if (mode.code.includes('car') || mode.code.includes('vehicle') || mode.code.includes('driv')) iconName = 'car';
                    else if (mode.code.includes('truck') || mode.code.includes('hgv')) iconName = 'truck';
                    
                    const isSelected = selectedTravelMode === mode.code;
                    const activeColor = '#2F7BFF'; 
                    const inactiveColor = 'rgba(255, 255, 255, 0.15)'; 
                    const activeBg = 'rgba(47, 123, 255, 0.12)';

                    return (
                      <TouchableOpacity 
                        key={`transport-mode-${mode.code}-${idx}`} 
                        onPress={() => onSelectTravelMode(mode.code)}
                        style={{ 
                          flex: 1,
                          height: 56, 
                          backgroundColor: isSelected ? activeBg : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRightWidth: idx < 3 ? 1 : 0,
                          borderRightColor: 'rgba(255,255,255,0.04)'
                        }}
                      >
                        <MaterialCommunityIcons name={iconName} size={24} color={isSelected ? activeColor : inactiveColor} />
                        {isSelected && <View style={{ position: 'absolute', bottom: 0, width: '40%', height: 2, backgroundColor: activeColor, borderRadius: 1 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
  
            <View style={{ paddingHorizontal: 24 }}>
                {(!collapsed || isLandscape) && selectedRoute?.steps?.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Journey Preview</Text>
                  {selectedRoute.steps.slice(0, 15).map((step, idx) => {
                    const getPreviewIcon = (instr = '') => {
                      const t = instr.toLowerCase();
                      if (t.includes('left')) return Lucide.ArrowUpLeft;
                      if (t.includes('right')) return Lucide.ArrowUpRight;
                      if (t.includes('roundabout')) return Lucide.RotateCw;
                      return Lucide.ArrowUp;
                    };
                    const PreviewIcon = getPreviewIcon(step.instruction);
                    const stepKey = `step-${idx}-${step.distance}-${step.instruction.substring(0, 15)}`;
                    return (
                      <Row key={stepKey} align="center" gap={14} style={{ marginBottom: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                          <PreviewIcon size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                        </View>
                        <Col style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }} numberOfLines={1}>{step.instruction}</Text>
                          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{Math.round(step.distance)} m</Text>
                        </Col>
                      </Row>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
  
          <Row gap={10} style={{ marginTop: 10, paddingBottom: (Platform.OS === 'ios' ? 0 : 8) }}>
            <TouchableOpacity 
              onPress={onToggleCollapse}
              style={{ 
                flex: 1, 
                height: 44, 
                borderRadius: 14, 
                backgroundColor: 'rgba(255,255,255,0.04)', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderWidth: 1, 
                borderColor: 'rgba(255,255,255,0.08)' 
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 12, fontFamily: DS_FONT_UI }}>DETAILS</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onStartNavigation}
              style={{ 
                flex: 2.5, 
                height: 44, 
                borderRadius: 14, 
                backgroundColor: '#2F7BFF', 
                alignItems: 'center', 
                justifyContent: 'center',
                shadowColor: '#2F7BFF',
                shadowOpacity: 0.2,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 }
              }}
            >
              <Row align="center" gap={6}>
                <Lucide.Navigation2 size={16} color="white" fill="white" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14, fontFamily: DS_FONT_UI, letterSpacing: 0.5 }}>GO NOW</Text>
              </Row>
            </TouchableOpacity>
          </Row>
        </>
      )}
        </View>
      </MotiView>
    </View>
  );
};
