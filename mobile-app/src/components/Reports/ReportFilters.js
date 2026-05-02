import React from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../context/ThemeContext';

export const ReportFilters = ({ 
  searchQuery, 
  setSearchQuery, 
  selectedFilter, 
  setSelectedFilter, 
  filters,
  pendingCount 
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ padding: 20, backgroundColor: 'transparent' }}>
      {/* Search Bar - Frosted Glass Container */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        backgroundColor: theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)', 
        borderRadius: 20, 
        borderWidth: 1.5, 
        borderColor: theme.glassBorder,
        height: 56,
        ...theme.shadows.xs
      }}>
        <Lucide.Search size={20} color={theme.primary} strokeWidth={2.5} />
        <TextInput 
          placeholder="Query intelligence database..."
          placeholderTextColor={theme.textMuted}
          style={{ flex: 1, marginLeft: 12, color: theme.text, fontSize: 15, fontWeight: '700' }}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Lucide.X size={18} color={theme.textMuted} strokeWidth={3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ marginTop: 20, gap: 12, paddingRight: 40 }}
      >
        {filters.map((filter) => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.8}
              onPress={() => setSelectedFilter(filter)}
            >
              <MotiView
                animate={{
                  backgroundColor: isSelected ? theme.primary : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)',
                  borderColor: isSelected ? theme.primary : theme.glassBorder,
                  scale: isSelected ? 1.05 : 1
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                }}
              >
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: '700', 
                  color: isSelected ? '#fff' : theme.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 1
                }}>
                  {filter}
                </Text>
                {filter === 'Pending' && pendingCount > 0 && (
                  <View style={{ 
                    marginLeft: 10, 
                    backgroundColor: isSelected ? '#fff' : theme.error, 
                    borderRadius: 6, 
                    paddingHorizontal: 6, 
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: isSelected ? 'transparent' : theme.error + '44'
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? theme.primary : '#fff' }}>
                      {pendingCount}
                    </Text>
                  </View>
                )}
              </MotiView>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
