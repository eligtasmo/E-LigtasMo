import React, { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Platform, StyleSheet } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col, Container, useResponsive, DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';

const BLUE = '#2F7BFF';
const DARK = 'rgba(17,18,22,0.96)';
const DARK_SOFT = 'rgba(30,31,36,0.96)';
const LIGHT = 'rgba(255,255,255,0.96)';
const GREEN = '#5DE2A0';
const ORANGE = '#F59E0B';
const RED = '#EF4444';

const getManeuverIcon = (instruction = '') => {
  const text = String(instruction).toLowerCase();
  if (text.includes('u-turn')) return Lucide.CornerUpLeft;
  if (text.includes('sharp left')) return Lucide.ArrowUpLeft;
  if (text.includes('sharp right')) return Lucide.ArrowUpRight;
  if (text.includes('left')) return Lucide.ArrowLeft;
  if (text.includes('right')) return Lucide.ArrowRight;
  if (text.includes('roundabout')) return Lucide.RotateCw;
  if (text.includes('merge')) return Lucide.GitMerge;
  if (text.includes('exit')) return Lucide.LogOut;
  return Lucide.ArrowUp;
};

export const NavigationOverlay = ({
  currentStep,
  upcomingSteps = [],
  speed,
  navigationData,
  isMuted,
  onStop,
  onRecenter,
  onToggleMute,
  insets,
  nearestBarangay,
  nearestShelter,
  onRedirect
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { atomic } = useTheme();
  const { width, height, isPortrait } = useResponsive();
  const isLandscape = !isPortrait;
  const safeTop = Math.max(insets?.top || 0, 16);
  const safeBottom = Math.max(insets?.bottom || 0, 16);
  
  const getDetailedInstruction = () => {
    const base = currentStep?.instruction || 'Continue on the selected safe route';
    const street = currentStep?.name && currentStep.name !== '-' ? currentStep.name : '';
    
    // If the base instruction is too short or generic, and we have a street name, combine them.
    // Mapbox instructions often include the street name, but we ensure it here for Waze-style fidelity.
    if (street && !base.toLowerCase().includes(street.toLowerCase())) {
      // Clean up common generic phrases
      if (base.toLowerCase() === 'turn left') return `Turn left onto ${street}`;
      if (base.toLowerCase() === 'turn right') return `Turn right onto ${street}`;
      if (base.toLowerCase() === 'continue') return `Continue on ${street}`;
      if (base.toLowerCase() === 'head') return `Head onto ${street}`;
      
      // If it doesn't already have 'onto' or 'on', and we have a street, append it smartly
      if (!base.includes(' onto ') && !base.includes(' on ')) {
         return `${base} onto ${street}`;
      }
    }
    return base;
  };

  const nextInstruction = getDetailedInstruction();
  const ManeuverIcon = getManeuverIcon(nextInstruction);
  const nextDistance = currentStep?.distanceMeters != null ? Math.max(1, Math.round(currentStep.distanceMeters)) : 500;
  const liveSpeed = Number.isFinite(speed) ? Math.max(0, Math.round(speed)) : 0;
  const arrivalText = navigationData.arrivalTimestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--';
  const etaText = `${Math.ceil(navigationData.durationRemaining / 60)} min`;
  const remainingText = `${(navigationData.distanceRemaining / 1000).toFixed(1)} km`;

  if (isLandscape) {
    return (
      <View style={[atomic.l.abs, atomic.l.fill, { zIndex: 3000, pointerEvents: 'box-none' }]}>
        {/* LANDSCAPE: Floating Turn Instruction (Top Left) */}
        <MotiView
          animate={{ height: isExpanded ? 340 : 88 }}
          transition={{ type: 'timing', duration: 300 }}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 320,
            backgroundColor: 'rgba(15,16,20,0.98)',
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            shadowColor: '#000',
            shadowOpacity: 0.8,
            shadowRadius: 20,
            overflow: 'hidden',
            pointerEvents: 'auto'
          }}
        >
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.9} style={{ flex: 1 }}>
            <Row align="center">
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <ManeuverIcon size={28} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <Col style={{ flex: 1, marginLeft: 16 }}>
                <Row align="center">
                  <Text style={{ fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5, lineHeight: 36, fontFamily: DS_FONT_UI }}>
                    {nextDistance}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginLeft: 6, marginTop: 4, fontFamily: DS_FONT_UI }}>M</Text>
                </Row>
                <Col style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', lineHeight: 20, fontFamily: DS_FONT_UI }} numberOfLines={2}>
                    {nextInstruction}
                  </Text>
                </Col>
              </Col>
              {isExpanded && (
                <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Lucide.ChevronUp size={24} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </Row>

            {isExpanded && (
              <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} style={{ marginTop: 16, flex: 1 }}>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 16 }} />
                <Row justify="space-between" style={{ marginBottom: 20 }}>
                  <Col>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Mission ETA</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}>{etaText}</Text>
                  </Col>
                  <Col align="flex-end">
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Remaining</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: BLUE }}>{remainingText}</Text>
                  </Col>
                </Row>
                <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Upcoming Steps</Text>
                {upcomingSteps.slice(0, 3).map((step, idx) => {
                  const StepIcon = getManeuverIcon(step.instruction);
                  return (
                    <Row key={idx} align="center" gap={12} style={{ marginBottom: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                        <StepIcon size={16} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                      </View>
                      <Col style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }} numberOfLines={1}>{step.instruction}</Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{Math.round(step.distance)} m</Text>
                      </Col>
                    </Row>
                  );
                })}
              </MotiView>
            )}
          </TouchableOpacity>
        </MotiView>

        {/* LANDSCAPE: Nearest Assets Suggestions (Moved to Right under Speed) */}
        {(nearestBarangay || nearestShelter) && (
          <MotiView
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            style={{ position: 'absolute', right: 16, top: 120, gap: 10, alignItems: 'flex-end' }}
          >
            {nearestBarangay && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm(`Change destination to ${nearestBarangay.name}?`)) {
                      onRedirect(nearestBarangay, nearestBarangay.name);
                    }
                  } else {
                    onRedirect(nearestBarangay, nearestBarangay.name);
                  }
                }}
                style={{ backgroundColor: 'rgba(21,17,14,0.94)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: 160, minWidth: 160 }}
              >
                <Row align="center" gap={6} style={{ marginBottom: 4 }}>
                   <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
                   <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>Sector Node</Text>
                </Row>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>{nearestBarangay.name}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: BLUE, marginTop: 4 }}>{Math.round(nearestBarangay.distance)}m <Text style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '600', textTransform: 'lowercase' }}>away</Text></Text>
              </TouchableOpacity>
            )}
            {nearestShelter && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm(`Change destination to ${nearestShelter.name}?`)) {
                      onRedirect(nearestShelter, nearestShelter.name);
                    }
                  } else {
                    onRedirect(nearestShelter, nearestShelter.name);
                  }
                }}
                style={{ backgroundColor: 'rgba(21,17,14,0.94)', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: 160, minWidth: 160 }}
              >
                <Row align="center" gap={6} style={{ marginBottom: 4 }}>
                   <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                   <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>Relief Shelter</Text>
                </Row>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>{nearestShelter.name}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: GREEN, marginTop: 4 }}>{Math.round(nearestShelter.distance)}m <Text style={{ color: 'rgba(255,255,255,0.2)', fontWeight: '600', textTransform: 'lowercase' }}>away</Text></Text>
              </TouchableOpacity>
            )}
          </MotiView>
        )}

        {/* LANDSCAPE: Speed Metrics (Top Right) */}
        <MotiView
          from={{ opacity: 0, translateX: 20 }}
          animate={{ opacity: 1, translateX: 0 }}
          style={{ position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 10 }}
        >
          <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: 'white' }}>{liveSpeed}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 }}>mph</Text>
          </View>
          <View style={{ width: 72, height: 72, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#333' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#333' }}>30</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#333', textTransform: 'uppercase', letterSpacing: 0.5 }}>mph</Text>
          </View>
        </MotiView>

        {/* LANDSCAPE: Map Controls (Moved to Left to avoid collision) */}
        <View style={{ position: 'absolute', left: 24, bottom: safeBottom + 80, gap: 10 }}>
          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(21,17,14,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Lucide.Plus size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(21,17,14,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Lucide.Minus size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRecenter} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(21,17,14,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Lucide.Target size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* LANDSCAPE: Floating Progress Bar */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={{ position: 'absolute', bottom: 20, left: width * 0.25, right: width * 0.25, backgroundColor: 'rgba(21,17,14,0.97)', borderRadius: 24, padding: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 20 }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{remainingText}</Text>
             <View style={{ flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, marginHorizontal: 20, overflow: 'hidden' }}>
                <View style={{ width: '45%', height: '100%', backgroundColor: BLUE, borderRadius: 3 }} />
             </View>
             <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{etaText}</Text>
          </View>
          <TouchableOpacity onPress={onStop} style={{ marginLeft: 20, width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <Lucide.X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </MotiView>
      </View>
    );
  }

  // PORTRAIT VIEW
  return (
    <View style={[atomic.l.abs, atomic.l.fill, { zIndex: 3000, pointerEvents: 'box-none' }]}>
      {/* PORTRAIT: Expandable Instruction Bar */}
      <MotiView
        key="instruction-bar-moti"
        animate={{ height: isExpanded ? 320 : 92 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{
          position: 'absolute',
          top: safeTop + 4,
          left: 20,
          right: 20,
          zIndex: 3500,
          backgroundColor: 'rgba(15,16,20,0.98)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          shadowColor: '#000',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          overflow: 'hidden',
          pointerEvents: 'auto'
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => setIsExpanded(!isExpanded)}
          style={{ padding: 20, flexDirection: 'row', alignItems: 'center', height: 92 }}
        >
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <ManeuverIcon size={30} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Col style={{ flex: 1, marginLeft: 16 }}>
            <Row align="center">
              <Text style={{ fontSize: 38, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2, lineHeight: 38 }}>
                {nextDistance}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.3)', marginLeft: 6, marginTop: 4 }}>M</Text>
            </Row>
            <Col style={{ marginTop: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', lineHeight: 22 }} numberOfLines={2}>
                {nextInstruction}
              </Text>
            </Col>
          </Col>
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Lucide.ChevronDown size={24} color="rgba(255,255,255,0.2)" />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <MotiView 
            key="expanded-steps-panel"
            from={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 16 }}
          >
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
            {upcomingSteps.slice(0, 4).map((step, idx) => {
              const StepIcon = getManeuverIcon(step.instruction);
              return (
                <Row key={idx} align="center" gap={12} style={{ marginBottom: 14 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                    <StepIcon size={16} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                  </View>
                  <Col style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }} numberOfLines={1}>{step.instruction}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{Math.round(step.distance)} m</Text>
                  </Col>
                </Row>
              );
            })}
          </MotiView>
        )}
      </MotiView>

      {/* PORTRAIT: Floating Controls */}
      <View style={{ position: 'absolute', right: 14, top: safeTop + 100, gap: 10 }}>
        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: DARK_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Lucide.Plus size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: DARK_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Lucide.Minus size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onRecenter} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: DARK_SOFT, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Lucide.Target size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* PORTRAIT: Nearest Assets Suggestions */}
      {(nearestBarangay || nearestShelter) && (
        <MotiView 
          key="nearest-shelter-chip"
          from={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          style={{ position: 'absolute', right: 14, bottom: safeBottom + 85, gap: 10, alignItems: 'flex-end' }}
        >
          {nearestBarangay && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm(`Change destination to ${nearestBarangay.name}?`)) {
                    onRedirect(nearestBarangay, nearestBarangay.name);
                  }
                } else {
                  onRedirect(nearestBarangay, nearestBarangay.name);
                }
              }}
              style={{ backgroundColor: 'rgba(21,17,14,0.94)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: 180, minWidth: 180 }}
            >
              <Row align="center" gap={8} style={{ marginBottom: 6 }}>
                 <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
                 <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Sector Node</Text>
              </Row>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>{nearestBarangay.name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: BLUE, marginTop: 4 }}>{Math.round(nearestBarangay.distance)}m <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'lowercase' }}>away</Text></Text>
            </TouchableOpacity>
          )}
          {nearestShelter && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm(`Change destination to ${nearestShelter.name}?`)) {
                    onRedirect(nearestShelter, nearestShelter.name);
                  }
                } else {
                  onRedirect(nearestShelter, nearestShelter.name);
                }
              }}
              style={{ backgroundColor: 'rgba(21,17,14,0.94)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: 180, minWidth: 180 }}
            >
              <Row align="center" gap={8} style={{ marginBottom: 6 }}>
                 <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN }} />
                 <Text style={{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>Relief Shelter</Text>
              </Row>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>{nearestShelter.name}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: GREEN, marginTop: 4 }}>{Math.round(nearestShelter.distance)}m <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'lowercase' }}>away</Text></Text>
            </TouchableOpacity>
          )}
        </MotiView>
      )}

      {/* PORTRAIT: Speed Badge */}
      <View style={{ position: 'absolute', left: 14, bottom: safeBottom + 85 }}>
        <View style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: 'white' }}>{liveSpeed}</Text>
          <Text style={{ fontSize: 8, fontWeight: '600', color: 'white', textTransform: 'uppercase' }}>mph</Text>
        </View>
      </View>

      {/* PORTRAIT: Bottom Stats Bar */}
      <MotiView 
        key="bottom-stats-bar-moti"
        from={{ opacity: 0, translateY: 40 }} 
        animate={{ opacity: 1, translateY: 0 }} 
        style={{ position: 'absolute', left: 14, right: 14, bottom: safeBottom, zIndex: 3200 }}
      >
        <View style={{ width: '100%', backgroundColor: DARK, borderRadius: 24, height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20 }}>
          <TouchableOpacity onPress={onStop} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Lucide.X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 }}>
            <Col align="center">
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{etaText}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>MIN</Text>
            </Col>
            <Col align="center">
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>{remainingText}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>DIST</Text>
            </Col>
            <Col align="center">
              <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.8)', letterSpacing: -0.5 }}>{arrivalText}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ARR</Text>
            </Col>
          </View>
          <TouchableOpacity style={{ width: 52, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
            <Lucide.Menu size={20} color="#000" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
};
