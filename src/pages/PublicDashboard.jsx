import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { usePublicDisplay } from '@/contexts/PublicDisplayContext';
import Header from '@/components/Header';
import FlightSelectorPublic from '@/components/FlightSelectorPublic';
import StatusPanel from '@/components/StatusPanel';
import ChartsGrid from '@/components/ChartsGrid';
import MapSection from '@/components/MapSection';
import GyroscopeViewer from '@/components/GyroscopeViewer';
import MissionControl from '@/components/MissionControl';
import { generateMockData, parseDataFromFile } from '@/utils/mockData';
import { loadFlightData, getSavedFlights } from '@/lib/dbUnified';
import { calculateSpeedsAndDistance } from '@/utils/calculations';

function PublicDashboard() {
  const [currentFlight, setCurrentFlight] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [canSatStatus, setCanSatStatus] = useState({
    isActive: false,
    battery: 100,
    lastUpdate: new Date().toLocaleTimeString(),
    walkieChannel: 0,
  });
  const [savedFlights, setSavedFlights] = useState([]);
  const [modelUrl, setModelUrl] = useState('/cansat.obj');
  const [missionData, setMissionData] = useState({
    flightTime: 0,
    verticalSpeed: 0,
    horizontalSpeed: 0,
    distance: 0,
    events: [],
    checklist: {
      transmission: false,
      sensors: false,
      gps: false,
      recording: false,
    },
  });

  const { toast } = useToast();
  
  // Contexto de proyección pública
  const {
    publicDisplayState,
    getDisplayMode,
    getCurrentFlight,
    isLiveMode: isPublicLiveMode,
    getLiveData,
    getLiveUpdateCount
  } = usePublicDisplay();

  // Estado para forzar re-renders
  const [renderKey, setRenderKey] = useState(0);

  // Efecto para forzar re-render cada 500ms en modo live
  useEffect(() => {
    let interval;
    if (isPublicLiveMode()) {
      interval = setInterval(() => {
        setRenderKey(prev => prev + 1);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPublicLiveMode]);

  const addEvent = useCallback((message) => {
    setMissionData(prev => ({
      ...prev,
      events: [{ time: new Date().toLocaleTimeString(), message }, ...prev.events.slice(0, 100)]
    }));
  }, []);

  useEffect(() => {
    // Cargar vuelos guardados
    updateSavedFlights();
    addEvent('Dashboard público iniciado - Solo visualización.');
  }, [addEvent]);

  // Efecto para responder a eventos de actualización forzada
  useEffect(() => {
    const handleForceUpdate = () => {
      if (isPublicLiveMode()) {
        // Forzar re-render de todos los componentes
        setMissionData(prev => ({ ...prev }));
        setCanSatStatus(prev => ({ ...prev }));
      }
    };

    window.addEventListener('publicDataUpdate', handleForceUpdate);
    return () => window.removeEventListener('publicDataUpdate', handleForceUpdate);
  }, [isPublicLiveMode]);

  // Efecto para sincronizar con el estado de proyección pública
  useEffect(() => {
    const displayMode = getDisplayMode();
    
    if (displayMode === 'hidden') {
      // Ocultar todo
      setFlightData(null);
      setCurrentFlight(null);
      return;
    }
    
    if (displayMode === 'live' && isPublicLiveMode()) {
      // Mostrar datos en vivo desde admin
      const liveData = getLiveData();
      if (liveData) {
        setFlightData(liveData);
        setCurrentFlight(publicDisplayState.liveFlight);
        
        // Calcular velocidades y distancias en tiempo real
        if (liveData.coordinates && liveData.coordinates.length > 1) {
          const speeds = calculateSpeedsAndDistance(liveData.coordinates, liveData.timestamps);
          setMissionData(prev => ({
            ...prev,
            flightTime: speeds.flightTime,
            verticalSpeed: speeds.verticalSpeed,
            horizontalSpeed: speeds.horizontalSpeed,
            distance: speeds.distance,
          }));
        }
        
        // Actualizar estado del CanSat
        setCanSatStatus(prev => ({ 
          ...prev, 
          isActive: true, 
          battery: Math.max(20, 100 - (getLiveUpdateCount() * 0.1)), // Simular degradación
          walkieChannel: liveData.walkieChannel ? liveData.walkieChannel[liveData.walkieChannel.length - 1] : 0,
          lastUpdate: new Date().toLocaleTimeString()
        }));
        
        // Solo agregar evento la primera vez o cada 50 actualizaciones para evitar spam
        if (getLiveUpdateCount() % 50 === 1) {
          addEvent(`📡 Datos en vivo actualizados: ${publicDisplayState.liveFlight}`);
        }
      }
    } else if (displayMode === 'flights') {
      // Mostrar vuelo seleccionado por admin
      const projectedFlight = getCurrentFlight();
      if (projectedFlight && projectedFlight !== currentFlight) {
        handleFlightSelect(projectedFlight);
        addEvent(`Vuelo proyectado desde control: ${projectedFlight}`);
      }
    }
  }, [
    publicDisplayState, 
    getDisplayMode, 
    getCurrentFlight, 
    isPublicLiveMode, 
    getLiveData, 
    getLiveUpdateCount,
    addEvent, 
    currentFlight
  ]);

  const updateSavedFlights = async () => {
    const flights = await getSavedFlights();
    setSavedFlights(flights);
  };

  const handleFlightSelect = async (flightName) => {
    const data = await loadFlightData(flightName);
    if (data) {
      setCurrentFlight(flightName);
      setFlightData(data);
      setCanSatStatus({ 
        isActive: true, 
        battery: 100, 
        lastUpdate: new Date().toLocaleTimeString(), 
        walkieChannel: data.walkieChannel[data.walkieChannel.length - 1] 
      });
      
      // Calcular datos de misión
      const { verticalSpeed, horizontalSpeed, distance } = calculateSpeedsAndDistance(data);
      setMissionData(prev => ({
        ...prev,
        verticalSpeed,
        horizontalSpeed,
        distance,
        flightTime: data.timestamps.length * 2, // Aproximación basada en frecuencia
        checklist: { ...prev.checklist, sensors: true, gps: true }
      }));
      
      addEvent(`Vuelo cargado: ${flightName} (Solo lectura)`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Astra CanSat Dashboard - Vista Pública</title>
        <meta name="description" content="Dashboard público de telemetría CanSat del proyecto Astra - Solo visualización" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-900 retro-grid">
        <Header />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Mostrar selector solo si no está en modo oculto */}
          {getDisplayMode() !== 'hidden' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <FlightSelectorPublic 
                onFlightSelect={handleFlightSelect}
                currentFlight={currentFlight}
                savedFlights={savedFlights}
              />
            </motion.div>
          )}

          {/* Mostrar dashboard solo si hay datos y no está oculto */}
          {flightData && getDisplayMode() !== 'hidden' && (
            <>
              {/* Indicador de modo de proyección */}
              {(isPublicLiveMode() || getCurrentFlight()) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-center"
                >
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    isPublicLiveMode() 
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                      : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                      isPublicLiveMode() ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                    {isPublicLiveMode() 
                      ? (
                          <span className="flex items-center">
                            🔴 TRANSMISIÓN EN VIVO: {publicDisplayState.liveFlight}
                            <span className="ml-2 text-xs opacity-75">
                              (#{getLiveUpdateCount()})
                            </span>
                          </span>
                        )
                      : `📡 PROYECTANDO: ${currentFlight}`
                    }
                  </div>
                  
                  {/* Indicador de última actualización para modo live */}
                  {isPublicLiveMode() && publicDisplayState.lastUpdate && (
                    <div className="mt-2 text-xs text-gray-400">
                      Última actualización: {new Date(publicDisplayState.lastUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="grid lg:grid-cols-3 gap-8">
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                  <StatusPanel 
                    status={canSatStatus} 
                    isLiveMode={isPublicLiveMode()} 
                    key={`status-${isPublicLiveMode() ? `${getLiveUpdateCount()}-${renderKey}` : currentFlight}`}
                  />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                  <MissionControl 
                    missionData={missionData} 
                    key={`mission-${isPublicLiveMode() ? `${getLiveUpdateCount()}-${renderKey}` : currentFlight}`}
                  />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                <ChartsGrid 
                  data={flightData} 
                  key={`charts-${isPublicLiveMode() ? `${getLiveUpdateCount()}-${renderKey}` : currentFlight}`}
                />
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
                  <MapSection 
                    coordinates={flightData.coordinates} 
                    key={`map-${isPublicLiveMode() ? `${getLiveUpdateCount()}-${renderKey}` : currentFlight}`}
                  />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.8 }}>
                  <GyroscopeViewer 
                    gyroData={flightData.gyroscope[flightData.gyroscope.length - 1] || { x: 0, y: 0, z: 0 }}
                    modelUrl={modelUrl}
                    onModelUpload={setModelUrl}
                    currentFlight={currentFlight}
                    onRecordingStatusChange={() => {}} // Sin funcionalidad en modo público
                    isReadOnly={true}
                    key={`gyro-${isPublicLiveMode() ? `${getLiveUpdateCount()}-${renderKey}` : currentFlight}`}
                  />
                </motion.div>
              </div>
              
              {/* Indicador de modo público */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8 p-4 bg-amber-600/20 border border-amber-500/30 rounded-lg text-center"
              >
                <p className="text-amber-300 text-sm">
                  👁️ <strong>Modo de Visualización Pública</strong> - 
                  Para gestión completa de vuelos y telemetría en vivo, accede como administrador
                </p>
              </motion.div>
            </>
          )}

          {/* Mensaje cuando está en modo oculto */}
          {getDisplayMode() === 'hidden' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="glass-card rounded-xl p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">🙈</div>
                <h2 className="text-2xl font-bold text-white mb-4">Vista Oculta</h2>
                <p className="text-gray-300 mb-6">
                  La visualización pública está desactivada desde el panel de administración.
                </p>
                <p className="text-xs text-gray-400">
                  Esperando proyección desde control...
                </p>
              </div>
            </motion.div>
          )}

          {/* Mensaje cuando no hay datos pero no está oculto */}
          {!flightData && getDisplayMode() !== 'hidden' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="glass-card rounded-xl p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">🛰️</div>
                <h2 className="text-2xl font-bold text-white mb-4">Esperando Datos</h2>
                <p className="text-gray-300 mb-6">
                  Esperando que el administrador proyecte un vuelo o inicie transmisión en vivo.
                </p>
                <p className="text-xs text-gray-400">
                  Sistema listo para recepción...
                </p>
              </div>
            </motion.div>
          )}
        </main>

        <Toaster />
      </div>
    </>
  );
}

export default PublicDashboard;