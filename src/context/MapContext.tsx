import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_MAP_STATE } from '../constants/geo';

interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface MapContextType {
  viewport: ViewportState;
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>;
  updateViewport: (vp: Partial<ViewportState>) => void;
}

const defaultViewport: ViewportState = {
  longitude: DEFAULT_MAP_STATE.longitude,
  latitude: DEFAULT_MAP_STATE.latitude,
  zoom: DEFAULT_MAP_STATE.zoom,
  pitch: 0,
  bearing: 0
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewport, setViewport] = useState<ViewportState>(defaultViewport);

  const updateViewport = (vp: Partial<ViewportState>) => {
    setViewport(prev => ({ ...prev, ...vp }));
  };

  return (
    <MapContext.Provider value={{ viewport, setViewport, updateViewport }}>
      {children}
    </MapContext.Provider>
  );
};

export const useGlobalMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useGlobalMapContext must be used within a MapProvider');
  }
  return context;
};
