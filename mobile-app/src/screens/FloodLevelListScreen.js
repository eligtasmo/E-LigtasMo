import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../config';
import { Screen } from '../components/DesignSystem';

const FloodLevelListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/barangay-status.php`);
      const data = await response.json();
      if (data.status === 'success') {
        const sorted = data.data.sort((a, b) => {
          const priority = { critical: 3, warning: 2, monitor: 1, safe: 0 };
          const pA = priority[a.status_level] || 0;
          const pB = priority[b.status_level] || 0;
          if (pA !== pB) return pB - pA;
          return (b.flood_depth_cm || 0) - (a.flood_depth_cm || 0);
        });
        setBarangays(sorted);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const getStatusColor = (level) => {
    switch (level) {
      case 'critical': return theme.error;
      case 'warning': return theme.warning;
      case 'monitor': return theme.info;
      default: return theme.success;
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.row}>
        <View>
          <Text style={[styles.brgyName, { color: theme.text }]}>{item.barangay_name}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{item.message || 'No updates'}</Text>
          {item.updated_by && (
            <Text style={{ fontSize: 9, color: theme.textMuted, marginTop: 4, fontWeight: '700', textTransform: 'uppercase' }}>
              UPDATED BY: {item.updated_by}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.badge, { backgroundColor: getStatusColor(item.status_level) }]}>
                <Text style={styles.badgeText}>{item.status_level.toUpperCase()}</Text>
            </View>
            {item.flood_depth_cm > 0 && (
                <Text style={[styles.depth, { color: theme.text }]}>Depth: {item.flood_depth_cm} cm</Text>
            )}
        </View>
      </View>
    </View>
  );

  return (
    <Screen ornamentIntensity={0.85}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Barangay Flood Levels</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={barangays}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 20 }}>No data available</Text>}
        />
      )}
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brgyName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    maxWidth: 200,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  depth: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FloodLevelListScreen;
