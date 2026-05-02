import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface MapContextType {
  viewport: ViewportState;
  setViewport: (vp: ViewportState) => void;
  updateViewport: (vp: Partial<ViewportState>) => void;
}

const defaultViewport: ViewportState = {
  longitude: 121.410,
  latitude: 14.275,
  zoom: 12,
  pitch: 45,
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
