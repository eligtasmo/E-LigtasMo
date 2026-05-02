import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col, Heading, IconBox } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const FLOOD_LEVELS = [
  { id: 'BelowKnee', label: 'Below the Knee', severity: 'Low', color: '#FFB74D', group: 'Low' },
  { id: 'Knee', label: 'Knee Deep', severity: 'Medium', color: '#F59E0B', group: 'Medium' },
  { id: 'AboveKnee', label: 'Above the Knee', severity: 'Medium', color: '#FB8C00', group: 'Medium' },
  { id: 'Waist', label: 'Waist Deep', severity: 'High', color: '#EF4444', group: 'High' },
  { id: 'Chest', label: 'Chest Deep', severity: 'High', color: '#D84315', group: 'High' },
  { id: 'Neck', label: 'Neck Deep', severity: 'High', color: '#B71C1C', group: 'High' },
];

export const SeverityPicker = ({ visible, onClose, selectedId, onSelect }) => {
  const { theme, atomic } = useTheme();

  const selectedLevel = FLOOD_LEVELS.find(l => l.id === selectedId);

  return (
    <>
      <Card variant="raised" style={[atomic.p20, atomic.mb20]}>
        <Row align="center" style={atomic.mb16}>
          <MaterialCommunityIcons name="ruler" size={20} color={theme.primary} />
          <Heading size="sm" style={atomic.ml8}>Flood Depth</Heading>
        </Row>
        
        <TouchableOpacity 
          onPress={() => onSelect(null, true)} 
          style={[
            atomic.row, 
            atomic.aic, 
            atomic.jcb, 
            atomic.p16, 
            { backgroundColor: theme.surfaceVariant, borderRadius: 16, borderWidth: 1, borderColor: theme.border }
          ]}
        >
          <Row align="center" gap={12}>
            {selectedLevel ? (
              <>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: selectedLevel.color, justifyContent:'center', alignItems:'center' }}>
                  <MaterialCommunityIcons name="waves" size={24} color="#fff" />
                </View>
                <Col>
                  <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>{selectedLevel.label}</Text>
                  <Text style={[atomic.t.tiny, { color: theme.textSecondary }]}>Severity: {selectedLevel.severity}</Text>
                </Col>
              </>
            ) : (
              <>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.border, justifyContent:'center', alignItems:'center' }}>
                  <MaterialCommunityIcons name="ruler" size={24} color={theme.textMuted} />
                </View>
                <Text style={[atomic.t.body, { color: theme.textSecondary }]}>Select flood depth level</Text>
              </>
            )}
          </Row>
          <MaterialCommunityIcons name="chevron-down" size={24} color={theme.textMuted} />
        </TouchableOpacity>
      </Card>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={[atomic.fill, atomic.justifyEnd, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[atomic.p24, { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }]}>
            <Row justify="space-between" align="center" style={atomic.mb20}>
              <Heading size="md">Select Flood Depth</Heading>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </Row>

            <ScrollView showsVerticalScrollIndicator={false}>
              {['Low', 'Medium', 'High'].map((group) => (
                <View key={group} style={atomic.mb20}>
                  <Text style={[atomic.t.tiny, atomic.t.heavy, atomic.mb10, atomic.ml4, { color: theme.textMuted, letterSpacing: 1 }]}>
                    {group.toUpperCase()} LEVELS
                  </Text>
                  {FLOOD_LEVELS.filter(l => l.group === group).map((l) => (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => onSelect(l.id)}
                      style={[
                        atomic.row, 
                        atomic.aic, 
                        atomic.p16, 
                        atomic.mb8, 
                        { 
                          borderRadius: 14, 
                          backgroundColor: selectedId === l.id ? l.color + '15' : theme.surfaceVariant,
                          borderWidth: 1.5,
                          borderColor: selectedId === l.id ? l.color : 'transparent'
                        }
                      ]}
                    >
                      <IconBox name="waves" size={20} color="#fff" backgroundColor={l.color} style={atomic.mr12} />
                      <Text style={[atomic.t.body, atomic.t.bold, atomic.l.flex, { color: theme.text }]}>{l.label}</Text>
                      {selectedId === l.id && <MaterialCommunityIcons name="check-circle" size={22} color={l.color} />}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};
