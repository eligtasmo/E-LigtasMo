import React from 'react';
import { View, Text, Image as RNImage, ScrollView, Dimensions } from 'react-native';
import { Card, Heading } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export const EvidenceGallery = ({ uris }) => {
  const { theme, atomic } = useTheme();

  if (!uris || uris.length === 0) return null;

  return (
    <View style={atomic.mb24}>
      <Heading size="sm" style={atomic.mb12}>Evidence & Media</Heading>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ gap: 12, paddingRight: 20 }}
      >
        {uris.map((uri, idx) => (
          <Card key={idx} variant="raised" style={[atomic.p0, { overflow: 'hidden', width: width * 0.75, height: 200 }]}>
            <RNImage source={{ uri }} style={[atomic.fill, { resizeMode: 'cover' }]} />
            <View style={[atomic.abs, { bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
               <Text style={[atomic.t.tiny, atomic.t.bold, { color: '#fff' }]}>EVIDENCE PHOTO #{idx + 1}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
};
