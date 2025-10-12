import React, { createContext, useContext, useState, useEffect } from 'react';

const PublicDisplayContext = createContext();

export const usePublicDisplay = () => {
  const context = useContext(PublicDisplayContext);
  if (!context) {
    throw new Error('usePublicDisplay debe usarse dentro de PublicDisplayProvider');
  }
  return context;
};

export const PublicDisplayProvider = ({ children }) => {
  // Estado compartido entre admin y vista pública
  const [publicDisplayState, setPublicDisplayState] = useState({
    currentFlight: null,
    isLiveMode: false,
    liveFlight: null,
    sharedData: null,
    displayMode: 'flights', // 'flights', 'live', 'hidden'
    lastUpdate: null,
    liveUpdateCount: 0 // Para forzar re-renders
  });

  // Funciones para controlar desde admin
  const setPublicFlight = (flightName) => {
    setPublicDisplayState(prev => ({
      ...prev,
      currentFlight: flightName,
      displayMode: 'flights',
      isLiveMode: false,
      lastUpdate: new Date().toISOString(),
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  const startPublicLive = (liveFlight, liveData) => {
    setPublicDisplayState(prev => ({
      ...prev,
      isLiveMode: true,
      liveFlight: liveFlight,
      sharedData: liveData,
      displayMode: 'live',
      lastUpdate: new Date().toISOString(),
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  const stopPublicLive = () => {
    setPublicDisplayState(prev => ({
      ...prev,
      isLiveMode: false,
      liveFlight: null,
      displayMode: 'flights',
      lastUpdate: new Date().toISOString(),
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  const hidePublicDisplay = () => {
    setPublicDisplayState(prev => ({
      ...prev,
      displayMode: 'hidden',
      lastUpdate: new Date().toISOString(),
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  const updateLiveData = (newData) => {
    if (publicDisplayState.isLiveMode) {
      setPublicDisplayState(prev => ({
        ...prev,
        sharedData: newData,
        lastUpdate: new Date().toISOString(),
        liveUpdateCount: prev.liveUpdateCount + 1
      }));
      
      // Forzar re-render inmediato
      setTimeout(() => {
        setPublicDisplayState(current => ({
          ...current,
          liveUpdateCount: current.liveUpdateCount + 1
        }));
      }, 10);
    }
  };

  // Sistema de heartbeat para sincronizar estado
  const updateHeartbeat = () => {
    setPublicDisplayState(prev => ({
      ...prev,
      lastUpdate: new Date().toISOString(),
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  // Sistema de refresco automático para componentes
  const forceComponentUpdate = () => {
    setPublicDisplayState(prev => ({
      ...prev,
      liveUpdateCount: prev.liveUpdateCount + 1
    }));
  };

  // Persistir estado en localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('publicDisplayState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setPublicDisplayState(parsed);
      } catch (error) {
        console.error('Error loading public display state:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('publicDisplayState', JSON.stringify(publicDisplayState));
  }, [publicDisplayState]);

  const value = {
    // Estado
    publicDisplayState,
    
    // Getters
    getCurrentFlight: () => publicDisplayState.currentFlight,
    isLiveMode: () => publicDisplayState.isLiveMode,
    getLiveData: () => publicDisplayState.sharedData,
    getDisplayMode: () => publicDisplayState.displayMode,
    
    // Admin controls
    setPublicFlight,
    startPublicLive,
    stopPublicLive,
    hidePublicDisplay,
    updateLiveData,
    updateHeartbeat,
    forceComponentUpdate,
    
    // Status
    getLastUpdate: () => publicDisplayState.lastUpdate,
    getLiveUpdateCount: () => publicDisplayState.liveUpdateCount
  };

  return (
    <PublicDisplayContext.Provider value={value}>
      {children}
    </PublicDisplayContext.Provider>
  );
};

export default PublicDisplayContext;