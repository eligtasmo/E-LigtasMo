import React, { useId } from "react";

export default function Pin3D({
  color = "#2563eb",
  size = 34,
  icon,
  label,
}: {
  color?: string;
  size?: number;
  icon: React.ReactNode;
  label?: string;
}) {
  const uid = useId();
  const w = size;
  const h = Math.round(size * 1.25);
  const circle = Math.round(size * 0.56);
  const iconSize = Math.round(circle * 0.55);
  const gradId = `pinGrad-${uid}`;
  const shineId = `pinShine-${uid}`;
  const rimId = `pinRim-${uid}`;

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <div
        className="absolute left-1/2 bottom-1 -translate-x-1/2"
        style={{
          width: Math.round(w * 0.72),
          height: Math.max(8, Math.round(w * 0.22)),
          backgroundColor: "rgba(0,0,0,0.28)",
          borderRadius: 999,
          filter: "blur(6px)",
          transform: "translateX(-50%) skewX(-12deg) scaleY(0.55)",
        }}
      />
      <svg
        width={w}
        height={h}
        viewBox="0 0 64 80"
        className="block"
        style={{ filter: "drop-shadow(0 14px 16px rgba(0,0,0,0.42))" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.78" />
          </linearGradient>
          <radialGradient id={shineId} cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path
          d="M34 4C21.8 4 12 14 12 26c0 16.2 15.5 30.9 19.4 34.2.9.8 2.9.8 3.8 0C39.1 56.9 54 42.2 54 26 54 14 46.2 4 34 4z"
          fill="rgba(0,0,0,0.22)"
          opacity="0.6"
        />
        <path
          d="M32 2C20 2 10 12 10 24c0 18.2 18.7 34.6 20.6 36.2.8.7 2 .7 2.8 0C35.3 58.6 54 42.2 54 24 54 12 44 2 32 2z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M32 2C20 2 10 12 10 24c0 18.2 18.7 34.6 20.6 36.2.8.7 2 .7 2.8 0C35.3 58.6 54 42.2 54 24 54 12 44 2 32 2z"
          fill={`url(#${shineId})`}
        />
        <path
          d="M32 2C20 2 10 12 10 24c0 18.2 18.7 34.6 20.6 36.2.8.7 2 .7 2.8 0C35.3 58.6 54 42.2 54 24 54 12 44 2 32 2z"
          fill="none"
          stroke={`url(#${rimId})`}
          strokeWidth="2.2"
          opacity="0.9"
        />
        <circle cx="32" cy="24" r="16.2" fill="#ffffff" fillOpacity="0.95" />
        <circle cx="32" cy="24" r="16.2" stroke="rgba(0,0,0,0.12)" strokeWidth="1.6" fill="none" />
        <circle cx="32" cy="24" r="15.2" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.6" fill="none" />
      </svg>

      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          top: "30%",
          width: circle,
          height: circle,
          color,
        }}
      >
        <div
          style={{ width: iconSize, height: iconSize }}
          className="grid place-items-center"
        >
          {icon}
        </div>
      </div>

      {label ? (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white/90 px-2 py-0.5 text-[10px] font-bold text-gray-800 shadow-sm backdrop-blur">
          {label}
        </div>
      ) : null}
    </div>
  );
}
