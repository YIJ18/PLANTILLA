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
    currentFlightId: null,
    isLiveMode: false,
    liveFlight: null,
    sharedData: null,
    displayMode: 'flights', // 'flights', 'live', 'hidden'
    lastUpdate: null,
    liveUpdateCount: 0 // Para forzar re-renders
  });

  // Funciones para controlar desde admin
  const setPublicFlight = (flight) => {
    // flight can be either a string name or an object { id, name }
    const name = typeof flight === 'string' ? flight : (flight?.name || null);
    const id = typeof flight === 'object' && flight?.id ? flight.id : (typeof flight === 'string' ? null : null);
    setPublicDisplayState(prev => ({
      ...prev,
      currentFlight: name,
      currentFlightId: id,
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

  // Listen for storage events so other tabs/windows update when admin changes projection
  useEffect(() => {
    const handleStorage = (e) => {
      if (!e) return;
      if (e.key !== 'publicDisplayState') return;
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        // Only update if different
        setPublicDisplayState(prev => {
          try {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(parsed);
            if (prevStr === newStr) return prev;
          } catch (err) {
            // fallback to always update
          }
          return parsed;
        });
      } catch (err) {
        console.warn('Invalid publicDisplayState in storage event:', err);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem('publicDisplayState', JSON.stringify(publicDisplayState));
  }, [publicDisplayState]);

  const value = {
    // Estado
    publicDisplayState,
    
    // Getters
  getCurrentFlight: () => publicDisplayState.currentFlight,
  getCurrentFlightId: () => publicDisplayState.currentFlightId,
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