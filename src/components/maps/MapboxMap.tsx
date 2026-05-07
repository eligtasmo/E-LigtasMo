import React from "react";
import Map, {
  FullscreenControl,
  Layer,
  MapProvider,
  Marker,
  NavigationControl,
  Popup,
  Source,
  useMap,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { DEFAULT_MAP_STATE } from "../../constants/geo";

export default function MapboxMap(props: any) {
  return (
    <Map 
      {...props}
      minZoom={DEFAULT_MAP_STATE.minZoom}
      maxBounds={DEFAULT_MAP_STATE.maxBounds}
      attributionControl={false}
    />
  );
}

export { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer, useMap, MapProvider };
