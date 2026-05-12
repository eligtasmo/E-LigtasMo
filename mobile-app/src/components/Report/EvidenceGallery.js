import React from 'react';
import { View, Text, Image as RNImage, ScrollView, Dimensions } from 'react-native';
import { Card, Heading } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export const EvidenceGallery = ({ uris }) => {
  const { theme, atomic } = useTheme();

  const safeUris = (uris || []).filter(u => !!u);
  if (safeUris.length === 0) return null;

  return (
    <View style={atomic.s.mb24}>
      <Heading size="sm" style={atomic.s.mb12}>Evidence & Media</Heading>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ gap: 12, paddingRight: 20 }}
      >
        {safeUris.map((uri, idx) => (
          <Card key={idx} variant="raised" style={[atomic.s.p0, { overflow: 'hidden', width: width * 0.75, height: 200 }]}>
            <RNImage source={{ uri }} style={[atomic.l.fill, { resizeMode: 'cover' }]} />
            <View style={[atomic.l.abs, { bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
               <Text style={[atomic.t.tiny, atomic.t.bold, { color: '#fff' }]}>EVIDENCE PHOTO #{idx + 1}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};
