import React from 'react';
import { View, Text, TouchableOpacity, Image as RNImage, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, Row, Col, Heading } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

export const MediaEvidence = ({ mediaList, setMediaList, isEditing, existingMediaPath, apiRoot }) => {
  const { theme, atomic } = useTheme();

  const handleMedia = async (type) => {
    if (mediaList.length >= 3) {
      Alert.alert('Limit reached', 'Maximum 3 photos per report.');
      return;
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    };

    try {
      const result = type === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled) {
        const asset = result.assets[0];
        setMediaList(prev => [...prev, {
          uri: asset.uri,
          base64: asset.base64,
          mime: 'image/jpeg'
        }]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not access media.');
    }
  };

  const removeMedia = (idx) => {
    setMediaList(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <Card variant="raised" style={[atomic.p20, atomic.mb20]}>
      <Row align="center" style={atomic.mb16}>
        <MaterialCommunityIcons name="camera" size={20} color={theme.text} />
        <Heading size="sm" style={atomic.ml8}>Photos (Evidence)</Heading>
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[atomic.row, { gap: 12, paddingBottom: 16 }]}>
        {mediaList.map((m, idx) => (
          <View key={idx} style={{ position: 'relative' }}>
            <RNImage source={{ uri: m.uri }} style={{ width: 120, height: 120, borderRadius: 16 }} />
            <TouchableOpacity 
              onPress={() => removeMedia(idx)}
              style={[atomic.p4, { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10 }]}
            >
              <MaterialCommunityIcons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {mediaList.length === 0 && isEditing && existingMediaPath && (
           <View style={[atomic.alignCenter, { width: 120 }]}>
            <RNImage source={{ uri: `${apiRoot}/${existingMediaPath}` }} style={{ width: 120, height: 120, borderRadius: 16, opacity: 0.6 }} />
            <Text style={[atomic.t.tiny, atomic.mt4, { color: theme.textMuted }]}>Existing Photo</Text>
          </View>
        )}
        {mediaList.length < 3 && (
           <View style={[atomic.justifyCenter, atomic.alignCenter, { width: 120, height: 120, borderRadius: 16, backgroundColor: theme.surfaceVariant, borderStyle:'dashed', borderWidth:1, borderColor: theme.border }]}>
             <MaterialCommunityIcons name="image-plus" size={32} color={theme.textMuted} />
             <Text style={[atomic.t.tiny, atomic.mt4, { color: theme.textMuted }]}>{mediaList.length}/3 attached</Text>
           </View>
        )}
      </ScrollView>

      <Row gap={12}>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, borderWidth: 1, borderColor: theme.border }]}
          onPress={() => handleMedia('camera')}
        >
          <MaterialCommunityIcons name="camera" size={18} color={theme.text} />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: theme.text }]}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[atomic.l.flex, atomic.row, atomic.aic, atomic.justifyCenter, atomic.py12, { borderRadius: 12, backgroundColor: theme.surfaceVariant }]}
          onPress={() => handleMedia('library')}
        >
          <MaterialCommunityIcons name="image" size={18} color={theme.text} />
          <Text style={[atomic.t.caption, atomic.t.bold, atomic.ml8, { color: theme.text }]}>Gallery</Text>
        </TouchableOpacity>
      </Row>
    </Card>
  );
};
