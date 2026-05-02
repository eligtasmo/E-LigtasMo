import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';

const EmergencyHotlineModal = ({ visible, onClose }) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('resident');

  useEffect(() => {
    if (visible) {
        fetchContacts();
        fetchUserRole();
    }
  }, [visible]);

  const fetchUserRole = async () => {
      try {
          const session = await AsyncStorage.getItem('CURRENT_USER');
          if (session) {
              const user = JSON.parse(session);
              setUserRole(user.role || 'resident');
          }
      } catch (e) {
      }
  };

  const fetchContacts = async () => {
      setLoading(true);
      try {
          const response = await fetch(`${API_URL}/contacts-list.php`);
          const data = await response.json();
          if (Array.isArray(data)) {
              setHotlines(data);
          }
      } catch (error) {
      } finally {
          setLoading(false);
      }
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

  const handleCall = (number) => {
    let phoneNumber = '';
    if (Platform.OS === 'android') {
      phoneNumber = `tel:${number}`;
    } else {
      phoneNumber = `telprompt:${number}`;
    }
    Linking.openURL(phoneNumber);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.surface }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: '#EF4444' }]}>
                    <MaterialCommunityIcons name="phone-alert" size={24} color="#fff" />
                </View>
                <View>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Emergency Hotlines</Text>
                    <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Tap to call immediately</Text>
                </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView contentContainerStyle={styles.listContainer}>
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
            ) : hotlines.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 20 }}>No emergency contacts found.</Text>
            ) : (
                hotlines.map((item) => {
                  const icon = getIconForCategory(item.category || '');
                  const color = getColorForCategory(item.category || '');
                  const name = item.description || item.category || 'Emergency Contact';
                  
                  return (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.hotlineItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: theme.border }]}
                        onPress={() => handleCall(item.number)}
                    >
                        <View style={[styles.hotlineIcon, { backgroundColor: color + '20' }]}>
                        <MaterialCommunityIcons name={icon} size={28} color={color} />
                        </View>
                        <View style={styles.hotlineInfo}>
                        <Text style={[styles.hotlineName, { color: theme.text }]}>{name}</Text>
                        <Text style={[styles.hotlineNumber, { color: color }]}>{item.number}</Text>
                        </View>
                        <View style={[styles.callBtn, { backgroundColor: color }]}>
                            <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                  );
                })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                Only use these numbers for actual emergencies.
            </Text>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '70%',
    elevation: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0px -4px 8px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
      fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  hotlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  hotlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hotlineInfo: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hotlineNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  callBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  footer: {
      paddingTop: 16,
      borderTopWidth: 1,
      alignItems: 'center',
  },
  footerText: {
      fontSize: 12,
      textAlign: 'center',
  },
  manageButton: {
      alignSelf: 'center',
      marginTop: 10,
      padding: 8,
  },
  manageButtonText: {
      fontSize: 14,
      fontWeight: '600',
  },
});

export default EmergencyHotlineModal;
