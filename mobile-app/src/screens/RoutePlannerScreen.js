import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, FlatList, Keyboard, Alert, TouchableOpacity, useWindowDimensions, StyleSheet, Share, Platform } from 'react-native';
import * as Lucide from 'lucide-react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MotiView, AnimatePresence } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '../context/ThemeContext';
import { AuthService } from '../services/AuthService';
import { API_URL, API_ROOT, MAPBOX_ACCESS_TOKEN } from '../config';
import {
  Screen, Card, Row, Col, Heading, Badge, Divider,
  IconBox, Container, PrimaryButton, useResponsive,
  DS_FONT_UI, DS_FONT_INPUT
} from '../components/DesignSystem';
import UniversalWebView from '../components/UniversalWebView';
// Sub-components
import { SearchHeader } from '../components/RoutePlanner/SearchHeader';
import { RouteOptionsSheet } from '../components/RoutePlanner/RouteOptionsSheet';
import { NavigationOverlay } from '../components/RoutePlanner/NavigationOverlay';

const toRad = (value) => (value * Math.PI) / 180;
const toDeg = (value) => (value * 180) / Math.PI;

const calculateBearing = (start, end) => {
  if (!start || !end) return 0;
  const startLat = toRad(start.lat ?? start.latitude);
  const startLon = toRad(start.lon ?? start.longitude);
  const endLat = toRad(end.lat ?? end.latitude);
  const endLon = toRad(end.lon ?? end.longitude);

  const y = Math.sin(endLon - startLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLon - startLon);
  let bearing = Math.atan2(y, x);
  return (toDeg(bearing) + 360) % 360;
};

const distanceInMeters = (a, b) => {
  if (!a || !b) return 0;
  const earthRadius = 6371000;
  const dLat = toRad((b.lat ?? b.latitude) - (a.lat ?? a.latitude));
  const dLon = toRad((b.lon ?? b.longitude) - (a.lon ?? a.longitude));
  const lat1 = toRad(a.lat ?? a.latitude);
  const lat2 = toRad(b.lat ?? b.latitude);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
};

const computeRemainingDistance = (geometry = [], userCoords) => {
  if (!Array.isArray(geometry) || geometry.length < 2 || !userCoords) return 0;

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  const coords = Array.isArray(geometry) ? geometry : (geometry?.coordinates || []);
  coords.forEach(([lon, lat], index) => {
    const gap = distanceInMeters(userCoords, { lat, lon });
    if (gap < nearestDistance) {
      nearestDistance = gap;
      nearestIndex = index;
    }
  });

  let remaining = 0;
  for (let i = nearestIndex; i < coords.length - 1; i += 1) {
    remaining += distanceInMeters(
      { lon: coords[i][0], lat: coords[i][1] },
      { lon: coords[i + 1][0], lat: coords[i + 1][1] }
    );
  }

  return remaining;
};

const resolveCurrentStep = (steps = [], distanceTravelled = 0) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  let traversed = 0;
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const step = steps[stepIndex];
    const stepDistance = Number(step.distance || 0);
    const nextBoundary = traversed + stepDistance;
    if (distanceTravelled <= nextBoundary) {
      return {
        ...step,
        distanceMeters: Math.max(1, Math.round(nextBoundary - distanceTravelled)),
        stepIndex,
      };
    }
    traversed = nextBoundary;
  }

  const lastStep = steps[steps.length - 1];
  return {
    ...lastStep,
    distanceMeters: 0,
    stepIndex: Math.max(0, steps.length - 1),
  };
};

const estimateTrafficLevel = (step = {}) => {
  const instruction = String(step.instruction || '').toLowerCase();
  const distance = Number(step.distance || 0);
  if (instruction.includes('roundabout') || instruction.includes('u-turn') || instruction.includes('sharp')) {
    return 'heavy';
  }
  if (distance < 120 || instruction.includes('turn left') || instruction.includes('turn right')) {
    return 'moderate';
  }
  return 'free';
};

const buildTrafficSegments = (geometry = [], steps = []) => {
  if (!Array.isArray(geometry) || geometry.length < 2) return [];
  if (!Array.isArray(steps) || steps.length === 0) {
    return [{ coordinates: geometry, level: 'free' }];
  }

  const totalDistance = steps.reduce((sum, step) => sum + Number(step.distance || 0), 0) || 1;
  const lastIndex = geometry.length - 1;
  let geometryCursor = 0;

  return steps.map((step, index) => {
    const ratio = Number(step.distance || 0) / totalDistance;
    const sliceSize = index === steps.length - 1
      ? lastIndex - geometryCursor
      : Math.max(1, Math.round(ratio * lastIndex));
    const endCursor = Math.min(lastIndex, geometryCursor + sliceSize);
    const coordinates = geometry.slice(geometryCursor, endCursor + 1);
    geometryCursor = endCursor;

    return {
      coordinates: coordinates.length > 1 ? coordinates : geometry.slice(Math.max(0, geometryCursor - 1), geometryCursor + 1),
      level: estimateTrafficLevel(step),
    };
  }).filter((segment) => Array.isArray(segment.coordinates) && segment.coordinates.length > 1);
};

const buildRoutePresentation = (routeIndex, steps = [], distanceMeters = 0) => {
  const turnCount = Math.max(1, steps.filter((step) => {
    const text = String(step?.instruction || '').toLowerCase();
    return text.includes('turn') || text.includes('left') || text.includes('right') || text.includes('roundabout');
  }).length);

  const presets = [
    {
      badge: 'Best Route',
      safetyTag: 'Highest',
      detailLine: turnCount <= 2 ? 'Fastest with minimal turns' : 'Best overall balance',
    },
    {
      badge: 'Safer Backup',
      safetyTag: 'Stable',
      detailLine: distanceMeters > 4000 ? 'Longer but calmer road flow' : 'Steadier path with fewer risks',
    },
    {
      badge: 'Alt Route',
      safetyTag: 'Good',
      detailLine: turnCount >= 4 ? 'More turns, useful if roads clog' : 'Compact fallback option',
    },
  ];

  return {
    ...presets[routeIndex] || presets[2],
    turnCount,
  };
};

const normalizeQuery = (value = '') => value.replace(/\s+/g, ' ').trim();
const VALID_ROUTING_PROFILES = new Set(['driving-car', 'driving-hgv', 'foot-walking', 'cycling-regular']);

