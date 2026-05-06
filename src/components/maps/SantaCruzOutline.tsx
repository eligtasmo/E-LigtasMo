import React from 'react';
import { Source, Layer } from './MapboxMap';
import { SANTA_CRUZ_OUTLINE } from '../../constants/geo';

export const SantaCruzMapboxOutline: React.FC = () => {
  return (
    <Source id="santacruz-outline" type="geojson" data={SANTA_CRUZ_OUTLINE}>
      <Layer
        id="santacruz-fill"
        type="fill"
        paint={{
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2
        }}
      />
      <Layer
        id="santacruz-line"
        type="line"
        paint={{
          'line-color': '#3b82f6',
          'line-width': 1.5,
          'line-opacity': 0.5
        }}
      />
    </Source>
  );
};

export default SantaCruzMapboxOutline;

import { Polygon } from 'react-leaflet';
import { SANTA_CRUZ_LEAFLET_POSITIONS } from '../../constants/geo';

export const SantaCruzLeafletOutline: React.FC = () => {
  return (
    <Polygon 
      positions={SANTA_CRUZ_LEAFLET_POSITIONS}
      pathOptions={{ 
        color: '#3b82f6', 
        weight: 1.5, 
        opacity: 0.5,
        fillColor: '#3b82f6',
        fillOpacity: 0.2 
      }}
    />
  );
};
