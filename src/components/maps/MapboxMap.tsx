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

export default function MapboxMap(props: any) {
  return <Map {...props} />;
}

export { Marker, Popup, NavigationControl, FullscreenControl, Source, Layer, useMap, MapProvider };
