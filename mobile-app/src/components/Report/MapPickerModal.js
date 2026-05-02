import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Row, Heading, PrimaryButton } from '../DesignSystem';
import { useTheme } from '../../context/ThemeContext';

const generatePickerHTML = (lat, lng, isDark) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
        <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
        <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        </style>
    </head>
    <body>
    <div id="map"></div>
    <script>
        mapboxgl.accessToken = 'pk.eyJ1IjoiYmFyYW5nYXlpbmZvIiwiYSI6ImNscnVtdXl1cTBhYmkyam56dnRibXd6M2cifQ.8vYFp78V-y_T6z5V3n5A9Q';
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/${isDark ? 'dark-v11' : 'streets-v12'}',
            center: [${lng}, ${lat}],
            zoom: 16
        });

        map.on('moveend', () => {
            const center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'picked',
                lat: center.lat,
                lng: center.lng
            }));
        });
    </script>
    </body>
    </html>
  `;
};

export const MapPickerModal = ({ visible, onClose, initialCoords, selectedCoords, onCoordsChange, onSelect }) => {
  const { theme, isDark, atomic } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[atomic.fill, { backgroundColor: theme.background }]}>
        <View style={[atomic.px20, atomic.py12, { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
          <Row justify="space-between" align="center">
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={theme.text} />
            </TouchableOpacity>
            <Heading size="md">Choose Location</Heading>
            <View style={{ width: 28 }} />
          </Row>
        </View>

        <View style={[atomic.px20, atomic.py10, atomic.row, atomic.aic, { backgroundColor: theme.surfaceVariant }]}>
          <MaterialCommunityIcons name="map-marker" size={18} color={theme.primary} />
          <Text style={[atomic.t.tiny, atomic.t.bold, atomic.ml8, { color: theme.textSecondary }]}>
            {selectedCoords ? `${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}` : 'Drag map to pick'}
          </Text>
        </View>

        <View style={atomic.l.flex}>
          <WebView
            originWhitelist={['*']}
            source={{ html: generatePickerHTML(initialCoords?.lat || 14.28, initialCoords?.lng || 121.41, isDark) }}
            onMessage={(e) => {
              try {
                const data = JSON.parse(e.nativeEvent.data);
                if (data.type === 'picked') onCoordsChange({ lat: data.lat, lng: data.lng });
              } catch (err) {}
            }}
          />
          <View style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20 }} pointerEvents="none">
            <MaterialCommunityIcons name="crosshairs" size={40} color={theme.primary} />
          </View>
        </View>

        <View style={[atomic.p20, atomic.row, atomic.aic, atomic.jcb, { backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={[atomic.px20, atomic.py14, { borderRadius: 12, borderWidth: 1, borderColor: theme.border }]}
            onPress={onClose}
          >
            <Text style={[atomic.t.body, atomic.t.bold, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[atomic.px30, atomic.py14, { borderRadius: 12, backgroundColor: theme.primary, opacity: selectedCoords ? 1 : 0.6 }]}
            onPress={onSelect}
            disabled={!selectedCoords}
          >
            <Text style={[atomic.t.body, atomic.t.bold, { color: '#fff' }]}>Use This Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
