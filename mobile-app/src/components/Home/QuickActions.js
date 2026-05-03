import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Lucide from 'lucide-react-native';
import { Card, Row, Col } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';
import { MotiView } from 'moti';

export const QuickActions = ({ onAction }) => {
  const { theme, atomic } = useTheme();

  const actions = [
    { id: 'ReportIncident', label: 'Tactical Report', icon: 'ShieldAlert', color: theme.error, subtitle: 'FIELD INTEL', span: 2 },
    { id: 'Map', label: 'Field Map', icon: 'Map', color: theme.primary, subtitle: 'LIVE SCAN' },
    { id: 'Weather', label: 'Weather', icon: 'CloudRain', color: theme.primary, subtitle: 'ATMOSPHERIC' },
    { id: 'Announcements', label: 'Intelligence', icon: 'Radio', color: theme.primary, subtitle: 'BROADCASTS' },
    { id: 'RoutePlanner', label: 'Route Planner', icon: 'Route', color: theme.primary, subtitle: 'LOGISTICS' },
  ];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
      {actions.map((action, index) => {
        const IconComponent = Lucide[action.icon] || Lucide.HelpCircle;
        const isSpanning = action.span === 2;
        
        return (
          <TouchableOpacity 
            key={action.id} 
            style={{ width: isSpanning ? '100%' : '50%', padding: 8 }} 
            onPress={() => onAction(action.id)}
            activeOpacity={0.8}
          >
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', delay: index * 50 }}
            >
              <Card 
                variant={isSpanning ? 'elevated' : 'flat'} 
                style={{ 
                  padding: 16, 
                  height: isSpanning ? 84 : 124,
                  backgroundColor: isSpanning ? theme.primary : theme.surface,
                  borderColor: isSpanning ? theme.primary : theme.border,
                  borderWidth: 1.5,
                  borderRadius: 24,
                  justifyContent: 'space-between',
                  flexDirection: isSpanning ? 'row' : 'column',
                  alignItems: isSpanning ? 'center' : 'flex-start',
                }}
              >
                <View style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 14, 
                  backgroundColor: isSpanning ? 'rgba(255,255,255,0.15)' : theme.primary + '08', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isSpanning ? 'rgba(255,255,255,0.2)' : theme.primary + '10'
                }}>
                  <IconComponent size={22} color={isSpanning ? '#fff' : theme.primary} strokeWidth={2.5} />
                </View>
                
                <View style={[!isSpanning && { marginTop: 12 }, isSpanning && { flex: 1, marginLeft: 16 }]}>
                  <Text style={{ 
                    fontSize: isSpanning ? 16 : 14, 
                    fontWeight: '700', 
                    color: isSpanning ? '#fff' : theme.text, 
                    letterSpacing: -0.2 
                  }}>
                    {action.label}
                  </Text>
                  <Text style={{ 
                    fontSize: 9, 
                    fontWeight: '600', 
                    color: isSpanning ? 'rgba(255,255,255,0.7)' : theme.textMuted, 
                    marginTop: 2, 
                    textTransform: 'uppercase', 
                    letterSpacing: 1.5 
                  }}>
                    {action.subtitle}
                  </Text>
                </View>

                {isSpanning ? (
                   <Lucide.ChevronRight size={18} color="#fff" opacity={0.6} strokeWidth={3} />
                ) : (
                   <View style={{ position: 'absolute', top: 16, right: 16 }}>
                      <Lucide.ArrowUpRight size={14} color={theme.textMuted} opacity={0.3} strokeWidth={3} />
                   </View>
                )}
              </Card>
            </MotiView>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
