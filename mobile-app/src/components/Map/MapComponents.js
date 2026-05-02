import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const MapOverlayControls = ({
  searchQuery,
  onSearchChange,
  searchType,
  setSearchType,
  selectedRisk,
  setSelectedRisk,
  onNavigateToRoute,
  suggestions,
  onSelectSuggestion,
  hazardsTypeCount = {}
}) => {
  const { theme, atomic } = useTheme();

  return (
    <View style={[atomic.abs, atomic.fillWidth, atomic.px16, atomic.pt16, { top: 0, zIndex: 100 }]}>
      <Card variant="raised" style={[atomic.p4, { borderRadius: 24, paddingLeft: 12 }]}>
        <Row align="center">
          <MaterialCommunityIcons name="magnify" size={20} color={theme.textMuted} />
          <TextInput
            style={[atomic.l.flex, atomic.px8, atomic.py8, atomic.t.body, { color: theme.text }]}
            placeholder={searchType === 'location' ? "Search location..." : "Search hazards..."}
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          <TouchableOpacity 
            onPress={() => setSearchType(prev => prev === 'location' ? 'report' : 'location')}
            style={[atomic.p8, atomic.mr4, { borderRadius: 20, backgroundColor: theme.surfaceVariant }]}
          >
            <MaterialCommunityIcons 
              name={searchType === 'location' ? 'map-marker-radius' : 'alert-circle-outline'} 
              size={18} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </Row>
      </Card>

      {suggestions.length > 0 && (
        <Card variant="raised" style={[atomic.mt8, { padding: 0, overflow: 'hidden', maxHeight: 220 }]}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[atomic.row, atomic.aic, atomic.p16, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                onPress={() => onSelectSuggestion(item)}
              >
                <MaterialCommunityIcons 
                  name={item.type === 'location' ? 'map-marker' : 'alert-circle'} 
                  size={18} 
                  color={theme.textMuted} 
                />
                <Col style={[atomic.l.flex, atomic.ml12]}>
                  <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[atomic.t.tiny, { color: theme.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                </Col>
              </TouchableOpacity>
            )}
          />
        </Card>
      )}

      <Row style={atomic.mt12} gap={8}>
        <TouchableOpacity 
          onPress={onNavigateToRoute}
          style={[atomic.row, atomic.aic, atomic.px12, atomic.py8, { borderRadius: 20, backgroundColor: '#FCD34D', borderWidth: 1, borderColor: '#F59E0B', elevation: 2 }]}
        >
          <MaterialCommunityIcons name="map-marker-path" size={18} color="#92400E" style={atomic.mr6} />
          <Text style={[atomic.t.tiny, atomic.t.heavy, { color: '#92400E' }]}>SAFE ROUTE</Text>
        </TouchableOpacity>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['All', 'Flood', 'Fire', 'Accident', 'Critical'].map((type) => (
            <TouchableOpacity 
              key={type}
              onPress={() => setSelectedRisk(type)}
              style={[
                atomic.px12, 
                atomic.py8, 
                { 
                  borderRadius: 20, 
                  backgroundColor: selectedRisk === type ? theme.text : theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border
                }
              ]}
            >
              <Text style={[atomic.t.tiny, atomic.t.bold, { color: selectedRisk === type ? theme.background : theme.textSecondary }]}>{type.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Row>
    </View>
  );
};

export const ShelterInfoCard = ({ shelter, onRecenter, onNavigate }) => {
  const { theme, atomic } = useTheme();

  if (!shelter) return null;

  const occupancyPercent = Math.min(100, Math.round((shelter.occupancy / Math.max(1, shelter.capacity)) * 100));

  return (
    <Card variant="raised" style={[atomic.abs, { bottom: 32, left: 16, right: 16, zIndex: 100, padding: 20, borderRadius: 24 }]}>
      <Row justify="space-between" align="center" style={atomic.mb8}>
        <Heading size="sm" style={atomic.l.flex}>{shelter.name}</Heading>
        <View style={[atomic.px8, atomic.py2, { backgroundColor: theme.primaryBg, borderRadius: 6 }]}>
           <Text style={[atomic.t.tiny, atomic.t.heavy, { color: theme.primary }]}>{shelter.status?.toUpperCase() || 'OPEN'}</Text>
        </View>
      </Row>
      <Text style={[atomic.t.caption, atomic.mb16, { color: theme.textSecondary }]}>{shelter.location}</Text>
      
      <Row justify="space-between" style={atomic.mb6}>
        <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.textSecondary }]}>OCCUPANCY</Text>
        <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.text }]}>{shelter.occupancy} / {shelter.capacity}</Text>
      </Row>
      <View style={[atomic.fillWidth, { height: 6, backgroundColor: theme.surfaceVariant, borderRadius: 3, marginBottom: 20 }]}>
        <View style={[atomic.fill, { width: `${occupancyPercent}%`, backgroundColor: theme.primary, borderRadius: 3 }]} />
      </View>

      <Row gap={12}>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, borderWidth: 1, borderColor: theme.border }]}
          onPress={onRecenter}
        >
          <MaterialCommunityIcons name="focus-field" size={18} color={theme.text} />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: theme.text }]}>Recenter</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, backgroundColor: theme.primary }]}
          onPress={onNavigate}
        >
          <MaterialCommunityIcons name="navigation" size={18} color="#fff" />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: '#fff' }]}>Navigate</Text>
        </TouchableOpacity>
      </Row>
    </Card>
  );
};
