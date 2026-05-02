import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, FlatList, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { API_URL } from '../config';

const ManageContactsScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Create/Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    number: '',
    description: '',
    priority: 'Normal'
  });

  useEffect(() => {
    checkUserRole();
    fetchContacts();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const checkUserRole = async () => {
    try {
      const session = await AsyncStorage.getItem('CURRENT_USER');
      if (session) {
        const user = JSON.parse(session);
        setUserRole(user.role);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const fetchContacts = async () => {
    try {
        const response = await fetch(`${API_URL}/contacts-list.php`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            setContacts(data);
        } else {
            console.warn('Failed to fetch contacts');
        }
    } catch (error) {
        console.error('Error fetching contacts:', error);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts();
  }, []);

  const handleCreateContact = async () => {
    if (!formData.category || !formData.number) {
        Alert.alert('Error', 'Category and Number are required');
        return;
    }

    setSaving(true);
    try {
        const session = await AsyncStorage.getItem('CURRENT_USER');
        let token = null;
        let username = null;
        if (session) {
            const user = JSON.parse(session);
            token = user.token;
            username = user.username;
        }

        const payload = {
            ...formData,
            created_by: username
        };

        const response = await fetch(`${API_URL}/contacts-add.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.id) {
            Alert.alert('Success', 'Contact added successfully');
            setModalVisible(false);
            setFormData({ category: '', number: '', description: '', priority: 'Normal' });
            fetchContacts();
        } else {
            Alert.alert('Error', result.error || 'Failed to add contact');
        }
    } catch (error) {
        Alert.alert('Error', 'Network error');
        console.error(error);
    } finally {
        setSaving(false);
    }
  };

  const handleDeleteContact = async (id) => {
      Alert.alert(
          'Confirm Delete',
          'Are you sure you want to delete this contact?',
          [
              { text: 'Cancel', style: 'cancel' },
              {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                      try {
                          const session = await AsyncStorage.getItem('CURRENT_USER');
                          let token = null;
                          if (session) {
                              const user = JSON.parse(session);
                              token = user.token;
                          }

                          const response = await fetch(`${API_URL}/contacts-delete.php`, {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': token ? `Bearer ${token}` : ''
                              },
                              body: JSON.stringify({ id })
                          });

                          const result = await response.json();
                          if (result.success) {
                              fetchContacts();
                          } else {
                              Alert.alert('Error', result.error || 'Failed to delete contact');
                          }
                      } catch (error) {
                          Alert.alert('Error', 'Network error');
                      }
                  }
              }
          ]
      );
  };

  const getIconForCategory = (category) => {
      const cat = category.toLowerCase();
      if (cat.includes('fire')) return 'fire-truck';
      if (cat.includes('police')) return 'police-badge';
      if (cat.includes('medical') || cat.includes('health') || cat.includes('cross')) return 'ambulance';
      if (cat.includes('rescue') || cat.includes('drrmo')) return 'shield-account';
      if (cat.includes('coast') || cat.includes('water')) return 'ferry';
      return 'phone';
  };

  const getColorForCategory = (category) => {
      const cat = category.toLowerCase();
      if (cat.includes('fire')) return '#F97316'; // Orange
      if (cat.includes('police')) return '#10B981'; // Green
      if (cat.includes('medical') || cat.includes('health')) return '#EC4899'; // Pink
      if (cat.includes('rescue') || cat.includes('drrmo')) return '#3B82F6'; // Blue
      if (cat.includes('emergency') || cat.includes('911')) return '#EF4444'; // Red
      return '#6B7280'; // Gray
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: getColorForCategory(item.category) + '20' }]}>
            <MaterialCommunityIcons name={getIconForCategory(item.category)} size={24} color={getColorForCategory(item.category)} />
        </View>
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.category}</Text>
            <Text style={styles.cardNumber}>{item.number}</Text>
            {item.description ? (
                <Text style={styles.cardDesc}>{item.description}</Text>
            ) : null}
        </View>
        <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteContact(item.id)}
        >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color={theme.error} />
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Contacts</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {loading ? (
             <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
             </View>
        ) : (
            <FlatList
                data={contacts}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="contacts" size={48} color={theme.textSecondary} />
                        <Text style={styles.emptyText}>No contacts added yet</Text>
                    </View>
                }
            />
        )}
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Contact</Text>
                
                <Text style={styles.label}>Category Name</Text>
                <TextInput
                    style={styles.input}
                    value={formData.category}
                    onChangeText={(text) => setFormData({...formData, category: text})}
                    placeholder="e.g. Fire Station"
                    placeholderTextColor={theme.placeholder}
                />

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                    style={styles.input}
                    value={formData.number}
                    onChangeText={(text) => setFormData({...formData, number: text})}
                    placeholder="e.g. 09123456789"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={formData.description}
                    onChangeText={(text) => setFormData({...formData, description: text})}
                    placeholder="e.g. Local station hotline"
                    placeholderTextColor={theme.placeholder}
                />

                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setModalVisible(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleCreateContact}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Add</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.background,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.headerText,
  },
  listContent: {
      padding: 24,
      paddingBottom: 100,
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
  },
  emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  deleteButton: {
      padding: 8,
  },
  fab: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
  },
  modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 20,
      textAlign: 'center',
  },
  label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      marginTop: 12,
  },
  input: {
      backgroundColor: theme.mode === 'dark' ? theme.background : '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
  },
  modalButtons: {
      flexDirection: 'row',
      marginTop: 24,
      gap: 12,
  },
  modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
  },
  cancelButton: {
      backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
  },
  saveButton: {
      backgroundColor: theme.primary,
  },
  cancelButtonText: {
      color: theme.text,
      fontWeight: '600',
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },
});

export default ManageContactsScreen;