const createMapHTML = (token) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #0F0E0B; height: 100%; width: 100%; overflow: hidden; }
    #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
    
    /* TACTICAL DOT (PLANNING) */
    .user-dot {
      width: 20px;
      height: 20px;
      background: #2F7BFF;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 15px rgba(47, 123, 255, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-dot-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      background: #2F7BFF;
      border-radius: 50%;
      opacity: 0.4;
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.33); }
      80%, 100% { opacity: 0; }
    }

    /* WAZE-STYLE 3D ARROW (NAVIGATION) */
    .navigation-puck {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-out;
    }
    .puck-svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
    }
    .puck-base {
      fill: rgba(255,255,255,0.9);
      stroke: rgba(0,0,0,0.1);
      stroke-width: 1;
    }
    .puck-arrow {
      fill: #00D1FF;
      stroke: #FFFFFF;
      stroke-width: 2;
      stroke-linejoin: round;
    }
    /* TACTICAL MARKERS */
    .tactical-marker {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
      mapboxgl.accessToken = '${token}';
      const map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [121.4116, 14.3311],
          zoom: 13,
          pitch: 0,
          antialias: true
      });

      window.pendingMessages = [];
      window.tacticalMarkers = {};
      window.loaded = false;
      window.manualMode = false;
      window.lastBearing = 0;

      // Circle generator helper
      function createCircle(center, radiusInKm, points = 64) {
          const coords = { lat: center[1], lng: center[0] };
          const earthR = 6378137;
          const radiusM = radiusInKm * 1000;
          const ret = [];
          
          for (let i = 0; i < points; i++) {
              const angle = (i * 360) / points;
              const rad = (angle * Math.PI) / 180;
              const dLat = (radiusM / earthR) * (180 / Math.PI) * Math.cos(rad);
              const dLng = (radiusM / (earthR * Math.cos((coords.lat * Math.PI) / 180))) * (180 / Math.PI) * Math.sin(rad);
              ret.push([coords.lng + dLng, coords.lat + dLat]);
          }
          ret.push(ret[0]);
          return [ret];
      }

      map.on('load', () => {
          map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
          map.addSource('route-traffic', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addSource('route-alt1', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
          map.addSource('route-alt2', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });
          map.addSource('route-alt3', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } } });

          // Tactical Polygons (Added BEFORE route layers to stay UNDER the path)
          map.addSource('tactical-polygons', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({ 
            id: 'tactical-polygons-fill', 
            type: 'fill', 
            source: 'tactical-polygons', 
            paint: { 
              'fill-color': [
                'case',
                ['==', ['get', 'is_passable'], 0], '#EF4444',
                ['==', ['get', 'is_passable'], 1], '#F59E0B',
                ['any', ['==', ['get', 'severity'], 'High'], ['==', ['get', 'severity'], 'Critical']], '#EF4444',
                ['==', ['get', 'type'], 'flood'], '#3B82F6',
                '#F59E0B'
              ], 
              'fill-opacity': 0.18 
            } 
          });
          map.addLayer({ 
            id: 'tactical-polygons-line', 
            type: 'line', 
            source: 'tactical-polygons', 
            paint: { 
              'line-color': [
                'case',
                ['==', ['get', 'is_passable'], 0], '#EF4444',
                ['==', ['get', 'is_passable'], 1], '#F59E0B',
                ['any', ['==', ['get', 'severity'], 'High'], ['==', ['get', 'severity'], 'Critical']], '#EF4444',
                ['==', ['get', 'type'], 'flood'], '#3B82F6',
                '#F59E0B'
              ], 
              'line-width': 2.5, 
              'line-dasharray': [2, 1.5] 
            } 
          });

          map.addLayer({ id: 'route-alt3-casing', type: 'line', source: 'route-alt3', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#111', 'line-width': 12, 'line-opacity': 0.3 } });
          map.addLayer({ id: 'route-alt3-line',   type: 'line', source: 'route-alt3', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#4B5563', 'line-width': 5, 'line-opacity': 0.45 } });
          map.addLayer({ id: 'route-alt2-casing', type: 'line', source: 'route-alt2', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#111', 'line-width': 12, 'line-opacity': 0.35 } });
          map.addLayer({ id: 'route-alt2-line',   type: 'line', source: 'route-alt2', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#6B7280', 'line-width': 6, 'line-opacity': 0.55 } });
          map.addLayer({ id: 'route-alt1-casing', type: 'line', source: 'route-alt1', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#111', 'line-width': 12, 'line-opacity': 0.4 } });
          map.addLayer({ id: 'route-alt1-line',   type: 'line', source: 'route-alt1', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#9CA3AF', 'line-width': 7, 'line-opacity': 0.65 } });
          
          map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 12, 'line-opacity': 0.8 } });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#2F7BFF', 'line-width': 7, 'line-opacity': 1.0 } });
          map.addLayer({ id: 'route-traffic', type: 'line', source: 'route-traffic', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-width': 4.5, 'line-opacity': 1.0, 'line-color': ['match', ['get', 'level'], 'heavy', '#EF4444', 'moderate', '#F59E0B', '#2F7BFF'] } });

          const sendAppMsg = (data) => { try { const msg = JSON.stringify(data); if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) { window.ReactNativeWebView.postMessage(msg); } } catch (e) {} };
          map.on('movestart', (e) => { if (e.originalEvent) { window.manualMode = true; sendAppMsg({ type: 'MAP_INTERACTION', manual: true }); } });
          map.on('zoomstart', (e) => { if (e.originalEvent) { window.manualMode = true; sendAppMsg({ type: 'MAP_INTERACTION', manual: true }); } });
          
          window.loaded = true;
          window.safeSetLayout = function(id, key, val) { if (map.getLayer(id)) map.setLayoutProperty(id, key, val); };
          window.sendMarkerClick = function(id) {
               const m = window.markerDataMap[id];
               if (m) sendAppMsg({ type: 'MARKER_CLICK', marker: m });
          };

          window.safeSetPaint = function(id, key, val) { if (map.getLayer(id)) map.setPaintProperty(id, key, val); };
          while (window.pendingMessages.length) window.handleSync(window.pendingMessages.shift());
      });

      window.handleSync = function(data) {
          if (!window.loaded) { window.pendingMessages.push(data); return; }
          if (data.type === 'SYNC') {
              if (data.recenter) { window.manualMode = false; }

              var routeGeom = data.routeGeom;
              if (routeGeom !== undefined) {
                  if (routeGeom && routeGeom.length > 1) {
                      window.cachedRouteGeom = routeGeom;
                      var clean = routeGeom.map(c => [Number(c[0]), Number(c[1])]);
                      map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: clean } });
                      if (data.routeIsUnsafe) {
                          window.safeSetPaint('route-line', 'line-color', '#EF4444');
                          window.safeSetPaint('route-casing', 'line-color', '#7F1D1D');
                      } else {
                          window.safeSetPaint('route-line', 'line-color', '#2F7BFF');
                          window.safeSetPaint('route-casing', 'line-color', '#162033');
                      }
                      if (data.shouldRefit) {
                          var bounds = new mapboxgl.LngLatBounds();
                          clean.forEach(c => bounds.extend(c));
                          map.fitBounds(bounds, { padding: { top: 98, right: 54, bottom: 232, left: 54 }, duration: 1100, maxZoom: 15.8 });
                          map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
                      }
                  } else {
                      window.cachedRouteGeom = [];
                      map.getSource('route').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                  }
              }

              if (data.userLoc) {
                  var userPos = [Number(data.userLoc.lon), Number(data.userLoc.lat)];
                  var isNav = !!data.isNav;
                  var activeRoute = data.routeGeom || window.cachedRouteGeom;

                  // 1. TACTICAL MAGNET & BEARING RECOVERY
                  var currentBearing = data.bearing || window.lastBearing || 0;
                  if (activeRoute && activeRoute.length > 1) {
                      var nearestIdx = 0; var minDist = Infinity;
                      for (var i = 0; i < activeRoute.length - 1; i++) {
                          var p = activeRoute[i];
                          var d = Math.sqrt(Math.pow(p[0]-userPos[0], 2) + Math.pow(p[1]-userPos[1], 2));
                          if (d < minDist) { minDist = d; nearestIdx = i; }
                      }
                      
                      // CALCULATE SEGMENT BEARING (WAZE-TRUE)
                      var p1 = activeRoute[nearestIdx];
                      var p2 = activeRoute[Math.min(nearestIdx + 1, activeRoute.length - 1)];
                      
                      if (p1 && p2 && (p1[0] !== p2[0] || p1[1] !== p2[1])) {
                          var lon1 = p1[0] * Math.PI / 180; var lat1 = p1[1] * Math.PI / 180;
                          var lon2 = p2[0] * Math.PI / 180; var lat2 = p2[1] * Math.PI / 180;
                          var y = Math.sin(lon2 - lon1) * Math.cos(lat2);
                          var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
                          currentBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                          window.lastBearing = currentBearing;
                      }

                      if (isNav && minDist < 0.0005) { userPos = activeRoute[nearestIdx]; }
                  }

                  // 2. MARKER & POV
                  if (!window.userMarker) {
                      var el = document.createElement('div');
                      window.userMarker = new mapboxgl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(userPos).addTo(map);
                  } else {
                      window.userMarker.setLngLat(userPos);
                  }

                  var el = window.userMarker.getElement();
                  if (isNav) {
                      if (el.className !== 'navigation-puck') {
                          el.className = 'navigation-puck';
                          el.innerHTML = '<svg class="puck-svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" class="puck-base" opacity="0.4" /><path d="M50 15 L85 85 L50 70 L15 85 Z" class="puck-arrow" /></svg>';
                      }
                      window.userMarker.setRotation(currentBearing);
                  } else {
                      if (el.className !== 'user-dot') {
                          el.className = 'user-dot';
                          el.innerHTML = '<div class="user-dot-pulse"></div>';
                          window.userMarker.setRotation(0);
                      }
                  }

                  if (data.forceZoom) {
                      const finalCenter = data.targetLoc ? [Number(data.targetLoc.lon), Number(data.targetLoc.lat)] : userPos;
                      map.jumpTo({ center: finalCenter, zoom: data.forceZoom });
                      window.firstFixDone = true;
                  } else if (!window.manualMode) {
                      if (isNav) {
                        map.easeTo({ center: userPos, zoom: 19, pitch: 65, bearing: currentBearing, duration: 1000, easing: (t) => t });
                      } else if (data.recenter || !window.firstFixDone) {
                        map.easeTo({ center: userPos, zoom: 17, duration: 800 });
                        window.firstFixDone = true;
                      }
                  }

                  // 3. ROUTE VISIBILITY
                  window.safeSetLayout('route-line', 'visibility', 'visible');
                  window.safeSetLayout('route-casing', 'visibility', 'visible');
                  window.safeSetLayout('route-alt1-line', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-alt1-casing', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-alt2-line', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-alt2-casing', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-alt3-line', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-alt3-casing', 'visibility', isNav ? 'none' : 'visible');
                  window.safeSetLayout('route-traffic', 'visibility', isNav ? 'visible' : 'none');

          if (data.forceZoom) {
              const finalCenter = data.targetLoc ? [Number(data.targetLoc.lon), Number(data.targetLoc.lat)] : userPos;
              map.flyTo({ center: finalCenter, zoom: data.forceZoom, pitch: isNav ? 65 : 0, bearing: 0, duration: 2000, essential: true });
          }
          
          if (data.tacticalMarkers && Array.isArray(data.tacticalMarkers)) {
              if (!window.activeMarkers) window.activeMarkers = {};
              var polyFeatures = [];
              window.markerDataMap = {};
              var currentIds = data.tacticalMarkers.map(m => String(m.id));
              data.tacticalMarkers.forEach(m => {
                  const markerId = String(m.id);
                  window.markerDataMap[markerId] = m;
                  let lng = parseFloat(m.lng || m.lon);
                  let lat = parseFloat(m.lat);

                  // 3a. AREA DATA RESOLUTION
                  let geom = m.area_geojson;
                  if (typeof geom === 'string') { try { geom = JSON.parse(geom); } catch(e) { geom = null; } }

                  // 3b. CENTROID CALCULATION (For Pinpoint placement on Polygons)
                  if (geom && geom.coordinates && geom.type === 'Polygon') {
                      const coords = geom.coordinates[0];
                      let sumLat = 0, sumLng = 0;
                      coords.forEach(c => { sumLng += c[0]; sumLat += c[1]; });
                      lng = sumLng / coords.length;
                      lat = sumLat / coords.length;
                  }

                  // 3c. PINPOINT RENDERING (Three-Ring Style)
                      const type = (m.type || '').toLowerCase();
                      const isPassable = String(m.is_passable) === '1' || m.is_passable === true;
                      const severity = m.severity || 'Moderate';

                      let icon = 'alert';
                      let color = isPassable ? '#F5B235' : '#EF4444';
                      
                      if (type.includes('fire')) { icon = 'fire'; color = '#EF4444'; }
                      else if (type.includes('flood')) { icon = 'waves'; color = '#3B82F6'; }
                      else if (type.includes('accident')) { icon = 'car-alert'; color = '#F59E0B'; }
                      else if (type.includes('medical')) { icon = 'heart-pulse'; color = '#F43F5E'; }
                      else if (type.includes('security')) { icon = 'shield-lock'; color = '#6366F1'; }
                      else if (type.includes('hazard')) { icon = 'alert-octagon'; color = '#F59E0B'; }
                      else if (type.includes('incident')) { icon = 'alert'; color = '#EF4444'; }
                      else if (type.includes('shelter')) { icon = 'home-heart'; color = '#10B981'; }
                      else if (type.includes('hall') || type.includes('barangay') || type.includes('brgy')) { icon = 'shield-home'; color = '#3B82F6'; }
                      
                      if (!window.activeMarkers[markerId]) {
                        var el = document.createElement('div');
                        el.className = 'tactical-marker';
                        el.style.cursor = 'pointer';
                        el.style.zIndex = '100';
                        
                        el.innerHTML = '<div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">' +
                            '<div style="position: absolute; inset: 0; background: ' + color + '; opacity: 0.15; border-radius: 50%; transform: scale(1.15);"></div>' +
                            '<div style="position: absolute; width: 34px; height: 34px; border: 1.5px solid ' + color + '; opacity: 0.4; border-radius: 50%; box-sizing: border-box;"></div>' +
                            '<div style="position: absolute; width: 26px; height: 26px; background: white; border: 2.5px solid ' + color + '; border-radius: 50%; box-sizing: border-box; box-shadow: 0 4px 10px rgba(0,0,0,0.4);"></div>' +
                            '<div style="position: absolute; width: 16px; height: 16px; background: ' + color + '; border-radius: 50%; display: flex; align-items: center; justify-content: center;">' +
                              '<i class="mdi mdi-' + icon + '" style="color: white; font-size: 10px; line-height: 1;"></i>' +
                            '</div>' +
                          '</div>';
                        
                        el.onclick = function(e) {
                          e.stopPropagation();
                          window.sendMarkerClick(markerId);
                        };
                        
                        window.activeMarkers[markerId] = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);
                      } else {
                        window.activeMarkers[markerId].setLngLat([lng, lat]);
                      }

                      // 3d. POLYGON / RADIUS RENDERING
                      const isAsset = type.includes('shelter') || type.includes('hall') || type.includes('barangay') || type.includes('brgy');

                  const addPoly = (g) => {
                    if (!g) return;
                    if (g.type === 'FeatureCollection') {
                        (g.features || []).forEach(f => addPoly(f));
                        return;
                    }
                    const finalGeom = g.type === 'Feature' ? g.geometry : g;
                    if (finalGeom) polyFeatures.push({ 
                        type: 'Feature', 
                        properties: { 
                            type: type, 
                            severity: severity,
                            is_passable: normalizeIsPassable(m.is_passable)
                        }, 
                        geometry: finalGeom 
                    });
                  };

                  function normalizeIsPassable(val) {
                      if (val === true || val === 1 || val === "1" || val === "true") return 1;
                      return 0;
                  }

                      const finalGeom = geom ? (geom.type === 'Feature' ? geom.geometry : geom) : null;
                      
                      if (finalGeom) {
                        polyFeatures.push({ 
                          type: 'Feature', 
                          properties: { 
                              type: type, 
                              severity: severity,
                              is_passable: normalizeIsPassable(m.is_passable)
                          }, 
                          geometry: finalGeom 
                        });
                      } else if (!isAsset) {
                        let radius = 0.3;
                        const sev = severity.toLowerCase();
                        if (sev.includes('critical')) radius = 0.6;
                        else if (sev.includes('high')) radius = 0.45;
                        else if (sev.includes('moderate') || sev.includes('medium')) radius = 0.3;
                        else radius = 0.2;

                        polyFeatures.push({ 
                          type: 'Feature', 
                          properties: { 
                              type: type, 
                              severity: severity,
                              is_passable: normalizeIsPassable(m.is_passable)
                          }, 
                          geometry: {
                              type: 'Polygon',
                              coordinates: createCircle([lng, lat], radius) 
                          } 
                        });
                      }
              });

              // 3e. CLEANUP REMOVED MARKERS
              Object.keys(window.activeMarkers).forEach(id => { 
                  if (!currentIds.includes(String(id))) { 
                      window.activeMarkers[id].remove(); 
                      delete window.activeMarkers[id]; 
                  } 
              });

              // 3f. SYNC POLYGON SOURCE & ORDERING
              if (map.getSource('tactical-polygons')) {
                  map.getSource('tactical-polygons').setData({ type: 'FeatureCollection', features: polyFeatures });
                  
                  // Maintain layer order: Polygons stay BELOW route path
                  if (map.getLayer('tactical-polygons-fill')) map.moveLayer('tactical-polygons-fill', 'route-casing');
                  if (map.getLayer('tactical-polygons-line')) map.moveLayer('tactical-polygons-line', 'route-casing');
              }
          }
              }

              if (data.destLoc) {
                  if (window.destMarker) window.destMarker.remove();
                  window.destMarker = new mapboxgl.Marker({ color: '#F25F52' }).setLngLat([data.destLoc.lon, data.destLoc.lat]).addTo(map);
              } else if (window.destMarker) { window.destMarker.remove(); window.destMarker = null; }

              if (data.altRouteGeoms !== undefined) {
                  if (Array.isArray(data.altRouteGeoms) && data.altRouteGeoms.length > 0) {
                      map.getSource('route-alt1').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: (data.altRouteGeoms[0] || []).map(c => [Number(c[0]), Number(c[1])]) } });
                      map.getSource('route-alt2').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: (data.altRouteGeoms[1] || []).map(c => [Number(c[0]), Number(c[1])]) } });
                      map.getSource('route-alt3').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: (data.altRouteGeoms[2] || []).map(c => [Number(c[0]), Number(c[1])]) } });
                  } else {
                      map.getSource('route-alt1').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                      map.getSource('route-alt2').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                      map.getSource('route-alt3').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
                  }
              }
          }
      };
      const syncHandler = (e) => {
          try {
              var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
              if (d && d.type === 'SYNC') window.handleSync(d);
          } catch(err){}
      };
      window.addEventListener('message', syncHandler);
      document.addEventListener('message', syncHandler);
  </script>
