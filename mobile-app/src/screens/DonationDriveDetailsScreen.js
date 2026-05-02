import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image as RNImage, TouchableOpacity, ActivityIndicator, Share, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import * as Lucide from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { API_URL, MAPBOX_ACCESS_TOKEN } from '../config';
import {
  Screen, Card, Row, Col, Heading, Badge, Divider,
  IconBox, Container, PrimaryButton, useResponsive,
  DS_FONT_UI, DS_FONT_INPUT
} from '../components/DesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DonationDriveDetailsScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [drive, setDrive] = useState(null);
  const [activeTab, setActiveTab] = useState('About');

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/get-donation-drive.php?id=${id}`);
      const data = await resp.json();
      if (data.success) {
        setDrive(data.drive);
      }
    } catch (e) {
      console.error('Fetch Details Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleShare = async () => {
    if (!drive) return;
    try {
      await Share.share({
        message: `Help us support: ${drive.title}. Target: P${Number(drive.target_amount).toLocaleString()}. Join the drive at E-LigtasMo!`,
      });
    } catch (e) { }
  };

  if (loading || !drive) {
    return (
      <Screen style={{ backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#F5B235" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 16, fontWeight: '600', fontFamily: DS_FONT_UI }}>INITIALIZING MISSION DATA...</Text>
      </Screen>
    );
  }

  const percentage = Math.min(100, drive.percentage || 0);

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />

      {/* Standard Tactical Header - Simplified */}
      <View style={{ paddingTop: insets.top + 16, marginBottom: 24 }}>
        <Container>
          <Row justify="space-between" align="center">
            <Row align="center" gap={14}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.headerIcon}
              >
                <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.2} />
              </TouchableOpacity>
              <Text style={{ color: '#F4F0E8', fontWeight: '700', fontSize: 16, fontFamily: DS_FONT_UI }}>Drive Details</Text>
            </Row>

            <Row gap={10}>
              <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
                <Lucide.Share2 size={18} color="#F4F0E8" strokeWidth={2.2} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon}>
                <Lucide.Bookmark size={18} color="#F4F0E8" strokeWidth={2.2} />
              </TouchableOpacity>
            </Row>
          </Row>
        </Container>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <Container>
          {/* Mission Image Card with Blur Donate Button */}
          <View style={{ height: 240, width: '100%', borderRadius: 22, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
            <RNImage
              source={{ uri: drive.image_url || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=2070&auto=format&fit=crop' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <View style={{ position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16 }}>
              <BlurView intensity={25} tint="dark" style={{ width: '100%', height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('DonationPayment', { drive })}
                  activeOpacity={0.8}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Lucide.HeartPulse size={14} color="#FFF" strokeWidth={2.2} />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11, letterSpacing: 0.5, fontFamily: DS_FONT_UI }}>Support This Mission</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          </View>

          {/* Mission Info Row - Compact and Balanced */}
          <Row align="center" gap={10} style={{ marginBottom: 16 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Lucide.Heart size={18} color="#000" fill="#000" />
            </View>
            <Col style={{ flex: 1 }}>
              <Row justify="space-between" align="center">
                <Text style={{ color: '#F4F0E8', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 }}>{drive.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '500' }}>10:45</Text>
              </Row>
              <Row justify="space-between" align="center" style={{ marginTop: 2 }}>
                <Text style={{ color: '#F5B235', fontSize: 10, fontWeight: '600', fontFamily: DS_FONT_UI }}>E-LigtasMo x Local Gov't Unit</Text>
                <Text style={{ color: '#F5B235', fontSize: 9, fontWeight: '700' }}>Urgent</Text>
              </Row>
            </Col>
          </Row>

          {/* Progress Pill - Industrial Obsidian */}
          <View style={{
            backgroundColor: 'rgba(26,22,18,0.95)',
            height: 48,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            marginBottom: 16
          }}>
            <Row align="center" style={{ flex: 1 }}>
              <Lucide.Wallet size={16} color="rgba(255,255,255,0.4)" strokeWidth={2} />
              <Text style={{ color: '#F4F0E8', fontSize: 13, fontWeight: '700', marginLeft: 10, fontFamily: DS_FONT_UI }}>
                ₱{(drive.current_amount || 0).toLocaleString()} / ₱{(drive.target_amount || 0).toLocaleString()}
              </Text>
            </Row>
            <View style={{ width: 1, height: 18, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 }} />
            <Text style={{ color: '#F5B235', fontWeight: '800', fontSize: 12, fontFamily: DS_FONT_UI }}>{Math.round(percentage)}%</Text>
          </View>

          {/* Metadata Cards - Side by Side */}
          <Row gap={12} style={{ marginBottom: 16 }}>
            <Col style={{ flex: 1, height: 100, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <Row align="center" gap={8}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' }}>
                  <Lucide.MapPin size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '600', fontFamily: DS_FONT_UI }}>Location</Text>
              </Row>
              <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 2 }}>
                <Text numberOfLines={2} style={{ color: '#F4F0E8', fontSize: 12, fontWeight: '600', lineHeight: 16, fontFamily: DS_FONT_UI }}>{drive.location || 'Marikina City, NCR Region'}</Text>
              </View>
            </Col>
            <Col style={{ flex: 1, height: 100, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
              <Row align="center" gap={8}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' }}>
                  <Lucide.Navigation size={12} color="rgba(255,255,255,0.3)" strokeWidth={2} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, fontWeight: '600', fontFamily: DS_FONT_UI }}>Distance</Text>
              </Row>
              <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 2 }}>
                <Text numberOfLines={2} style={{ color: '#F4F0E8', fontSize: 12, fontWeight: '600', lineHeight: 16, fontFamily: DS_FONT_UI }}>15km from your location</Text>
              </View>
            </Col>
          </Row>

          {/* Map Section */}
          <View style={{ height: 160, borderRadius: 22, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <RNImage
              source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/121.1,14.2,12,0/600x300?access_token=${MAPBOX_ACCESS_TOKEN}` }}
              style={{ width: '100%', height: '100%' }}
            />
            <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -12 }}>
              <Lucide.MapPin size={24} color="#F59E0B" fill="#F59E0B" />
            </View>
          </View>

          {/* Bottom Tabs Control - Restored Segmented Style */}
          <View style={{
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            padding: 4,
            flexDirection: 'row',
            marginBottom: 20
          }}>
            {['About', 'How to help'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.9}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: activeTab === tab ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{
                  color: activeTab === tab ? '#000' : 'rgba(255,255,255,0.4)',
                  fontWeight: '700',
                  fontSize: 12,
                  fontFamily: DS_FONT_UI
                }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Tab Content */}
          <MotiView
            key={activeTab}
            from={{ opacity: 0, translateY: 5 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, fontFamily: DS_FONT_INPUT }}>
              {activeTab === 'About' ? (drive.description || 'Join our tactical relief operation to provide essential support to affected communities. We are prioritizing food stability, clean water, and medical assistance.') : 'You can contribute via the "Donate Now" button above, or volunteer at your local sector hub. Every bit of support strengthens our community resilience.'}
            </Text>
          </MotiView>
        </Container>
      </ScrollView>

      {/* Persistent Bottom Action Bar */}
      <View style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: 24,
        paddingBottom: insets.bottom + 16,
        backgroundColor: 'transparent'
      }}>
        <PrimaryButton
          title="Support this mission"
          onPress={() => navigation.navigate('DonationPayment', { drive })}
          style={{ backgroundColor: '#F5B235', height: 44, borderRadius: 22 }}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  }
});

export default DonationDriveDetailsScreen;
