import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Monitor, 
  Radio, 
  EyeOff, 
  Play, 
  Square, 
  Settings,
  Share2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicDisplay } from '@/contexts/PublicDisplayContext';

const PublicDisplayController = ({ 
  savedFlights, 
  isLiveMode, 
  liveFlight, 
  currentData,
  onStartPublicProjection,
  onStopPublicProjection,
  // AdminDashboard passes currentFlightId so we can include it in the projection payload
  currentFlightId
}) => {
  const {
    publicDisplayState,
    setPublicFlight,
    startPublicLive,
    stopPublicLive,
    hidePublicDisplay,
    updateLiveData,
    getDisplayMode
  } = usePublicDisplay();

  const [selectedFlight, setSelectedFlight] = useState(null);

  // Actualizar datos en vivo si están en modo live - SIN BUCLE INFINITO
  React.useEffect(() => {
    if (isLiveMode && currentData && publicDisplayState.isLiveMode) {
      updateLiveData(currentData);
    }
  }, [currentData, isLiveMode, publicDisplayState.isLiveMode]); // Removido updateLiveData para evitar bucle

  // Sistema de heartbeat para mantener sincronización - OPTIMIZADO
  React.useEffect(() => {
    let interval;
    if (publicDisplayState.isLiveMode && isLiveMode) {
      interval = setInterval(() => {
        if (currentData) {
          updateLiveData(currentData);
        }
      }, 1000); // Reducido a 1 segundo para evitar sobrecarga
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [publicDisplayState.isLiveMode, isLiveMode]); // Removido currentData y updateLiveData para evitar bucle

  // Forzar actualización de componentes cada segundo - OPTIMIZADO
  React.useEffect(() => {
    let forceUpdateInterval;
    if (publicDisplayState.isLiveMode) {
      forceUpdateInterval = setInterval(() => {
        // Trigger re-render de todos los componentes públicos
        window.dispatchEvent(new CustomEvent('publicDataUpdate', { 
          detail: { timestamp: Date.now() } 
        }));
      }, 2000); // Aumentado a 2 segundos para evitar sobrecarga
    }
    return () => {
      if (forceUpdateInterval) clearInterval(forceUpdateInterval);
    };
  }, [publicDisplayState.isLiveMode]);

  const handleProjectFlight = () => {
    if (selectedFlight) {
      setPublicFlight(selectedFlight);
      // Force write to localStorage so other tabs see the change immediately (include id if available)
      try {
        const prev = JSON.parse(localStorage.getItem('publicDisplayState') || '{}');
        const next = { ...prev, currentFlight: selectedFlight.name || null, currentFlightId: selectedFlight.id || null, displayMode: 'flights', lastUpdate: new Date().toISOString() };
        localStorage.setItem('publicDisplayState', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
    }
  };

  const handleProjectLive = () => {
    if (isLiveMode && liveFlight) {
      startPublicLive(liveFlight, currentData);
      // Notify public clients via admin-provided callback to emit socket event
      try {
        if (typeof onStartPublicProjection === 'function') {
          // Include flight id if available so public clients can join the exact room
          const payload = { mode: 'live', flightName: liveFlight, data: currentData };
          if (typeof currentFlightId !== 'undefined' && currentFlightId !== null) payload.flightId = currentFlightId;
          onStartPublicProjection(payload);
        }
      } catch (e) {
        console.warn('onStartPublicProjection callback error:', e);
      }
    }
  };

  const handleStopProjection = () => {
    stopPublicLive();
    try {
      if (typeof onStopPublicProjection === 'function') onStopPublicProjection();
    } catch (e) {
      console.warn('onStopPublicProjection callback error:', e);
    }
  };

  const handleHideDisplay = () => {
    hidePublicDisplay();
  };

  const displayMode = getDisplayMode();

  return (
    <div className="glass-card rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Monitor className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Control de Proyección Pública</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            displayMode === 'live' ? 'bg-green-400' :
            displayMode === 'flights' ? 'bg-blue-400' :
            'bg-red-400'
          }`}></div>
          <span className="text-sm text-gray-300">
            {displayMode === 'live' ? 'En Vivo' :
             displayMode === 'flights' ? 'Vuelo Estático' :
             'Oculto'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Proyectar Vuelo Guardado */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-400 flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Proyectar Vuelo Guardado
          </h3>
          <div className="space-y-3">
            <select
              value={selectedFlight ? (selectedFlight.id || selectedFlight.name) : ''}
              onChange={(e) => {
                const val = e.target.value;
                const found = (savedFlights || []).find(f => String(f.id) === val || f.name === val);
                setSelectedFlight(found || null);
              }}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Seleccionar vuelo...</option>
              {(savedFlights || []).map((flight) => (
                <option key={flight.id || flight.name} value={flight.id || flight.name}>
                  {flight.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleProjectFlight}
              disabled={!selectedFlight}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-2" />
              Proyectar en Vista Pública
            </Button>
          </div>
        </div>

        {/* Proyectar En Vivo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400 flex items-center">
            <Radio className="w-5 h-5 mr-2" />
            Proyectar En Vivo
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
              <p className="text-sm text-gray-300">
                Estado Live: <span className={isLiveMode ? 'text-green-400' : 'text-red-400'}>
                  {isLiveMode ? 'Activo' : 'Inactivo'}
                </span>
              </p>
              {liveFlight && (
                <p className="text-xs text-gray-400 mt-1">
                  Vuelo: {liveFlight}
                </p>
              )}
            </div>
            
            {isLiveMode ? (
              <Button
                onClick={handleProjectLive}
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={publicDisplayState.isLiveMode}
              >
                <Play className="w-4 h-4 mr-2" />
                {publicDisplayState.isLiveMode ? 'Proyectando En Vivo' : 'Iniciar Proyección Live'}
              </Button>
            ) : (
              <Button
                disabled
                className="w-full opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Live Mode Primero
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Controles de Estado */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={handleStopProjection}
          variant="outline"
          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
        >
          <Square className="w-4 h-4 mr-2" />
          Detener Proyección
        </Button>
        
        <Button
          onClick={handleHideDisplay}
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-600/20"
        >
          <EyeOff className="w-4 h-4 mr-2" />
          Ocultar Vista Pública
        </Button>
      </div>

      {/* Estado Actual de Proyección */}
      {publicDisplayState.lastUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg"
        >
          <h4 className="font-semibold text-purple-300 mb-2">Estado Actual de Proyección:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Modo:</span> 
              <span className="ml-2 text-white">
                {displayMode === 'live' ? '🔴 En Vivo' :
                 displayMode === 'flights' ? '📁 Vuelo Estático' :
                 '🙈 Oculto'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Última actualización:</span>
              <span className="ml-2 text-white">
                {new Date(publicDisplayState.lastUpdate).toLocaleTimeString()}
              </span>
            </div>
            {publicDisplayState.currentFlight && (
              <div className="col-span-2">
                <span className="text-gray-400">Vuelo proyectado:</span>
                <span className="ml-2 text-blue-300">{publicDisplayState.currentFlight}</span>
              </div>
            )}
            {publicDisplayState.liveFlight && (
              <div className="col-span-2">
                <span className="text-gray-400">Live proyectado:</span>
                <span className="ml-2 text-green-300">{publicDisplayState.liveFlight}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PublicDisplayController;