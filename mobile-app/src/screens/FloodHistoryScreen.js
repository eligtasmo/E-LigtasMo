import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import { Screen } from '../components/DesignSystem';

const { width } = Dimensions.get('window');

const FloodHistoryScreen = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  
  const periods = ['2024', '2023', '2022'];

  const monthlyData = [
    { month: 'Jan', level: 20 },
    { month: 'Feb', level: 10 },
    { month: 'Mar', level: 0 },
    { month: 'Apr', level: 0 },
    { month: 'May', level: 15 },
    { month: 'Jun', level: 40 },
    { month: 'Jul', level: 80 },
    { month: 'Aug', level: 90 },
    { month: 'Sep', level: 60 },
    { month: 'Oct', level: 50 },
    { month: 'Nov', level: 30 },
    { month: 'Dec', level: 10 },
  ];

  const historyEvents = [
    {
      id: 1,
      event: 'Typhoon Kristine',
      date: 'Oct 24, 2024',
      level: 'Waist Deep',
      color: '#D32F2F', // Critical
      duration: '3 Days',
    },
    {
      id: 2,
      event: 'Monsoon Rains',
      date: 'Aug 15, 2024',
      level: 'Knee Deep',
      color: '#F57C00', // Warning
      duration: '1 Day',
    },
    {
      id: 3,
      event: 'Typhoon Carina',
      date: 'Jul 25, 2024',
      level: 'Ankle Deep',
      color: '#FFB74D', // Alert
      duration: '12 Hours',
    },
  ];

  const maxLevel = 100; // For chart scaling

  return (
    <Screen ornamentIntensity={0.85}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Flood History & Trends</Text>
          <TouchableOpacity>
            <MaterialCommunityIcons name="download-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Barangay Title */}
        <View style={styles.locationHeader}>
          <MaterialCommunityIcons name="map-marker" size={20} color={theme.primary} />
          <Text style={styles.locationText}>Brgy. Poblacion, Santa Cruz</Text>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Major Floods</Text>
            <Text style={styles.statSub}>This Year</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>High</Text>
            <Text style={styles.statLabel}>Risk Level</Text>
            <Text style={styles.statSub}>Zone A</Text>
          </View>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flood Frequency (2024)</Text>
            <View style={styles.periodSelector}>
              {periods.map(p => (
                <TouchableOpacity 
                  key={p} 
                  onPress={() => setSelectedPeriod(p)}
                  style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
                >
                  <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartContainer}>
            {monthlyData.map((data, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: `${(data.level / maxLevel) * 100}%`,
                        backgroundColor: data.level > 50 ? '#D32F2F' : data.level > 20 ? '#F57C00' : '#81C784'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.monthText}>{data.month.charAt(0)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartLegend}>Monthly Flood Severity Levels</Text>
        </View>

        {/* Historical Timeline */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Past Major Events</Text>
          
          <View style={styles.timeline}>
            {historyEvents.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.eventDate}>{event.date}</Text>
                  <Text style={styles.eventDuration}>{event.duration}</Text>
                </View>
                
                <View style={styles.timelineLineContainer}>
                  <View style={[styles.timelineDot, { backgroundColor: event.color }]} />
                  {index !== historyEvents.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineContent}>
                  <Text style={styles.eventTitle}>{event.event}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: event.color + '20' }]}>
                    <Text style={[styles.severityText, { color: event.color }]}>{event.level}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
      </SafeAreaView>
    </Screen>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  scrollContent: {
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  statSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  chartSection: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.mode === 'dark' ? theme.background : '#F5F5F5',
    borderRadius: 8,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: theme.surface,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  periodTextActive: {
    color: theme.text,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  barContainer: {
    alignItems: 'center',
    width: (width - 64) / 12,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    width: 8,
    backgroundColor: theme.mode === 'dark' ? theme.background : '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  monthText: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 8,
  },
  chartLegend: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  historySection: {
    marginBottom: 20,
  },
  timeline: {
    marginTop: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 80,
  },
  timelineLeft: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 0,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'right',
  },
  eventDuration: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  timelineLineContainer: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.border,
    marginTop: -2,
    marginBottom: -2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
    marginTop: -4,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default FloodHistoryScreen;
