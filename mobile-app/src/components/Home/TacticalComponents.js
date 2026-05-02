import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, StyleSheet } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card, Row, Col, Badge, Divider, Heading, useResponsive, DS_FONT_INPUT, DS_FONT_UI, Container } from '../DesignSystem';
import { useNavigation } from '@react-navigation/native';
import LocalAreaMapScreen from '../../screens/LocalAreaMapScreen';

export const TacticalHeader = ({ title = "Mission Control", subtitle, location = "Santa Cruz, Laguna", onBack, showBack, hideSubtitle, hideIcon }) => {
  const { theme, atomic } = useTheme();
  const navigation = useNavigation();
  const { isMobile } = useResponsive();

  const handlePress = () => {
    if (showBack) {
      if (onBack) onBack();
      else navigation.goBack();
    } else if (isMobile) {
      navigation.openDrawer?.();
    }
  };

  return (
    <Row align="center" justify="space-between" style={styles.headerRow}>
      <TouchableOpacity
        activeOpacity={isMobile ? 0.84 : 1}
        onPress={handlePress}
        style={styles.brandTouch}
      >
        <Row align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.brandIcon}>
            {showBack ? (
              <Lucide.ChevronLeft size={18} color="#F4F0E8" strokeWidth={2.4} />
            ) : (
              <Lucide.LifeBuoy size={20} color="#F6F4EF" strokeWidth={2.2} />
            )}
          </View>
          <Col style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.brandTitle}>{title}</Text>
            {!hideSubtitle && (
              <Row align="center" gap={4}>
                {!hideIcon && <Lucide.MapPin size={11} color="rgba(236,231,223,0.66)" strokeWidth={2} />}
                <Text numberOfLines={1} style={styles.brandSubtitle}>
                  {subtitle || location}
                </Text>
              </Row>
            )}
          </Col>
        </Row>
      </TouchableOpacity>

      <Row gap={10}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.85}
          style={styles.iconCircle}
        >
          <Lucide.Bell size={18} color="#F3F1EC" strokeWidth={2.1} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
          style={[styles.iconCircle, styles.profileCircle]}
        >
          <Lucide.User size={18} color="#F3F1EC" strokeWidth={2.1} />
        </TouchableOpacity>
      </Row>
    </Row>
  );
};

