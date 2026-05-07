import * as turf from '@turf/turf';
import { SANTA_CRUZ_OUTLINE } from '../constants/geo';

/**
 * Validates if a coordinate is within the Santa Cruz, Laguna boundary.
 */
export const isPointInSantaCruz = (lat: number, lng: number): boolean => {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const pt = turf.point([lng, lat]);
    return turf.booleanPointInPolygon(pt, SANTA_CRUZ_OUTLINE);
  } catch (e) {
    console.error("Geo validation error:", e);
    return true; // Fallback to avoid blocking if validation fails
  }
};