</body>
</html>
`;

const TacticalMarkerBriefing = ({ marker, onSetAsDestination, onCancel, insets, currentUser }) => {
  if (!marker) return null;
  const type = marker.type || 'Asset';
  const isShelter = type.includes('shelter');
  const isBrgy = type.includes('hall') || type.includes('barangay');
  const isIncident = type.includes('incident') || type.includes('hazard');
  const isMyReport = isIncident && currentUser && marker.user_id == currentUser.id;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 8500, backgroundColor: 'rgba(0,0,0,0.4)' }]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onCancel} />
      <MotiView
        from={{ translateY: 300, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: 300, opacity: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{
          backgroundColor: '#1C1C1E',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: (insets.bottom || 0) + 24,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <Row align="center" justify="between" style={{ marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Row align="center" style={{ marginBottom: 6 }}>
              <View style={{ backgroundColor: isShelter ? 'rgba(39,174,96,0.15)' : (isBrgy ? 'rgba(147,51,234,0.15)' : 'rgba(245,158,11,0.15)'), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderSize: 1, borderColor: isShelter ? 'rgba(39,174,96,0.3)' : (isBrgy ? 'rgba(147,51,234,0.3)' : 'rgba(245,158,11,0.3)') }}>
                <Text style={{ color: isShelter ? '#27AE60' : (isBrgy ? '#A855F7' : '#F59E0B'), fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>{isMyReport ? 'MY REPORT' : type}</Text>
              </View>
              {isIncident && (
                <View style={{ marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                   <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' }}>{marker.status?.toUpperCase() || 'ACTIVE'}</Text>
                </View>
              )}
            </Row>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>{marker.name || marker.type?.toUpperCase() || 'Tactical Asset'}</Text>
          </View>
          <TouchableOpacity onPress={onCancel} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <Lucide.X size={18} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </Row>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
          {isShelter && (
            <Row align="center" justify="between" style={{ marginBottom: 12 }}>
              <Text style={{ color: 'rgba(243,238,230,0.5)', fontSize: 12, fontWeight: '600' }}>Occupancy</Text>
              <Text style={{ color: '#F3EEE6', fontSize: 14, fontWeight: '700' }}>{marker.occupancy} / {marker.capacity}</Text>
            </Row>
          )}
          {isIncident && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: 'rgba(243,238,230,0.5)', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>TACTICAL INTELLIGENCE</Text>
              
              <Row align="center" justify="between" style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Passability</Text>
                <Badge 
                  label={marker.is_passable ? 'PASSABLE' : 'NOT PASSABLE'} 
                  variant={marker.is_passable ? 'success' : 'danger'} 
                />
              </Row>

              {marker.allowed_modes && Array.isArray(marker.allowed_modes) && marker.allowed_modes.length > 0 && (
                <View style={{ marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', marginBottom: 8 }}>ALLOWED MODES</Text>
                  <Row wrap gap={6}>
                    {marker.allowed_modes.map(mode => (
                      <View key={mode} style={{ backgroundColor: 'rgba(47, 123, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(47, 123, 255, 0.2)' }}>
                        <Text style={{ color: '#2F7BFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>{mode.replace(/-/g, ' ')}</Text>
                      </View>
                    ))}
                  </Row>
                </View>
              )}

              <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>DESCRIPTION</Text>
                <Text style={{ color: '#F3EEE6', fontSize: 13, lineHeight: 18 }}>{marker.description || 'No detailed intel provided.'}</Text>
              </View>
            </View>
          )}
          <Row align="center" justify="between">
            <Text style={{ color: 'rgba(243,238,230,0.5)', fontSize: 12, fontWeight: '600' }}>{isIncident ? 'Sync Time' : 'Hotline / Comms'}</Text>
            <Text style={{ color: '#F3EEE6', fontSize: 14, fontWeight: '700' }}>{isIncident ? (marker.time || 'RECENT') : (marker.contact || 'SECURE_LINE_ONLY')}</Text>
          </Row>
        </View>

        <TouchableOpacity
          onPress={() => onSetAsDestination(marker)}
          style={{ backgroundColor: '#2F7BFF', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#2F7BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Row align="center">
            <MaterialCommunityIcons name="navigation-variant" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>SET_AS_DESTINATION</Text>
          </Row>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
};

const MissionBriefing = ({ destination, onAccept, onCancel, tacticalData, insets, destCoords }) => {
  const marker = useMemo(() => {
    if (!destination || !tacticalData) return null;
    return tacticalData.find(m => 
      m.name === destination || 
      (m.type && m.type.toUpperCase() === destination.toUpperCase())
    );
  }, [destination, tacticalData]);

  const counts = {
    flood: (tacticalData || []).filter(m => m.type === 'flood').length,
    hazard: (tacticalData || []).filter(m => m.type === 'hazard' || m.type === 'incident').length
  };

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={onCancel}
      />

      <MotiView
        from={{ translateY: 600, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: 600, opacity: 0 }}
        transition={{ type: 'timing', duration: 350 }}
        style={{
          backgroundColor: '#0A0A0A',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          padding: 24,
          paddingBottom: (insets?.bottom || 24) + 20,
          borderTopWidth: 2,
          borderTopColor: '#B37213',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <Col gap={24}>
          <Row align="center" justify="space-between">
            <Col>
              <Heading size="lg" style={{ letterSpacing: 1 }}>TACTICAL BRIEFING</Heading>
              <Text style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontSize: 9, fontWeight: '800', marginTop: 4 }}>MISSION ID: {destination ? (destination.length + (destCoords?.lat || 0)).toString(36).toUpperCase() : 'BETA-1'}</Text>
            </Col>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(179,114,19,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(179,114,19,0.2)' }}>
              <Lucide.ShieldAlert size={20} color="#B37213" />
            </View>
          </Row>

          <Card variant="glass" style={{ padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }}>
            <Row align="center" gap={16} style={{ marginBottom: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(179,114,19,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Lucide.MapPin size={20} color="#B37213" />
              </View>
              <Col style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>OBJECTIVE</Text>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 2 }}>{destination}</Text>
              </Col>
            </Row>

            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 }} />

            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 12 }}>INTELLIGENCE SUMMARY</Text>
            {marker ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: '#F3EEE6', fontSize: 13, lineHeight: 18, marginBottom: 12 }}>{marker.description || 'Target area verified for tactical deployment. Standard protocols apply.'}</Text>
                {marker.capacity && (
                  <Row justify="between" style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Occupancy Status</Text>
                    <Text style={{ color: '#F2AB2E', fontSize: 11, fontWeight: '800' }}>{marker.occupancy} / {marker.capacity}</Text>
                  </Row>
                )}
              </View>
            ) : null}
            <Row wrap gap={8}>
              <Badge label={`${counts.flood || 0} FLOOD ZONES AVOIDED`} variant="info" />
              <Badge label={`${counts.hazard || 0} HAZARDS BYPASSED`} variant="danger" />
              <Badge label="PATH VERIFIED" variant="success" />
            </Row>
          </Card>

          <Col gap={12}>
            <PrimaryButton
              title="TAKE ME THERE"
              onPress={onAccept}
              variant="tactical"
              lucideIcon="Navigation"
            />
            <TouchableOpacity onPress={onCancel} style={{ alignSelf: 'center', paddingVertical: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '700', fontSize: 11, letterSpacing: 1 }}>ABORT MISSION</Text>
            </TouchableOpacity>
          </Col>
        </Col>
      </MotiView>
    </View>
  );
};

const RoutePlannerScreen = ({ navigation, route: navRoute }) => {
  const { theme, atomic } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, isPortrait } = useResponsive();
  const isLandscape = !isPortrait;
  const [destination, setDestination] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [routesCache, setRoutesCache] = useState({});
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [route, setRoute] = useState(null);
  const [isPlannerCollapsed, setIsPlannerCollapsed] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isMissionBriefing, setIsMissionBriefing] = useState(false);
  const [isPendingBriefing, setIsPendingBriefing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNavMuted, setIsNavMuted] = useState(false);
  const [navigationData, setNavigationData] = useState({ distanceRemaining: 0, durationRemaining: 0, arrivalTimestamp: null });
  const [currentStep, setCurrentStep] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [isUserInteraction, setIsUserInteraction] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [tacticalMarkers, setTacticalMarkers] = useState([]);
  const [travelMode, setTravelMode] = useState('driving-car');
  const [transportModes, setTransportModes] = useState([]);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const tacticalMarkersRef = useRef([]);
  const isNavRef = useRef(false);
  const webviewRef = useRef(null);
  const locationWatchRef = useRef(null);
  const paramsProcessedRef = useRef(false);

  useEffect(() => { tacticalMarkersRef.current = tacticalMarkers; }, [tacticalMarkers]);
  useEffect(() => { isNavRef.current = isNavigating; }, [isNavigating]);

  useEffect(() => {
    // Unlock landscape for navigation mode (Mobile only)
    if (Platform.OS !== 'web') {
      ScreenOrientation.unlockAsync();
    }
    init(); // Check auth on mount
    return () => {
      // Revert to portrait when leaving (Mobile only)
      if (Platform.OS !== 'web') {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    };
  }, []);

  useEffect(() => {
    const params = navRoute.params;
    console.log('[RoutePlanner] Params received:', params);
    if (params && !paramsProcessedRef.current) {
      if (params.lat && params.lon) {
        paramsProcessedRef.current = true;
        const newDest = { lat: parseFloat(params.lat), lon: parseFloat(params.lon) };
        console.log('[RoutePlanner] Setting destination:', newDest);
        setDestCoords(newDest);
        if (params.name) setDestination(decodeURIComponent(params.name));
        if (params.mode) setTravelMode(params.mode);

        // Handle explicit start coordinates from deep link
        if (params.sLat && params.sLon) {
          console.log('[RoutePlanner] Setting custom start:', { lat: params.sLat, lon: params.sLon });
          setStartCoords({ lat: parseFloat(params.sLat), lon: parseFloat(params.sLon) });
        }

        // Handle specific report zoom/briefing
        if (params.reportId || params.name) {
            console.log('[RoutePlanner] Targeted asset/report zoom:', params.reportId || params.name);
            const focusOnMarker = async () => {
                // Wait a bit for tactical markers to load
                let attempts = 0;
                while (tacticalMarkers.length === 0 && attempts < 10) {
                    await new Promise(r => setTimeout(r, 500));
                    attempts++;
                }
                const target = tacticalMarkers.find(m => 
                    (params.reportId && (m.id === `i${params.reportId}` || m.id === params.reportId)) ||
                    (params.name && m.name === decodeURIComponent(params.name))
                );
                if (target) {
                    setSelectedMarker(target);
                    webviewRef.current?.postMessage(JSON.stringify({
                        type: 'SYNC',
                        userLoc: startCoords,
                        forceZoom: 18,
                        recenter: true,
                        targetLoc: { lat: target.lat, lon: target.lng || target.lon }
                    }));
                }
            };
            focusOnMarker();
        }

        if (params.autoStart === 'true' || params.autoStart === true) {
          console.log('[RoutePlanner] Auto-start triggered -> Triggering Background Calculation');
          setIsPlannerCollapsed(true);
          setIsPendingBriefing(true);
          setPendingRedirect(true);
        }
      }
    }
  }, [navRoute.params, tacticalMarkers.length > 0]);

  useEffect(() => {
    if (pendingRedirect && startCoords && destCoords && !isNavigating && !isCalculating) {
      calculateRoute(destCoords);
      setPendingRedirect(false);
    }
  }, [pendingRedirect, startCoords, destCoords]);

  useEffect(() => {
    const fetchTactical = async () => {
      try {
        const [hRes, iRes, sRes, bRes] = await Promise.all([
          fetch(`${API_URL}/list-map-overlays.php`).catch(() => null),
          fetch(`${API_URL}/list-incidents.php?status=Active`).catch(() => null),
          fetch(`${API_URL}/shelters-list.php`).catch(() => null),
          fetch(`${API_URL}/list-barangays.php`).catch(() => null)
        ]);
        
        const markers = [];

        if (hRes) {
          const hData = await hRes.json();
          if (hData?.success) {
            (hData.reports || []).forEach(h => markers.push({
              id: `h${h.id}`, lat: parseFloat(h.lat), lng: parseFloat(h.lng),
              type: (h.type || 'hazard').toLowerCase(), area_geojson: h.area_geojson,
              severity: h.severity || 'Normal',
              is_passable: h.is_passable === undefined ? true : !!h.is_passable
            }));
          }
        }

        if (iRes) {
          const iData = await iRes.json();
          if (iData?.success && iData.incidents) {
            const allowedStats = ['ACTIVE', 'APPROVED', 'VERIFIED', 'RESOLVED'];
            iData.incidents
              .filter(r => allowedStats.includes((r.status || '').toUpperCase()))
              .forEach(r => markers.push({
                id: `i${r.id}`, lat: parseFloat(r.lat), lng: parseFloat(r.lng),
                type: 'incident', area_geojson: r.area_geojson,
                severity: r.severity || 'Moderate',
                is_passable: r.is_passable === undefined ? true : (r.is_passable === true || r.is_passable === 1 || r.is_passable === "1"),
                status: r.status,
                description: r.description,
                time: r.time,
                user_id: r.user_id,
                allowed_modes: r.allowed_modes
              }));
          }
        }

        if (sRes) {
          const sData = await sRes.json();
          if (Array.isArray(sData)) {
            sData.forEach(s => markers.push({
              id: `s${s.id}`, lat: parseFloat(s.lat), lng: parseFloat(s.lng),
              type: 'shelter', name: s.name, status: s.status,
              capacity: s.capacity, occupancy: s.occupancy, contact: s.contact_number,
              is_passable: true // Mission Assets are always passable
            }));
          }
        }

        if (bRes) {
          const bData = await bRes.json();
          if (bData?.success && bData.barangays) {
            bData.barangays.forEach(b => markers.push({
              id: `b${b.id}`, lat: parseFloat(b.lat), lng: parseFloat(b.lng),
              type: b.type?.toLowerCase() || 'barangay', name: b.name, contact: b.contact,
              is_passable: true // Mission Assets are always passable
            }));
          }
        }

        setTacticalMarkers(markers);
      } catch (e) { console.warn("[Tactical] Marker fetch failed:", e); }
    };
    fetchTactical();
    const interval = setInterval(fetchTactical, 10000);
    return () => clearInterval(interval);
  }, []);

  // State moved to top for stability

  const handleShareRoute = async () => {
    if (!destCoords) return;
    try {
      const mode = travelMode;
      const missionName = destination || 'Tactical Target';
      
      // Use expo-linking to generate the correct URI for the current environment
      // This will automatically handle exp:// for development and eligtasmo:// for production
      const shareLink = Linking.createURL('route-planner', {
        queryParams: {
          lat: destCoords.lat,
          lon: destCoords.lon,
          name: missionName,
          mode: mode,
          autoStart: 'true',
          sLat: startCoords?.lat,
          sLon: startCoords?.lon
        }
      });

      console.log('[Tactical] Adaptive Mission Link:', shareLink);

      // Attempt Clipboard Copy
      await Clipboard.setStringAsync(shareLink);
      
      // Native Share API for maximum reliability
      const shareResult = await Share.share({
        message: `Strategic Mission Path: ${missionName}\nInitiate Navigation: ${shareLink}`,
        url: shareLink, 
        title: 'E-LigtasMo Tactical Route'
      });
    } catch (e) {
      console.warn('[Share] Mission link failed:', e);
      Alert.alert('Comms Error', 'Failed to generate adaptive mission link.');
    }
  };

  // Move useEffect to bottom of component to fix hoisting


  const mapHtml = useMemo(() => ({ html: createMapHTML(MAPBOX_ACCESS_TOKEN) }), []);

  useEffect(() => {
    if (destCoords) {
      calculateRoute(destCoords);
    }
  }, [travelMode, destCoords]);

  useEffect(() => {
    init();
    handleUseMyLocation();
    let isMounted = true;
    const startWatching = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        locationWatchRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 }, (loc) => {
          if (!isMounted) return;
          const newCoords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          setStartCoords(newCoords);
          if (loc.coords.speed !== null) setCurrentSpeed(loc.coords.speed * 3.6);
          webviewRef.current?.postMessage(JSON.stringify({
            type: 'SYNC',
            userLoc: newCoords,
            bearing: loc.coords.heading,
            isNav: isNavRef.current,
            recenter: !isUserInteraction,
            tacticalMarkers: tacticalMarkersRef.current,
            forceZoom: !startCoords ? 17 : undefined // Only zoom on very first fix
          }));
        });
      } catch (e) { }
    };
    startWatching();
    return () => {
      isMounted = false;
      if (locationWatchRef.current) {
        try {
          if (typeof locationWatchRef.current.remove === 'function') {
            locationWatchRef.current.remove();
          } else if (locationWatchRef.current.removeSubscription) {
             locationWatchRef.current.removeSubscription();
          }
        } catch (e) { console.log("[Location] Cleanup error:", e); }
        locationWatchRef.current = null;
      }
    };
  }, []);

  const init = async () => {
    try {
      const u = await AuthService.checkSession();
      setUser(u);
      if (!u) {
        // Option to block here or show overlay
      }
      const role = u?.role ? String(u.role).toLowerCase() : 'resident';
      const resp = await fetch(`${API_URL}/list-transport-modes.php?role=${encodeURIComponent(role)}`);
      const data = await resp.json();
      if (data?.modes) { setTransportModes(data.modes); setTravelMode(user?.preferred_vehicle || data.modes[0]?.code || 'driving-car'); }
    } catch (e) { }
  };

  const calculateRoute = async (overrideDest = null) => {
    const targetDest = overrideDest || destCoords;
    if (!startCoords || !targetDest) return;
    setIsCalculating(true);

    try {
      const createCircle = (lat, lng, radiusKm = 0.4, points = 64) => {
        const coords = [];
        const kmPerDegreeLat = 111.32;
        const kmPerDegreeLng = 40075 * Math.cos(lat * Math.PI / 180) / 360;
        for (let i = 0; i <= points; i++) {
          const angle = (i * 360) / points;
          const rad = angle * Math.PI / 180;
          const x = lng + (radiusKm * Math.sin(rad)) / kmPerDegreeLng;
          const y = lat + (radiusKm * Math.cos(rad)) / kmPerDegreeLat;
          coords.push([x, y]);
        }
        return { type: 'Polygon', coordinates: [coords] };
      };

      const normalizeGeom = (geojson, fallbackLat, fallbackLng) => {
        if (!geojson || geojson.type === 'Point' || (geojson.type === 'Feature' && geojson.geometry?.type === 'Point')) {
          const lat = (geojson?.type === 'Feature' ? geojson.geometry?.coordinates?.[1] : geojson?.coordinates?.[1]) || fallbackLat;
          const lng = (geojson?.type === 'Feature' ? geojson.geometry?.coordinates?.[0] : geojson?.coordinates?.[0]) || fallbackLng;
          if (!lat || !lng) return null;
          return createCircle(lat, lng, 0.4); // Increased to 400m for better tactical avoidance
        }
        return geojson.type === 'Feature' ? geojson.geometry : geojson;
      };

      const avoidZones = [];
      tacticalMarkersRef.current.forEach(item => {
        // Only avoid zones that are NOT passable (is_passable false or 0)
        const isActuallyPassable = item.is_passable === true || item.is_passable === 1 || item.is_passable === "1";
        if (isActuallyPassable) return;

        const geom = normalizeGeom(item.area_geojson, parseFloat(item.lat), parseFloat(item.lng));
        if (geom) {
          avoidZones.push({
            type: 'Feature',
            properties: {
              is_passable: item.is_passable,
              type: item.type
            },
            geometry: geom
          });
        }
      });

      const body = {
        start: [startCoords.lon, startCoords.lat],
        end: [targetDest.lon, targetDest.lat],
        profile: travelMode, // Crucial: This must be the current selected profile
        avoid_zones: avoidZones
      };

      console.log(`[Tactical] Requesting Route: START[${startCoords.lon}, ${startCoords.lat}] -> END[${targetDest.lon}, ${targetDest.lat}]`);
      
      const resp = await fetch(`${API_URL}/mapbox-directions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(err => { throw new Error("Network failure: " + err.message); });

      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      let data;
      try {
        const text = await resp.text();
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid Mission Data: The server returned an unreadable response.");
      }

      if (data?.error) {
        alert("Mission System Error: " + data.error);
        setIsCalculating(false);
        return;
      }
      if (data?.features && data.features.length > 0) {
        // Ensure they are sorted by duration (fastest first) before mapping
        const rawFeatures = [...data.features].sort((a, b) => 
          (a.properties?.summary?.duration || 0) - (b.properties?.summary?.duration || 0)
        );

        const routes = rawFeatures.map((f, i) => {
          const steps = f.properties?.summary?.steps || f.properties?.segments?.[0]?.steps || [];
          const distMeters = f.properties?.summary?.distance || 0;
          const durationSec = f.properties?.summary?.duration || 0;
          
          return {
            ...buildRoutePresentation(i, steps, distMeters),
            geometry: f.geometry,
            steps: steps,
            distMeters: distMeters,
            totalDurationSec: durationSec,
            time: Math.round(durationSec / 60) + ' min',
            distance: (distMeters / 1000).toFixed(1) + ' km',
            hazardWarning: !!f.properties?.intersects
          };
        });
        setAllRoutes(routes);
        setRoute(routes[0]);
        setSelectedRouteIndex(0);
        webviewRef.current?.postMessage(JSON.stringify({
          type: 'SYNC',
          routeGeom: routes[0]?.geometry?.coordinates || [],
          altRouteGeoms: routes.slice(1).map(r => r.geometry?.coordinates || []),
          shouldRefit: true,
          destLoc: targetDest,
          isNav: false,
          recenter: true,
          routeIsUnsafe: !!routes[0]?.hazardWarning
        }));
      } else {
        alert("Mission Blocked: No viable routes found. Please check if the destination is reachable or if there are too many hazards in the area.");
        setAllRoutes([]);
        setRoute(null);
      }
    } catch (e) {
      console.error("[Route] Calculation error:", e);
    } finally {
      setIsCalculating(false);
      if (isPendingBriefing) {
        setIsMissionBriefing(true);
        setIsPendingBriefing(false);
      }
    }
  };

  const handleLocationSearch = async (text) => {
    setDestination(text);
    if (text.length >= 2) {
      try {
        const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?proximity=121.41,14.28&limit=5&access_token=${MAPBOX_ACCESS_TOKEN}`);
        const data = await resp.json();
        if (data.features) setSuggestions(data.features.map(f => ({ id: f.id, name: f.text, address: f.place_name, lat: f.center[1], lon: f.center[0] })));
      } catch (e) { }
    }
  };

  const handleUseMyLocation = async () => {
    try {
      let loc = await Location.getLastKnownPositionAsync();
      if (loc) { setStartCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude }); webviewRef.current?.postMessage(JSON.stringify({ type: 'SYNC', userLoc: { lat: loc.coords.latitude, lon: loc.coords.longitude }, forceZoom: 17 })); }
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setStartCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      webviewRef.current?.postMessage(JSON.stringify({ type: 'SYNC', userLoc: { lat: loc.coords.latitude, lon: loc.coords.longitude }, forceZoom: 17.5 }));
    } catch (e) { }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getNearestAsset = (typePatterns) => {
    if (!startCoords || !tacticalMarkers.length) return null;
    const assets = tacticalMarkers.filter(m => 
      typePatterns.some(p => m.type.toLowerCase().includes(p.toLowerCase()))
    );
    if (!assets.length) return null;
    
    let nearest = null;
    let minDist = Infinity;
    assets.forEach(a => {
      const dist = calculateDistance(startCoords.lat, startCoords.lon, a.lat, a.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = { ...a, distance: dist };
      }
    });
    return nearest;
  };

  const handleRedirect = (asset, name) => {
    setDestination(name);
    setDestCoords({ lat: asset.lat, lon: asset.lng });
    setIsNavigating(false);
  };

  // Tactical state and fetchers moved to top for stability


  useEffect(() => {
    const interval = setInterval(() => {
      if (!webviewRef.current || isCalculating) return;

      const syncData = {
        type: 'SYNC',
        userLoc: startCoords,
        isNav: isNavigating,
        recenter: isNavigating && !isUserInteraction,
        tacticalMarkers: tacticalMarkersRef.current,
        destLoc: destCoords,
        routeGeom: route?.geometry?.coordinates || [],
        altRouteGeoms: (allRoutes || []).filter(r => r !== route).map(r => r.geometry?.coordinates || []),
      };

      if (isNavigating && route) {
        const geom = route.geometry?.coordinates || [];
        if (geom.length >= 2) {
          let minDist = Infinity; let nearestIdx = 0;
          geom.forEach(([ln, lt], i) => { const d = distanceInMeters(startCoords, { lat: lt, lon: ln }); if (d < minDist) { minDist = d; nearestIdx = i; } });
          const currentPoint = geom[nearestIdx]; const nextPoint = geom[Math.min(nearestIdx + 10, geom.length - 1)];
          const currentBearing = calculateBearing({ lat: currentPoint[1], lon: currentPoint[0] }, { lat: nextPoint[1], lon: nextPoint[0] });
          setBearing(currentBearing);
          syncData.bearing = currentBearing;

          const distRem = computeRemainingDistance(geom, startCoords);
          const durRem = (distRem / (route.distMeters || 1)) * (route.totalDurationSec || 0);
          setNavigationData({ distanceRemaining: distRem, durationRemaining: durRem, arrivalTimestamp: new Date(Date.now() + durRem * 1000) });
          const resolved = resolveCurrentStep(route.steps, (route.distMeters - distRem));
          if (resolved) setCurrentStep(resolved);
        }
      }

      webviewRef.current?.postMessage(JSON.stringify(syncData));
    }, 1000);
    return () => clearInterval(interval);
  }, [isNavigating, startCoords, route, allRoutes, isUserInteraction, destCoords]);

  const startNavigation = () => { if (!route) return; setIsNavigating(true); setCurrentStep(route.steps[0]); webviewRef.current?.injectJavaScript(`if(window.map){window.map.easeTo({center:[${startCoords.lon},${startCoords.lat}],pitch:65,zoom:19,duration:1000});}`); };
  const stopNavigation = () => {
    setIsNavigating(false);
    // Send SYNC with shouldRefit to see the whole path again
    webviewRef.current?.postMessage(JSON.stringify({
      type: 'SYNC',
      routeGeom: route?.geometry?.coordinates || [],
      altRouteGeoms: allRoutes.filter(r => r !== route).map(r => r.geometry?.coordinates || []),
      shouldRefit: true,
      destLoc: destCoords,
      userLoc: startCoords,
      isNav: false,
      recenter: true
    }));
  };

  return (
    <Screen ornamentIntensity={0} style={{ backgroundColor: '#191A1A' }}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <UniversalWebView
          ref={webviewRef}
          source={mapHtml}
          onMessage={(e) => {
            try {
              const d = JSON.parse(e.nativeEvent.data);
              if (d.type === 'MAP_INTERACTION') {
                setIsUserInteraction(d.manual);
              } else if (d.type === 'MARKER_CLICK') {
                setSelectedMarker(d.marker);
                webviewRef.current?.postMessage(JSON.stringify({
                  type: 'SYNC',
                  forceZoom: 18,
                  recenter: true,
                  targetLoc: { lat: d.marker.lat, lon: d.marker.lng || d.marker.lon }
                }));
              }
            } catch (err) { }
          }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={[atomic.l.abs, atomic.l.fill, { zIndex: 3000, pointerEvents: 'box-none' }]}>
          {(!isNavigating && allRoutes.length === 0) ? (
            <SearchHeader
              title="Search"
              destination={destination}
              onStartSearch={handleLocationSearch}
              onBack={() => navigation.canGoBack() && navigation.goBack()}
              insets={insets}
              suggestions={suggestions}
              onSelectSuggestion={(item) => {
                setDestination(item.address || item.name);
                setDestCoords({ lat: item.lat, lon: item.lon });
                setSuggestions([]);
                calculateRoute({ lat: item.lat, lon: item.lon });
              }}
              onReport={() => navigation.navigate('ReportIncident')}
            />
          ) : null}
          <AnimatePresence>
            {(allRoutes.length > 0 && !isNavigating) ? (
              <MotiView
                key="route-selection-header"
                from={{ translateY: -100, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: -100, opacity: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 6000 }}
              >
                <Row align="center" style={{ backgroundColor: 'rgba(26,22,18,0.92)', paddingTop: (insets.top || 0) + 12, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' }}>
                  <TouchableOpacity onPress={() => { setAllRoutes([]); setRoute(null); setDestination(''); }} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}><Lucide.ChevronLeft size={24} color="#F3EEE6" /></TouchableOpacity>
                  <Row align="center" style={{ flex: 1, paddingHorizontal: 16 }}><Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginRight: 8 }}>Your Location</Text><MaterialCommunityIcons name="arrow-right" size={16} color="rgba(255,255,255,0.4)" /><Text numberOfLines={1} style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '700', marginLeft: 8, flex: 1 }}>{destination}</Text></Row>
                  <TouchableOpacity onPress={handleShareRoute} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}><MaterialCommunityIcons name="share-variant" size={20} color="#fff" /></TouchableOpacity>
                </Row>
              </MotiView>
            ) : null}
            {isCalculating ? (
              <MotiView
                key="calculating-overlay"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,10,8,0.92)', zIndex: 9000, alignItems: 'center', justifyContent: 'center' }}
              >
                <ActivityIndicator size="large" color="#2F7BFF" />
                <Text style={{ color: '#F3EEE6', marginTop: 16 }}>Optimizing tactical mission path...</Text>
              </MotiView>
            ) : null}
          </AnimatePresence>

          {isMissionBriefing && (
            <MissionBriefing
              key="mission-briefing-panel"
              destination={destination}
              tacticalData={tacticalMarkers}
              insets={insets}
              destCoords={destCoords}
              onAccept={() => {
                setIsMissionBriefing(false);
              }}
              onCancel={() => {
                setIsMissionBriefing(false);
                navigation.navigate('Main');
              }}
            />
          )}

          {isNavigating && (
            <NavigationOverlay
              currentStep={currentStep}
              navigationData={navigationData}
              speed={currentSpeed}
              onStop={() => setIsNavigating(false)}
              isMuted={isNavMuted}
              onToggleMute={() => setIsNavMuted(!isNavMuted)}
              insets={insets}
              nearestBarangay={getNearestAsset(['barangay', 'hall', 'brgy'])}
              nearestShelter={getNearestAsset(['shelter'])}
              onRedirect={handleRedirect}
            />
          )}

          {/* Floating Report Button Removed - Moved to SearchHeader Top Right */}


          {allRoutes.length > 0 && !isNavigating && !isMissionBriefing ? (
            <RouteOptionsSheet
              allRoutes={allRoutes}
              selectedRouteIndex={selectedRouteIndex}
              setSelectedRouteIndex={(i) => { setSelectedRouteIndex(i); setRoute(allRoutes[i]); webviewRef.current?.postMessage(JSON.stringify({ type: 'SYNC', routeGeom: allRoutes[i]?.geometry?.coordinates || [], altRouteGeoms: allRoutes.filter((_, idx) => idx !== i).map(r => r?.geometry?.coordinates || []) })); }}
              onStartNavigation={() => { setIsNavigating(true); setIsPlannerCollapsed(true); }}
              collapsed={isPlannerCollapsed}
              onToggleCollapse={() => setIsPlannerCollapsed(!isPlannerCollapsed)}
              destinationLabel={destination}
              transportModes={transportModes}
              selectedTravelMode={travelMode}
              onSelectTravelMode={setTravelMode}
              insets={insets}
            />
          ) : null}

          {selectedMarker && (
            <AnimatePresence>
              <TacticalMarkerBriefing
                marker={selectedMarker}
                insets={insets}
                currentUser={user}
                onCancel={() => setSelectedMarker(null)}
                onSetAsDestination={(m) => {
                  setDestination(m.name || m.type);
                  setDestCoords({ lat: m.lat, lon: m.lng });
                  setSelectedMarker(null);
                }}
              />
            </AnimatePresence>
          )}

          {/* Authentication Guard Overlay */}
          {!user && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: 40 }]}
            >
              <View style={{ backgroundColor: '#1A1816', padding: 30, borderRadius: 24, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(242,171,46,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Lucide.Lock size={32} color="#F2AB2E" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#F3EEE6', marginBottom: 10, textAlign: 'center' }}>Intelligence Access Restricted</Text>
                <Text style={{ fontSize: 14, color: 'rgba(243,238,230,0.6)', textAlign: 'center', marginBottom: 30, lineHeight: 20 }}>Authentication is required to view tactical routes and hazard data. Please sign in to your command account.</Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={{
                    backgroundColor: '#F2AB2E',
                    height: 54,
                    borderRadius: 27,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#F2AB2E',
                    shadowOpacity: 0.3,
                    shadowRadius: 10
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>Authorize Mission Access</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ marginTop: 20 }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          )}
        </View>
      </View>
    </Screen>
  );
};

export default RoutePlannerScreen;
