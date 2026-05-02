import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { DS_FONT_UI, DS_FONT_INPUT } from '../DesignSystem';
import { ScrollView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const TacticalAnnouncementModal = ({ isVisible, announcement, onClose }) => {
  if (!announcement) return null;

  const isUrgent = announcement.is_urgent === 1 || announcement._source === 'alert';
  const category = announcement.category || 'general';

  const getIcon = () => {
    if (category === 'typhoon') return 'Wind';
    if (category === 'relief') return 'Boxes';
    if (category === 'incident') return 'AlertTriangle';
    return 'Bell';
  };

  const IconComponent = Lucide[getIcon()] || Lucide.Bell;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        
        <AnimatePresence>
          {isVisible && (
            <MotiView
              key="announcement-modal-content"
              from={{ opacity: 0, scale: 0.9, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateY: 20 }}
              transition={{ type: 'spring', damping: 15 }}
              style={styles.modalContainer}
            >
              <View style={[styles.card, isUrgent && styles.urgentCard]}>
                {/* Header Decoration */}
                <View style={styles.headerDecor}>
                  <View style={[styles.iconContainer, isUrgent && styles.urgentIconContainer]}>
                    <IconComponent size={32} color={isUrgent ? '#FF4444' : '#F5B235'} />
                  </View>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, isUrgent && styles.urgentBadge]}>
                      <Text style={[styles.badgeText, isUrgent && styles.urgentBadgeText]}>
                        {isUrgent ? 'URGENT ALERT' : category.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  <Text style={styles.title}>{announcement.title}</Text>
                  <Text style={styles.message}>{announcement.message}</Text>
                  
                  {announcement.external_link && (
                    <View style={styles.linkContainer}>
                      <Lucide.Link size={14} color="#3B82F6" />
                      <Text style={styles.linkText}>Source link available in details</Text>
                    </View>
                  )}
                  
                  <View style={styles.footerInfo}>
                    <Lucide.Clock size={12} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.footerText}>
                      {new Date(announcement.created_at || announcement.date).toLocaleString()}
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity 
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={[styles.closeButton, isUrgent && styles.urgentCloseButton]}
                >
                  <Text style={styles.closeButtonText}>ACKNOWLEDGE</Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
};



const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  urgentCard: {
    borderColor: 'rgba(255,68,68,0.3)',
    backgroundColor: '#1F1212',
  },
  headerDecor: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(245,178,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  urgentIconContainer: {
    backgroundColor: 'rgba(255,68,68,0.1)',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245,178,53,0.15)',
  },
  urgentBadge: {
    backgroundColor: 'rgba(255,68,68,0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F5B235',
    letterSpacing: 1,
    fontFamily: DS_FONT_UI,
  },
  urgentBadgeText: {
    color: '#FF4444',
  },
  scrollContent: {
    maxHeight: 300,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: DS_FONT_UI,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontFamily: DS_FONT_INPUT,
    marginBottom: 20,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: DS_FONT_INPUT,
    fontWeight: '500',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: DS_FONT_UI,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#F5B235',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  urgentCloseButton: {
    backgroundColor: '#FF4444',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
    fontFamily: DS_FONT_UI,
  },
});

export default TacticalAnnouncementModal;
