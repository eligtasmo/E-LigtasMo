import React from 'react';
import { Marker } from 'react-map-gl';
import { 
  FaWater, 
  FaExclamationTriangle, 
  FaHome, 
  FaShieldAlt, 
  FaFire, 
  FaAmbulance, 
  FaCarCrash, 
  FaUserSecret, 
  FaHouseDamage,
  FaMapMarkerAlt
} from 'react-icons/fa';

interface TacticalMarkerProps {
  latitude: number;
  longitude: number;
  type: string;
  status?: string;
  onClick?: (e: any) => void;
  style?: React.CSSProperties;
  label?: string;
}

export default function TacticalMarker({ latitude, longitude, type, status, onClick, style, label }: TacticalMarkerProps) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let bgColor = '#EF4444';
  let icon = null;
  const t = (type || '').toLowerCase();

  if (t === 'flood') {
    bgColor = '#3B82F6';
    icon = <FaWater className="text-white text-[12px]" />;
  } else if (t === 'hazard') {
    bgColor = '#F59E0B';
    icon = <FaExclamationTriangle className="text-white text-[12px]" />;
  } else if (t === 'shelter') {
    bgColor = status === 'full' ? '#EF4444' : '#059669';
    icon = <FaShieldAlt className="text-white text-[12px]" />;
  } else if (t === 'barangay' || t === 'hall' || t === 'outpost') {
    bgColor = '#3B82F6';
    icon = <FaHome className="text-white text-[12px]" />;
  } else if (t === 'fire') {
    bgColor = '#EF4444';
    icon = <FaFire className="text-white text-[12px]" />;
  } else if (t === 'medical emergency' || t === 'medical') {
    bgColor = '#3B82F6';
    icon = <FaAmbulance className="text-white text-[12px]" />;
  } else if (t === 'road accident' || t === 'accident') {
    bgColor = '#F97316';
    icon = <FaCarCrash className="text-white text-[12px]" />;
  } else if (t === 'crime') {
    bgColor = '#111827';
    icon = <FaUserSecret className="text-white text-[12px]" />;
  } else if (t === 'structural collapse') {
    bgColor = '#78716C';
    icon = <FaHouseDamage className="text-white text-[12px]" />;
  } else {
    icon = <FaMapMarkerAlt className="text-white text-[12px]" />;
  }

  return (
    <Marker latitude={latitude} longitude={longitude} anchor="bottom" onClick={onClick}>
      <div 
        className="cursor-pointer transition-transform hover:scale-110 drop-shadow-md relative"
        style={style}
      >
        {label && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black px-2 py-1 rounded shadow-2xl border border-black/5 whitespace-nowrap animate-in zoom-in fade-in duration-300">
            <span className="text-[11px] font-semibold tracking-tight">{label}</span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-black/5" />
          </div>
        )}
        <div style={{
          background: bgColor,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
    </Marker>
  );
}