export const TacticalAlertCard = ({ title, message, badge = "LIVE", onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.alertCard}
    >
      <Row align="center" gap={10}>
        <View style={styles.alertIconWrap}>
          <Lucide.Activity size={16} color="#FF5A5A" strokeWidth={2.3} />
        </View>
        <Col style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.alertTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.alertMessage}>
            {message}
          </Text>
        </Col>
      </Row>

      <View style={styles.mapPreviewWrap}>
        <View style={styles.mapPreview}>
          <LocalAreaMapScreen isPreview={true} />
          <View style={styles.mapOverlay} />
          <View style={styles.mapPulse} />
          <View style={styles.mapBadge}>
            <Lucide.Radio size={12} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const TacticalWeatherCard = ({ location, temp, condition, hourly = [], onPress }) => {
  const { isMobile } = useResponsive();
  
  const content = (
    <View style={styles.weatherCard}>
      <Row justify="space-between" align="center">
        <Row align="center" gap={12} style={{ flex: 1 }}>
          <View style={styles.weatherIconWrap}>
            <Lucide.Sun size={34} color="#F6B617" strokeWidth={1.7} />
            <View style={styles.weatherCloudIcon}>
              <Lucide.Cloud size={28} color="#73B4FF" strokeWidth={1.8} />
            </View>
          </View>
          <Col style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.weatherLocation}>
              {location}
            </Text>
            <Text style={styles.weatherStatus}>{condition}</Text>
            <Text style={styles.weatherTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
          </Col>
        </Row>
        <Text style={styles.weatherTemp}>{temp}</Text>
      </Row>

      <Row justify="space-between" style={styles.forecastRow}>
        {hourly.slice(0, 5).map((item, index) => {
          const ForecastIcon = Lucide[item.icon] || Lucide.CloudSun;
          return (
            <Col key={index} align="center" gap={5} style={styles.forecastItem}>
              <ForecastIcon
                size={22}
                color={index === 0 ? '#F6B617' : index === 2 ? '#7EB5FF' : '#A8A7A3'}
                strokeWidth={1.8}
              />
              <Text style={styles.forecastTemp}>{item.temp}</Text>
              <Text style={styles.forecastTime}>{item.time}</Text>
            </Col>
          );
        })}
      </Row>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export const TacticalQuickActions = ({ actions, onAction }) => {
  const { width, isMobile } = useResponsive();
  const [isExpanded, setIsExpanded] = useState(false);

  // DYNAMIC GRID LOGIC: 4 Columns on Mobile, Scaling for Tablet
  const containerWidth = width - 32; 
  const numColumns = isMobile ? 4 : Math.max(4, Math.floor(containerWidth / 100));
  const itemWidth = (100 / numColumns) + '%';
  
  const displayActions = useMemo(() => {
    if (isExpanded) return actions;
    // On mobile, show exactly 1 row (numColumns - 1) + "See More"
    if (isMobile && actions.length > numColumns) return actions.slice(0, numColumns - 1);
    return actions;
  }, [actions, isExpanded, isMobile, numColumns]);

  const showMoreButton = isMobile && !isExpanded && actions.length > numColumns;

  return (
    <View style={styles.actionsContainer}>
      <View style={styles.actionsGrid}>
        {displayActions.map((item) => {
          const Icon = Lucide[item.icon] || Lucide.Circle;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.84}
              onPress={() => onAction(item.id)}
              style={[styles.actionItem, { width: itemWidth }]}
            >
              <View style={styles.actionCircle}>
                <Icon size={22} color="#F1EDE6" strokeWidth={2.1} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {showMoreButton && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsExpanded(true)}
            style={[styles.actionItem, { width: itemWidth }]}
          >
            <View style={styles.actionCircle}>
              <Lucide.Ellipsis size={20} color="#F1EDE6" strokeWidth={2.1} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
              See More
            </Text>
          </TouchableOpacity>
        )}

        {isExpanded && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsExpanded(false)}
            style={[styles.actionItem, { width: itemWidth }]}
          >
            <View style={styles.actionCircle}>
              <Lucide.ChevronUp size={20} color="#F1EDE6" strokeWidth={2.1} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
              See Less
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const OperationalGrid = ({ items }) => {
  return (
    <Card variant="glass" noPadding style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(13,10,8,0.88)' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((item, idx) => (
          <View key={idx} style={{ 
            width: '50%', 
            padding: 24, 
            borderRightWidth: idx % 2 === 0 ? 1 : 0, 
            borderBottomWidth: idx < items.length - 2 ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.05)' 
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(236,231,223,0.54)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{item.label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#F4F0E8', marginTop: 10 }}>{item.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};

export const MetricTable = ({ title, metrics }) => {
  return (
    <Card variant="glass" noPadding style={{ borderRadius: 24, backgroundColor: 'rgba(13,10,8,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
      <View style={{ padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(236,231,223,0.54)', letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      {metrics.map((item, idx) => (
        <View key={idx} style={{ padding: 16, borderBottomWidth: idx === metrics.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          <Row justify="space-between" align="center">
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(236,231,223,0.72)' }}>{item.label}</Text>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#F4F0E8' }}>{item.value}</Text>
          </Row>
        </View>
      ))}
    </Card>
  );
};

export const AssetStatusTable = ({ assets }) => {
  return (
    <Card variant="glass" noPadding style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(13,10,8,0.88)' }}>
      <View style={{ padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(236,231,223,0.54)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Verified Field Assets</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <Row justify="space-between">
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(236,231,223,0.42)', flex: 2 }}>UNIT ID</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(236,231,223,0.42)', flex: 2, textAlign: 'center' }}>STATUS</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(236,231,223,0.42)', flex: 1, textAlign: 'right' }}>RSSI</Text>
        </Row>
      </View>
      {assets.map((item, idx) => (
        <View key={idx} style={{ paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: idx === assets.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          <Row justify="space-between" align="center">
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(236,231,223,0.72)', flex: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{item.id}</Text>
            <View style={{ flex: 2, alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(49,127,255,0.15)', borderWidth: 1, borderColor: 'rgba(49,127,255,0.25)' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#4F92FF' }}>{item.status}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: 'rgba(236,231,223,0.54)', flex: 1, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{item.rssi}</Text>
          </Row>
        </View>
      ))}
    </Card>
  );
};

export const IncidentFeed = ({ incidents, onNewReport }) => {
  return (
    <Card variant="glass" noPadding style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(13,10,8,0.88)' }}>
      <View style={{ padding: 20, backgroundColor: '#110F0C', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF', letterSpacing: 1.5 }}>LIVE INCIDENT FEED</Text>
        <Text style={{ fontSize: 10, color: '#666', fontWeight: '600' }}>RECV: {new Date().toLocaleTimeString([], { hour12: false })}</Text>
      </View>
      {incidents.map((item, idx) => (
        <View key={idx} style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
          <Row justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: item.severity === 'CRITICAL' ? '#FF4B5F' : 'rgba(255,255,255,0.1)' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: item.severity === 'CRITICAL' ? '#FF4B5F' : 'rgba(236,231,223,0.72)' }}>{item.severity}</Text>
            </View>
            <Text style={{ fontSize: 11, color: 'rgba(236,231,223,0.54)', fontWeight: '700' }}>{item.time}</Text>
          </Row>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#F4F0E8', marginBottom: 6 }}>{item.title}</Text>
          <Text style={{ fontSize: 14, color: 'rgba(236,231,223,0.72)', lineHeight: 22 }}>{item.desc}</Text>
          <Row align="center" gap={10} style={{ marginTop: 16 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.status === 'RESOLVED' ? '#22C55E' : '#FF4B5F' }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(236,231,223,0.72)', textTransform: 'uppercase', letterSpacing: 1 }}>{item.status}</Text>
          </Row>
        </View>
      ))}
      <TouchableOpacity 
        onPress={onNewReport}
        style={{ padding: 24, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Row align="center" gap={12}>
          <Lucide.PlusCircle size={20} color="#F6B617" strokeWidth={2.5} />
          <Text style={{ color: '#F4F0E8', fontWeight: '600', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>New Report</Text>
        </Row>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  brandTouch: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F4F0E7',
    fontFamily: DS_FONT_UI,
    lineHeight: 22,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(236,231,223,0.66)',
    fontFamily: DS_FONT_INPUT,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileCircle: {
    backgroundColor: 'rgba(49,127,255,0.18)',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F7A100',
    borderWidth: 1.5,
    borderColor: '#2A1C0C',
  },
  alertCard: {
    backgroundColor: 'rgba(17,14,11,0.88)',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,82,82,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F4F1EA',
    fontFamily: DS_FONT_UI,
  },
  alertMessage: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(235,231,225,0.72)',
    fontFamily: DS_FONT_INPUT,
    marginTop: 2,
  },
  mapPreviewWrap: {
    marginTop: 12,
  },
  mapPreview: {
    height: 138,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#131313',
  },
  mapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(79, 12, 12, 0.26)',
  },
  mapPulse: {
    position: 'absolute',
    top: '38%',
    right: '17%',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,54,54,0.15)',
  },
  mapBadge: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,66,66,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', 
    width: '100%',
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 16,
  },
  actionCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    marginTop: 9,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: 'rgba(236,231,223,0.84)',
    fontWeight: '500',
    fontFamily: DS_FONT_UI,
  },
  weatherCard: {
    backgroundColor: 'rgba(13,10,8,0.88)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  weatherIconWrap: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherCloudIcon: {
    position: 'absolute',
    bottom: 1,
    right: -2,
  },
  weatherLocation: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F4F0E7',
    fontFamily: DS_FONT_UI,
  },
  weatherStatus: {
    marginTop: 1,
    fontSize: 12.5,
    fontWeight: '400',
    color: 'rgba(238,232,224,0.72)',
    fontFamily: DS_FONT_INPUT,
  },
  weatherTime: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: '500',
    color: '#F0ECE4',
    fontFamily: DS_FONT_UI,
  },
  weatherTemp: {
    fontSize: 38,
    fontWeight: '300',
    color: '#F6F3EB',
    fontFamily: DS_FONT_UI,
  },
  forecastRow: {
    marginTop: 18,
  },
  forecastItem: {
    flex: 1,
  },
  forecastTemp: {
    fontSize: 11.5,
    color: '#F4F0E8',
    fontWeight: '500',
    fontFamily: DS_FONT_UI,
  },
  forecastTime: {
    fontSize: 10,
    color: 'rgba(236,231,223,0.54)',
    fontWeight: '400',
    fontFamily: DS_FONT_INPUT,
  },
});
