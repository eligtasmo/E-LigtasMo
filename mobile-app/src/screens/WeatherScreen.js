import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  StyleSheet, 
  Platform, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Lucide from 'lucide-react-native';
import { MotiView } from 'moti';

import { fetchWeatherForecast, getWeatherDescription } from '../services/WeatherService';
import { useNavigation } from '@react-navigation/native';
import { Screen, Row, Container, DS_FONT_UI, DS_FONT_INPUT } from '../components/DesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WeatherScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // SANTA CRUZ, LAGUNA
  const LAT = 14.2833;
  const LONG = 121.4167;

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      const data = await fetchWeatherForecast(LAT, LONG);
      if (data) setWeather(data);
    } catch (error) {
      console.error('Weather load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWeather();
  };

  if (loading && !weather) {
    return (
      <Screen style={{ backgroundColor: '#080808', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#F5B235" size="large" />
      </Screen>
    );
  }

  const current = weather?.current;
  const daily = weather?.daily;

  const renderTacticalMetric = (label, value, icon: Icon, subValue) => (
    <View style={styles.metricCard}>
        <Row align="center" gap={8} style={{ marginBottom: 12 }}>
            <View style={styles.metricIconBox}>
                <Icon size={14} color="#F5B235" strokeWidth={2} />
            </View>
            <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
        </Row>
        <Text style={styles.metricValue}>{value}</Text>
        {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
    </View>
  );

  return (
    <Screen withOrnament={false} style={{ backgroundColor: '#080808' }}>
      <StatusBar style="light" />
      
      {/* TACTICAL HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Row align="center" justify="space-between">
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Lucide.ChevronLeft size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
                <Text style={styles.headerSubtitle}>WEATHER COMMAND</Text>
                <Text style={styles.headerTitle}>Santa Cruz, Laguna</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
                <Lucide.RotateCw size={18} color="#FFF" />
            </TouchableOpacity>
        </Row>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5B235" />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <Container>
            {/* HERO SECTION */}
            <MotiView 
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.heroContainer}
            >
                <Text style={styles.heroCondition}>{getWeatherDescription(current?.weather_code).toUpperCase()}</Text>
                <Text style={styles.heroTemp}>{Math.round(current?.temperature_2m)}°</Text>
                <Row gap={15}>
                    <Text style={styles.heroRange}>H: {Math.round(daily?.temperature_2m_max[0])}°</Text>
                    <Text style={styles.heroRange}>L: {Math.round(daily?.temperature_2m_min[0])}°</Text>
                </Row>
                <View style={styles.heroBadge}>
                    <Lucide.ShieldCheck size={12} color="#F5B235" />
                    <Text style={styles.heroBadgeText}>LIVE SATELLITE DATA</Text>
                </View>
            </MotiView>

            {/* LIVE FORCAST MAP (WINDY INTEGRATION) */}
            <View style={styles.sectionContainer}>
                <Row align="center" gap={8} style={{ marginBottom: 15 }}>
                    <Lucide.Radar size={16} color="#F5B235" />
                    <Text style={styles.sectionHeading}>LIVE RADAR INTEL</Text>
                </Row>
                <View style={styles.mapContainer}>
                    <WebView 
                        source={{ uri: 'https://www.windy.com/14.2833/121.4167?13.684,121.417,7' }}
                        style={{ flex: 1, backgroundColor: '#000' }}
                        scrollEnabled={false}
                    />
                    <View style={styles.mapOverlay}>
                        <TouchableOpacity style={styles.mapExpandBtn}>
                            <Lucide.Maximize2 size={14} color="#FFF" />
                            <Text style={styles.mapExpandText}>EXPAND RADAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* HOURLY TIMELINE */}
            <View style={styles.sectionContainer}>
                <Row align="center" gap={8} style={{ marginBottom: 15 }}>
                    <Lucide.Clock size={16} color="#F5B235" />
                    <Text style={styles.sectionHeading}>MISSION TIMELINE (24H)</Text>
                </Row>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
                    {weather?.hourly.time.slice(0, 24).map((time, i) => {
                        const hourNum = new Date(time).getHours();
                        const isNow = i === 0;
                        return (
                            <View key={i} style={[styles.hourlyItem, isNow && styles.hourlyItemActive]}>
                                <Text style={styles.hourLabel}>{isNow ? 'NOW' : (hourNum % 12 || 12) + (hourNum >= 12 ? 'PM' : 'AM')}</Text>
                                <Lucide.Cloud size={20} color={isNow ? "#000" : "#F5B235"} style={{ marginVertical: 8 }} />
                                <Text style={[styles.hourTemp, isNow && { color: '#000' }]}>{Math.round(weather.hourly.temperature_2m[i])}°</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ATMOSPHERIC INTEL GRID */}
            <View style={styles.metricsGrid}>
                {renderTacticalMetric('UV Index', current?.uv_index || 0, Lucide.Sun, (current?.uv_index || 0) > 5 ? 'High Risk' : 'Low Risk')}
                {renderTacticalMetric('Feels Like', `${Math.round(current?.apparent_temperature)}°`, Lucide.Thermometer, 'Humidity Adjusted')}
                {renderTacticalMetric('Wind Speed', `${Math.round(current?.wind_speed_10m)} km/h`, Lucide.Wind, 'North East')}
                {renderTacticalMetric('Humidity', `${current?.relative_humidity_2m}%`, Lucide.Droplets, 'Surface Level')}
                {renderTacticalMetric('Visibility', '10 km', Lucide.Eye, 'Clear Skies')}
                {renderTacticalMetric('Air Pressure', '1012 hPa', Lucide.Activity, 'Stable')}
            </View>

            {/* 7-DAY FORECAST */}
            <View style={[styles.sectionContainer, { marginTop: 10 }]}>
                <Row align="center" gap={8} style={{ marginBottom: 15 }}>
                    <Lucide.Calendar size={16} color="#F5B235" />
                    <Text style={styles.sectionHeading}>7-DAY MISSION OUTLOOK</Text>
                </Row>
                <View style={styles.forecastList}>
                    {daily?.time.slice(0, 7).map((time, index) => (
                        <View key={index} style={styles.forecastRow}>
                            <Text style={styles.forecastDay}>{index === 0 ? 'TODAY' : new Date(time).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()}</Text>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Lucide.Cloud size={18} color="#F5B235" />
                            </View>
                            <Row align="center" gap={12} style={{ width: 100, justifyContent: 'flex-end' }}>
                                <Text style={styles.forecastTempMin}>{Math.round(daily.temperature_2m_min[index])}°</Text>
                                <View style={styles.forecastBar}>
                                    <View style={[styles.forecastBarFill, { width: '60%', left: '20%' }]} />
                                </View>
                                <Text style={styles.forecastTempMax}>{Math.round(daily.temperature_2m_max[index])}°</Text>
                            </Row>
                        </View>
                    ))}
                </View>
            </View>
        </Container>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#080808',
        borderBottomWidth: 1,
        borderColor: '#1A1A1A',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#121212',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        fontFamily: DS_FONT_UI,
    },
    headerSubtitle: {
        fontSize: 9,
        fontWeight: '800',
        color: '#F5B235',
        letterSpacing: 2,
        marginBottom: 2,
        fontFamily: DS_FONT_UI,
    },
    heroContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    heroCondition: {
        fontSize: 12,
        fontWeight: '800',
        color: '#F5B235',
        letterSpacing: 4,
        marginBottom: 10,
        fontFamily: DS_FONT_UI,
    },
    heroTemp: {
        fontSize: 96,
        fontWeight: '200',
        color: '#FFF',
        fontFamily: DS_FONT_UI,
        includeFontPadding: false,
    },
    heroRange: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: DS_FONT_UI,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(245,178,53,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 25,
        borderWidth: 1,
        borderColor: 'rgba(245,178,53,0.2)',
    },
    heroBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#F5B235',
        letterSpacing: 1,
        fontFamily: DS_FONT_UI,
    },
    sectionContainer: {
        backgroundColor: '#121212',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    sectionHeading: {
        fontSize: 11,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1.5,
        fontFamily: DS_FONT_UI,
    },
    mapContainer: {
        height: 240,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
    },
    mapExpandBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    mapExpandText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    hourlyScroll: {
        marginHorizontal: -5,
    },
    hourlyItem: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginHorizontal: 5,
        backgroundColor: '#181818',
        borderWidth: 1,
        borderColor: '#222',
        minWidth: 70,
    },
    hourlyItemActive: {
        backgroundColor: '#F5B235',
        borderColor: '#F5B235',
    },
    hourLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: DS_FONT_UI,
    },
    hourTemp: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        fontFamily: DS_FONT_UI,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#121212',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1E1E1E',
    },
    metricIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(245,178,53,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
        fontFamily: DS_FONT_UI,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        fontFamily: DS_FONT_UI,
    },
    metricSubValue: {
        fontSize: 11,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.3)',
        marginTop: 4,
        fontFamily: DS_FONT_INPUT,
    },
    forecastList: {
        gap: 4,
    },
    forecastRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    forecastDay: {
        width: 60,
        fontSize: 13,
        fontWeight: '700',
        color: '#FFF',
        fontFamily: DS_FONT_UI,
    },
    forecastTempMin: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.3)',
        width: 30,
        textAlign: 'right',
    },
    forecastTempMax: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        width: 30,
        textAlign: 'right',
    },
    forecastBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        marginHorizontal: 10,
        overflow: 'hidden',
    },
    forecastBarFill: {
        position: 'absolute',
        height: '100%',
        backgroundColor: '#F5B235',
        borderRadius: 2,
    }
});

export default WeatherScreen;
