import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Card, Row, Col, Heading } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const LocationSection = ({ 
  locLoading, 
  location, 
  useManualLocation, 
  selectedCoords, 
  onReset, 
  onOpenMap 
}) => {
  const { theme, atomic } = useTheme();

  const lat = useManualLocation && selectedCoords ? selectedCoords.lat : (location?.coords.latitude || 0);
  const lng = useManualLocation && selectedCoords ? selectedCoords.lng : (location?.coords.longitude || 0);

  return (
    <Card variant="raised" style={[atomic.p20, atomic.mb20]}>
      <Row align="center" style={atomic.mb16}>
        <Ionicons name="location-sharp" size={20} color={theme.error} />
        <Heading size="sm" style={atomic.ml8}>Incident Location</Heading>
      </Row>

      {locLoading ? (
        <Row align="center" style={[atomic.p12, atomic.mb16, { backgroundColor: theme.surfaceVariant, borderRadius: 12 }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[atomic.t.caption, atomic.ml10, { color: theme.textSecondary }]}>Acquiring GPS location...</Text>
        </Row>
      ) : (
        <View style={[atomic.p12, atomic.mb16, { backgroundColor: theme.surfaceVariant, borderRadius: 12 }]}>
          <Row justify="space-between" align="center">
            <Col style={atomic.l.flex}>
              <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </Text>
              <Text style={[atomic.t.tiny, { color: theme.textSecondary, marginTop: 2 }]}>
                {useManualLocation ? 'Manually selected on map' : 'Current GPS Coordinates'}
              </Text>
            </Col>
            {!useManualLocation && (
              <View style={[atomic.px8, atomic.py2, { backgroundColor: theme.success, borderRadius: 4 }]}>
                <Text style={[atomic.t.tiny, atomic.t.heavy, { color: '#fff' }]}>GPS LOCKED</Text>
              </View>
            )}
          </Row>
        </View>
      )}

      <Row gap={12}>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, borderWidth: 1, borderColor: theme.border }]}
          onPress={onReset}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.text} />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: theme.text }]}>Reset GPS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, backgroundColor: theme.primary }]}
          onPress={onOpenMap}
        >
          <MaterialCommunityIcons name="map-marker-plus" size={18} color="#fff" />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: '#fff' }]}>Select on Map</Text>
        </TouchableOpacity>
      </Row>
    </Card>
  );
};
