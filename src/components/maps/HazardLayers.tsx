import { useMemo } from "react";
import { Source, Layer } from "react-map-gl";
import TacticalMarker from "./TacticalMarker";

type HazardPoint = {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  severity?: string;
  type?: string;
};

export default function HazardLayers({
  points,
  areas,
  idPrefix,
}: {
  points: HazardPoint[];
  areas?: any[];
  idPrefix: string;
}) {
  const fc = useMemo(() => {
    const features: any[] = [];
    for (const p of points || []) {
      const lat = Number(p.latitude ?? p.lat);
      const lng = Number(p.longitude ?? p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const severityRaw = String(p.severity || "low").toLowerCase();
      const severity =
        severityRaw === "critical" || severityRaw === "high" || severityRaw === "medium" || severityRaw === "moderate"
          ? severityRaw === "moderate"
            ? "medium"
            : severityRaw
          : "low";
      const weight = severity === "critical" ? 1 : severity === "high" ? 0.8 : severity === "medium" ? 0.55 : 0.35;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: { severity, weight },
      });
    }

    return { type: "FeatureCollection", features } as any;
  }, [points]);

  const areaFc = useMemo(() => {
    const features: any[] = [];
    for (const a of areas || []) {
      if (!a) continue;
      if (a.type === "Feature" && a.geometry) {
        features.push(a);
      } else if (a.type && a.coordinates) {
        features.push({ type: "Feature", geometry: a, properties: {} });
      } else if (a.geometry && a.geometry.type && a.geometry.coordinates) {
        features.push({ type: "Feature", geometry: a.geometry, properties: a.properties || {} });
      }
    }
    return { type: "FeatureCollection", features } as any;
  }, [areas]);

  return (
    <>
      <Source id={`${idPrefix}-hazards`} type="geojson" data={fc}>
        <Layer
          id={`${idPrefix}-hazard-heat`}
          type="heatmap"
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": 1.15,
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 18, 14, 30, 16, 45],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 16, 0.35],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(37,99,235,0)",
              0.25,
              "rgba(37,99,235,0.2)",
              0.45,
              "rgba(245,158,11,0.4)",
              0.7,
              "rgba(239,68,68,0.55)",
              1,
              "rgba(127,29,29,0.75)",
            ],
          }}
        />
        <Layer
          id={`${idPrefix}-hazard-coverage`}
          type="circle"
          paint={{
            "circle-color": [
              "match",
              ["get", "severity"],
              "critical",
              "#7F1D1D",
              "high",
              "#EF4444",
              "medium",
              "#F59E0B",
              "#3B82F6",
            ],
            "circle-opacity": 0.16,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              ["match", ["get", "severity"], "critical", 40, "high", 32, "medium", 24, 18],
              16,
              ["match", ["get", "severity"], "critical", 120, "high", 96, "medium", 72, 56],
            ],
          }}
        />

      </Source>
      
      {points && points.map((p, i) => {
        const lat = Number(p.latitude ?? p.lat);
        const lng = Number(p.longitude ?? p.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return (
          <TacticalMarker
            key={`hazard-point-${i}`}
            latitude={lat}
            longitude={lng}
            type={p.type || p.severity || 'hazard'}
          />
        );
      })}

      {areas && areas.length > 0 ? (
        <Source id={`${idPrefix}-hazard-areas`} type="geojson" data={areaFc}>
          <Layer
            id={`${idPrefix}-hazard-area-glow`}
            type="line"
            paint={{
              "line-color": [
                "match",
                ["get", "severity"],
                "critical",
                "#7F1D1D",
                "high",
                "#EF4444",
                "medium",
                "#60a5fa",
                "#60a5fa",
              ],
              "line-width": ["interpolate", ["linear"], ["zoom"], 11, 6, 16, 14],
              "line-opacity": 0.22,
              "line-blur": 2,
            }}
          />
          <Layer
            id={`${idPrefix}-hazard-area-fill`}
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "severity"],
                "critical",
                "#7F1D1D",
                "high",
                "#EF4444",
                "medium",
                "#2563EB",
                "#2563EB",
              ],
              "fill-opacity": 0.42,
            }}
          />
          <Layer
            id={`${idPrefix}-hazard-area-outline`}
            type="line"
            paint={{
              "line-color": [
                "match",
                ["get", "severity"],
                "critical",
                "#7F1D1D",
                "high",
                "#EF4444",
                "medium",
                "#60a5fa",
                "#60a5fa",
              ],
              "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1.5, 16, 2.5],
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id={`${idPrefix}-hazard-area-icon`}
            type="symbol"
            layout={{
              "text-field": [
                "match",
                ["get", "type"],
                "Flood", "🌊 Flood",
                "Fire", "🔥 Fire",
                "Landslide", "⛰️ Landslide",
                "Accident", "🚗 Accident",
                "Blocked Road", "🚧 Blocked",
                "Earthquake", "🌍 Earthquake",
                "⚠️ Hazard"
              ],
              "text-size": 14,
              "text-anchor": "center",
              "text-allow-overlap": false
            }}
            paint={{
              "text-color": "#ffffff",
              "text-halo-color": [
                "match",
                ["get", "severity"],
                "critical", "#7F1D1D",
                "high", "#EF4444",
                "medium", "#2563EB",
                "#2563EB"
              ],
              "text-halo-width": 2
            }}
          />
        </Source>
      ) : null}
    </>
  );
}
