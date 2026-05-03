import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { MotiView } from 'moti';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen, Row, Col } from '../components/DesignSystem';

// Sub-components
import { UserCard } from '../components/Admin/UserCard';
import { UserInviteModal, UserEditModal } from '../components/Admin/UserModals';

const UserManagementScreen = ({ navigation, route }) => {
  const { theme, isDark, atomic } = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(route.params?.filter || 'all');
  const [actionLoading, setActionLoading] = useState(null);
  
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [viewerRole, setViewerRole] = useState('admin');
  const [viewerBrgy, setViewerBrgy] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const currentUser = session ? JSON.parse(session) : null;
      const token = currentUser?.token || null;
      setViewerRole(String(currentUser?.role || 'admin').toLowerCase());
      setViewerBrgy(currentUser?.brgy_name || '');
      const response = await fetch(`${API_URL}/list-users.php`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (user.username?.toLowerCase().includes(q) || 
         user.full_name?.toLowerCase().includes(q) || 
         user.email?.toLowerCase().includes(q) || 
         user.brgy_name?.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [users, searchQuery, statusFilter]);

  const handleUpdateStatus = async (userId, newStatus) => {
    setActionLoading(userId);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const token = session ? JSON.parse(session).token : null;
      
      const endpoint = newStatus === 'delete' ? 'admin-delete-user.php' : 'update-user-status.php';
      const body = newStatus === 'delete' ? { user_id: userId } : { user_id: userId, status: newStatus };

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', newStatus === 'delete' ? 'User deleted permanently.' : `User ${newStatus}.`);
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Action failed.');
      }
    } catch (e) {
        Alert.alert('Error', 'Network error.');
    } finally { setActionLoading(null); }
  };

  const generateInvite = async () => {
    setInviteLoading(true);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(`${API_URL}/invites-generate.php`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const webBaseUrl = API_URL.replace('/api', '');
        setGeneratedInviteLink(`${webBaseUrl}/register?invite=${data.invite_code}`);
        setInviteModalVisible(true);
      }
    } catch (e) {} finally { setInviteLoading(false); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      const token = session ? JSON.parse(session).token : null;
      const response = await fetch(`${API_URL}/admin-update-user.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if ((await response.json()).success) {
        setEditModalVisible(false);
        fetchUsers();
      }
    } catch (e) {} finally { setSaving(false); }
  };

  return (
    <Screen ornamentIntensity={0.6}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.surface }}>
        <Row justify="space-between" align="center" style={[atomic.px16, atomic.py16, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>
            {viewerRole === 'brgy' ? 'Barangay Residents' : 'User Management'}
          </Text>
          <Row gap={16}>
            <TouchableOpacity onPress={fetchUsers}><MaterialCommunityIcons name="refresh" size={24} color={theme.text} /></TouchableOpacity>
            {viewerRole !== 'brgy' && (
              <TouchableOpacity onPress={generateInvite} disabled={inviteLoading}>
                {inviteLoading ? <ActivityIndicator size="small" color={theme.primary} /> : <MaterialCommunityIcons name="link-plus" size={24} color={theme.primary} />}
              </TouchableOpacity>
            )}
          </Row>
        </Row>

        <View style={[atomic.px20, atomic.py16, { backgroundColor: theme.surface }]}>
          <View style={[atomic.row, atomic.aic, atomic.px12, atomic.mb12, { backgroundColor: theme.surfaceVariant, borderRadius: 12, height: 44, borderWidth: 1, borderColor: theme.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.textMuted} />
            <TextInput
              style={[atomic.l.flex, atomic.ml8, { color: theme.text, fontSize: 14 }]}
              placeholder={viewerRole === 'brgy' ? 'Search residents in your barangay...' : 'Search users or barangays...'}
              placeholderTextColor={theme.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {viewerRole === 'brgy' && !!viewerBrgy && (
            <View style={[atomic.px16, atomic.py8, { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: theme.surfaceVariant, marginBottom: 12 }]}>
              <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.textSecondary }]}>Barangay Filter: {viewerBrgy}</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[atomic.px16, atomic.py6, { borderRadius: 12, backgroundColor: statusFilter === f ? theme.text : theme.surfaceVariant }]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[atomic.t.tiny, atomic.t.bold, { color: statusFilter === f ? theme.background : theme.textSecondary }]}>{f.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={[atomic.fill, atomic.center]}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={[atomic.px16, atomic.pt16, atomic.pb40]}
          renderItem={({ item }) => (
            <UserCard 
              item={item} 
              actionLoading={actionLoading}
              onUpdateStatus={handleUpdateStatus}
              onEdit={(u) => { setEditForm({ ...u, user_id: u.id }); setEditModalVisible(true); }}
            />
          )}
          ListEmptyComponent={
            <View style={[atomic.p40, atomic.alignCenter]}>
              <MaterialCommunityIcons name="account-off" size={48} color={theme.textMuted} />
              <Text style={[atomic.t.body, atomic.mt12, { color: theme.textSecondary }]}>No users found</Text>
            </View>
          }
        />
      )}

      <UserInviteModal 
        visible={inviteModalVisible} 
        onClose={() => setInviteModalVisible(false)} 
        link={generatedInviteLink} 
        onCopy={() => { Clipboard.setStringAsync(generatedInviteLink); Alert.alert('Copied!'); }} 
      />

      <UserEditModal 
        visible={editModalVisible} 
        onClose={() => setEditModalVisible(false)} 
        form={editForm} 
        setForm={setEditForm} 
        onSave={saveEdit} 
        saving={saving} 
      />
    </Screen>
  );
};

export default UserManagementScreen;
