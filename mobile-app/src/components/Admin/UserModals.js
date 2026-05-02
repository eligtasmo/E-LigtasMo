import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Row, Col, ValidationInput, PrimaryButton, Divider } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const UserInviteModal = ({ visible, onClose, link, onCopy }) => {
  const { theme, atomic } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.center, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={{ width: '90%' }}>
          <Card variant="raised" style={atomic.p24}>
            <Row justify="space-between" align="center" style={atomic.mb16}>
              <Text style={[atomic.t.h4, atomic.t.heavy, { color: theme.text }]}>Invite Generated</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </Row>
            
            <Text style={[atomic.t.body, atomic.mb20, { color: theme.textSecondary }]}>
              Share this unique link with the official you'd like to invite. It expires in 7 days.
            </Text>

            <View style={[atomic.p16, atomic.mb24, { backgroundColor: theme.surfaceVariant, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[atomic.t.caption, { color: theme.primary, textAlign: 'center' }]}>{link}</Text>
            </View>

            <PrimaryButton title="Copy Invite Link" icon="content-copy" onPress={onCopy} />
          </Card>
        </View>
      </View>
    </Modal>
  );
};

export const UserEditModal = ({ visible, onClose, form, setForm, onSave, saving }) => {
  const { theme, atomic } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, atomic.center, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={{ width: '90%', maxHeight: '80%' }}>
          <Card variant="raised" style={atomic.p24}>
            <Row justify="space-between" align="center" style={atomic.mb20}>
              <Text style={[atomic.t.h4, atomic.t.heavy, { color: theme.text }]}>Edit User</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </Row>

            <ScrollView showsVerticalScrollIndicator={false}>
              <ValidationInput label="FULL NAME">
                <TextInput
                  style={[atomic.t.body, atomic.t.bold, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                  value={form.full_name}
                  onChangeText={text => setForm({...form, full_name: text})}
                />
              </ValidationInput>
              
              <ValidationInput label="EMAIL" lucideIcon="Mail">
                <TextInput
                  style={[atomic.t.body, atomic.t.bold, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                  value={form.email}
                  onChangeText={text => setForm({...form, email: text})}
                  keyboardType="email-address"
                />
              </ValidationInput>

              <ValidationInput label="CONTACT NUMBER" lucideIcon="Phone">
                <TextInput
                  style={[atomic.t.body, atomic.t.bold, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                  value={form.contact_number}
                  onChangeText={text => setForm({...form, contact_number: text})}
                  keyboardType="phone-pad"
                />
              </ValidationInput>

              <Row gap={12}>
                <Col style={atomic.l.flex}>
                  <ValidationInput label="ROLE">
                    <TextInput
                      style={[atomic.t.body, atomic.t.bold, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                      value={form.role}
                      onChangeText={text => setForm({...form, role: text})}
                    />
                  </ValidationInput>
                </Col>
                <Col style={atomic.l.flex}>
                  <ValidationInput label="STATUS">
                    <TextInput
                      style={[atomic.t.body, atomic.t.bold, { color: theme.text, minHeight: 48, flex: 1, width: '100%' }]}
                      value={form.status}
                      onChangeText={text => setForm({...form, status: text})}
                    />
                  </ValidationInput>
                </Col>
              </Row>

              <PrimaryButton 
                title="Save Changes" 
                onPress={onSave} 
                loading={saving} 
                style={atomic.mt12} 
              />
            </ScrollView>
          </Card>
        </View>
      </View>
    </Modal>
  );
};
