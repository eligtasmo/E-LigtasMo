import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const AnnouncementModal = ({ 
  visible, 
  onClose, 
  formData, 
  setFormData, 
  onSave, 
  saving, 
  isEditing,
  barangays = []
}) => {
  const { theme, atomic } = useTheme();

  const types = ['info', 'warning', 'error', 'success'];
  const audiences = ['all', 'residents', 'barangay'];

  const getStatusColor = (type) => {
    switch(type) {
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      case 'success': return theme.success;
      default: return theme.info;
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.center, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={{ width: '90%', maxHeight: '85%' }}>
          <Card variant="raised" style={atomic.p24}>
            <Row justify="space-between" align="center" style={atomic.mb20}>
              <Text style={[atomic.t.h4, atomic.t.heavy, { color: theme.text }]}>
                {isEditing ? 'Edit Announcement' : 'New Announcement'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </Row>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, { color: theme.text }]}>Title</Text>
              <TextInput
                style={[atomic.px16, atomic.py12, atomic.mb16, { 
                  backgroundColor: theme.surfaceVariant, 
                  borderRadius: 12, 
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border
                }]}
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
                placeholder="Alert Title"
                placeholderTextColor={theme.placeholder}
              />

              <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb8, { color: theme.text }]}>Message</Text>
              <TextInput
                style={[atomic.px16, atomic.py12, atomic.mb16, { 
                  backgroundColor: theme.surfaceVariant, 
                  borderRadius: 12, 
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  minHeight: 100
                }]}
                value={formData.message}
                onChangeText={(text) => setFormData({...formData, message: text})}
                placeholder="Write your message here..."
                placeholderTextColor={theme.placeholder}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb12, { color: theme.text }]}>Alert Level</Text>
              <View style={[atomic.row, { flexWrap: 'wrap', gap: 8, marginBottom: 16 }]}>
                {types.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      atomic.px12, 
                      atomic.py8, 
                      { 
                        borderRadius: 10, 
                        borderWidth: 1, 
                        borderColor: formData.type === type ? getStatusColor(type) : theme.border,
                        backgroundColor: formData.type === type ? getStatusColor(type) : 'transparent'
                      }
                    ]}
                    onPress={() => setFormData({...formData, type})}
                  >
                    <Text style={[
                      atomic.t.tiny, 
                      atomic.t.heavy, 
                      { color: formData.type === type ? '#fff' : theme.textSecondary }
                    ]}>{type.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb12, { color: theme.text }]}>Who can see this?</Text>
              <View style={[atomic.row, { gap: 8, marginBottom: 16 }]}>
                {audiences.map((aud) => (
                  <TouchableOpacity
                    key={aud}
                    style={[
                      atomic.l.flex, 
                      atomic.py10, 
                      atomic.alignCenter,
                      { 
                        borderRadius: 10, 
                        borderWidth: 1, 
                        borderColor: formData.audience === aud ? theme.primary : theme.border,
                        backgroundColor: formData.audience === aud ? theme.primary : 'transparent'
                      }
                    ]}
                    onPress={() => setFormData({...formData, audience: aud})}
                  >
                    <Text style={[
                      atomic.t.tiny, 
                      atomic.t.heavy, 
                      { color: formData.audience === aud ? '#fff' : theme.textSecondary }
                    ]}>{aud.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formData.audience === 'barangay' && (
                <View style={atomic.mb24}>
                  <Text style={[atomic.t.caption, atomic.t.bold, atomic.mb12, { color: theme.text }]}>Target Sector (e.g. Sumbrero Bato)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {barangays.map((b) => (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setFormData({...formData, brgy_name: b})}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: formData.brgy_name === b ? 'rgba(245,178,53,0.2)' : 'rgba(255,255,255,0.05)',
                          borderWidth: 1,
                          borderColor: formData.brgy_name === b ? '#F5B235' : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: formData.brgy_name === b ? '#F5B235' : 'rgba(255,255,255,0.4)' }}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity 
                style={[
                  atomic.py14, 
                  atomic.alignCenter, 
                  { 
                    backgroundColor: theme.primary, 
                    borderRadius: 14,
                    opacity: saving ? 0.7 : 1
                  }
                ]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[atomic.t.body, atomic.t.bold, { color: '#fff' }]}>
                    {isEditing ? 'Update Post' : 'Broadcast Now'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Card>
        </View>
      </View>
    </Modal>
  );
};
