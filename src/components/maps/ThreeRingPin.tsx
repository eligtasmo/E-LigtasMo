import React from "react";

export default function ThreeRingPin({
  color = "#2563eb",
  size = 26,
}: {
  color?: string;
  size?: number;
}) {
  const core = Math.max(10, Math.floor(size * 0.42));
  const ring1 = Math.max(16, Math.floor(size * 0.7));
  const ring2 = Math.max(22, Math.floor(size * 0.95));
  return (
    <div className="relative" style={{ width: ring2, height: ring2 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color, opacity: 0.18, filter: "blur(0.5px)" }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full border-2"
        style={{
          width: ring2,
          height: ring2,
          transform: "translate(-50%, -50%)",
          borderColor: color,
          opacity: 0.35,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full border-2 bg-white"
        style={{
          width: ring1,
          height: ring1,
          transform: "translate(-50%, -50%)",
          borderColor: color,
          opacity: 0.9,
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: core,
          height: core,
          transform: "translate(-50%, -50%)",
          backgroundColor: color,
          boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}

