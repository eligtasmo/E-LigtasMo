import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image as RNImage, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MotiView, AnimatePresence } from 'moti';
import * as Lucide from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Screen, TacticalCard, Row, Col, Heading, Badge, Divider,
  IconBox, Container, PrimaryButton,
  DS_FONT_UI, DS_FONT_INPUT,
  DS_TACTICAL, useResponsive
} from '../components/DesignSystem';

const AMOUNTS = [100, 250, 500, 1000, 2000];

const PAYMENT_METHODS = [
  { id: 'gcash', name: 'Gcash', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/GCash_logo.svg/512px-GCash_logo.svg.png', color: '#005CEE' },
  { id: 'paypal', name: 'Paypal', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png', color: '#003087' },
  { id: 'card', name: 'Credit/Debit Card', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png', color: '#6366F1' },
  { id: 'bank', name: 'Bank Transfer', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png', color: '#10B981' },
];

const DonationPaymentScreen = ({ navigation, route }) => {
  const { drive } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { safeTop } = useResponsive();
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDonate = async () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!finalAmount || finalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${API_URL}/submit-donation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drive_id: drive.id,
          user_id: user?.id,
          amount: finalAmount,
          payment_method: selectedMethod,
          message: message
        })
      });
      const data = await resp.json();
      if (data.success) {
        setIsSuccess(true);
      } else {
        Alert.alert('Error', data.error || 'Failed to submit donation');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Screen style={{ backgroundColor: '#080808' }}>
        <StatusBar style="light" />

        {/* Header - Simple Back */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DonationDrives')}
            style={styles.headerIcon}
          >
            <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ alignItems: 'center', width: '100%' }}
          >
            {/* Success Icon - Matches Image 3 */}
            <LinearGradient
              colors={['#F59E0B', '#F5B235']}
              style={styles.successCircle}
            >
              <Lucide.Check size={80} color="#FFF" strokeWidth={5} />
            </LinearGradient>

            <Text style={{
              color: '#F4F0E8',
              textAlign: 'center',
              marginTop: 48,
              fontSize: 28,
              fontWeight: '800',
              fontFamily: DS_FONT_UI,
              lineHeight: 38
            }}>
              Thank you for your Donation!
            </Text>

            {/* Progress Snapshot in Success Screen */}
            <View style={styles.successPill}>
              <Lucide.LayoutGrid size={18} color="rgba(255,255,255,0.4)" strokeWidth={2} />
              <Text style={{ color: '#F4F0E8', fontSize: 15, fontWeight: '700', marginLeft: 12, fontFamily: DS_FONT_UI }}>
                P{(drive.current_amount + (customAmount ? parseFloat(customAmount) : selectedAmount)).toLocaleString()} / P{drive.target_amount.toLocaleString()}
              </Text>
              <TouchableOpacity style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <Lucide.Share2 size={16} color="#FFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('DonationDrives')}
              style={{
                backgroundColor: '#F59E0B',
                width: '100%',
                height: 64,
                borderRadius: 32,
                marginTop: 40,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 20
              }}
            >
              <Text style={{ color: '#000', fontSize: 15, fontWeight: '800', letterSpacing: 1, fontFamily: DS_FONT_UI }}>See More Drives</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
        {/* Standard Tactical Header - Simplified */}
        <View style={{ paddingTop: insets.top + 16, marginBottom: 20 }}>
          <Container>
            <Row align="center" gap={14}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.headerIcon}
              >
                <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.2} />
              </TouchableOpacity>
              <Text style={{ color: '#F4F0E8', fontWeight: '800', fontSize: 16, fontFamily: DS_FONT_UI }}>Donate to This Drive</Text>
            </Row>
          </Container>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          <Container>
            {/* Mission Snapshot Card - Optimized */}
            <View style={styles.missionSnapshot}>
              <RNImage source={{ uri: drive.image_url }} style={styles.snapshotImg} />
              <Col style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ color: '#F4F0E8', fontSize: 14, fontWeight: '700', fontFamily: DS_FONT_UI }} numberOfLines={1}>{drive.title}</Text>
                <Row align="center" justify="space-between" style={{ marginTop: 2 }}>
                  <Text style={{ color: '#F5B235', fontSize: 10, fontWeight: '600', fontFamily: DS_FONT_UI }}>E-LigtasMo x Local Gov't Unit</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '500' }}>10:45</Text>
                </Row>
              </Col>
            </View>

            <Text style={styles.sectionLabel}>Choose donation amount</Text>

            <View style={styles.amountGrid}>
              {[100, 250, 500, 1000, 2000].map(amt => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                  activeOpacity={0.8}
                  style={[
                    styles.amountPill,
                    selectedAmount === amt && !customAmount && styles.amountPillActive
                  ]}
                >
                  <Row align="center" gap={8}>
                    <Lucide.Wallet size={14} color={selectedAmount === amt && !customAmount ? '#000' : 'rgba(255,255,255,0.4)'} />
                    <Text style={[
                      styles.amountText,
                      selectedAmount === amt && !customAmount && styles.amountTextActive
                    ]}>{amt}</Text>
                  </Row>
                </TouchableOpacity>
              ))}
            </View>

            {/* Donation Summary Snapshot */}
            <View style={styles.missionSnapshot}>
              <RNImage source={{ uri: drive.image_url }} style={styles.snapshotImg} />
              <Col style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Supporting Mission</Text>
                <Text style={{ color: '#F4F0E8', fontSize: 13, fontWeight: '700', marginTop: 2 }}>{drive.title}</Text>
              </Col>
            </View>

            <Text style={styles.sectionLabel}>Choose donation amount</Text>
            <View style={styles.amountGrid}>
              {AMOUNTS.map(amount => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => { setSelectedAmount(amount); setCustomAmount(''); }}
                  style={[styles.amountPill, selectedAmount === amount && styles.amountPillActive]}
                >
                  <Text style={[styles.amountText, selectedAmount === amount && styles.amountTextActive]}>₱{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={styles.sectionLabel}>Or enter custom amount</Text>
              <View style={styles.customAmountContainer}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700', marginRight: 8 }}>₱</Text>
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  keyboardType="numeric"
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={(val) => { setCustomAmount(val); setSelectedAmount(null); }}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Select payment method</Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {PAYMENT_METHODS.map(method => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => setSelectedMethod(method.id)}
                  style={[styles.methodCard, selectedMethod === method.id && { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.05)' }]}
                >
                  <RNImage source={{ uri: method.logo }} style={{ width: 32, height: 20, resizeMode: 'contain' }} />
                  <Text style={{ color: '#F4F0E8', fontSize: 13, fontWeight: '600', flex: 1, marginLeft: 12 }}>{method.name}</Text>
                  <View style={[styles.radioOuter, selectedMethod === method.id && { borderColor: '#F59E0B' }]}>
                    {selectedMethod === method.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Add message</Text>
            <TextInput
              placeholder="Sending prayers and support! From our family, stay safe Laguna!"
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={4}
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
            />
          </Container>
        </ScrollView>

        {/* Persistent Support Button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <PrimaryButton
            title={`Confirm support • ₱${selectedAmount || customAmount || 0}`}
            onPress={handleDonate}
            loading={loading}
            style={{ height: 44, borderRadius: 22, backgroundColor: '#F5B235' }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  missionSnapshot: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20
  },
  snapshotImg: {
    width: 50, height: 50, borderRadius: 12
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginBottom: 12, marginLeft: 4, fontFamily: DS_FONT_UI, letterSpacing: 0.2
  },
  amountGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12
  },
  amountPill: {
    flex: 1, minWidth: '30%', height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
  },
  amountPillActive: {
    backgroundColor: '#FFFFFF', borderColor: '#FFFFFF'
  },
  amountText: {
    color: '#FFF', fontWeight: '500', fontSize: 13, fontFamily: DS_FONT_UI
  },
  amountTextActive: {
    color: '#000'
  },
  customAmountPill: {
    height: 38, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20, maxWidth: 160
  },
  customAmountPillActive: {
    borderColor: '#F59E0B'
  },
  customInput: {
    flex: 1, marginLeft: 8, color: '#FFF', fontSize: 12, fontWeight: '400', fontFamily: DS_FONT_INPUT
  },
  methodRow: {
    height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  methodIconBox: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center'
  },
  methodName: {
    flex: 1, marginLeft: 10, color: '#F4F0E8', fontWeight: '500', fontSize: 13, fontFamily: DS_FONT_UI
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center'
  },
  radioInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B'
  },
  messageInput: {
    backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 18, padding: 14, color: '#FFF', fontSize: 13, height: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', textAlignVertical: 'top', fontWeight: '500', fontFamily: DS_FONT_INPUT
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'transparent'
  },
  successCircle: {
    width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.5, shadowRadius: 30
  },
  successPill: {
    height: 52, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: '100%', marginTop: 40
  }
});

export default DonationPaymentScreen;
