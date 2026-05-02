import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const SocialPulsePreview = ({ post, onSeeAll }) => {
  const { theme, atomic } = useTheme();

  if (!post) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        const url = post.post_url || post.url;
        if (url) Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link"));
      }}
      style={atomic.mb20}
    >
      <Card variant="glass" style={[atomic.p16]}>
        <View style={[atomic.row, atomic.aic, atomic.mb12]}>
          <View style={[
            atomic.justifyCenter, 
            atomic.alignCenter, 
            { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
          ]}>
            <MaterialCommunityIcons name="facebook" size={20} color={theme.text} />
          </View>
          <View style={[atomic.l.flex, atomic.ml12]}>
            <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text, fontSize: 14 }]} numberOfLines={1}>
              {post.source_name || 'MDRRMO Updates'}
            </Text>
            <Text style={[atomic.t.tiny, { color: theme.textMuted, fontSize: 10, fontWeight: '700' }]}>
              {post.posted_at || 'Recently'}
            </Text>
          </View>
          <View style={{ backgroundColor: post.risk_level === 'high' ? theme.error + '15' : theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: post.risk_level === 'high' ? theme.error : theme.textMuted }}>{post.risk_level === 'high' ? 'PRIORITY' : 'SOCIAL'}</Text>
          </View>
        </View>

        <Text style={[atomic.t.body, { color: theme.text, lineHeight: 20, fontSize: 13, fontWeight: '500' }]} numberOfLines={3}>
          {post.content}
        </Text>

        <View style={[atomic.mt16, atomic.row, atomic.aic, atomic.jcb]}>
          <View style={[atomic.row, atomic.aic]}>
            <MaterialCommunityIcons name="heart-outline" size={16} color={theme.textMuted} />
            <Text style={[atomic.t.tiny, { color: theme.textMuted, marginLeft: 4 }]}>24</Text>
            <View style={{ width: 12 }} />
            <MaterialCommunityIcons name="share-variant-outline" size={16} color={theme.textMuted} />
          </View>
          <View style={[atomic.row, atomic.aic]}>
            <Text style={[atomic.t.tiny, atomic.t.bold, { color: theme.primary, marginRight: 4 }]}>READ PROTOCOL</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.primary} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};
