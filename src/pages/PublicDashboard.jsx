import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import FlightSelectorPublic from '@/components/FlightSelectorPublic';
import StatusPanel from '@/components/StatusPanel';
import ChartsGrid from '@/components/ChartsGrid';
import MapSection from '@/components/MapSection';
import GyroscopeViewer from '@/components/GyroscopeViewer';
import MissionControl from '@/components/MissionControl';
import { generateMockData, parseDataFromFile } from '@/utils/mockData';
import { loadFlightData, getSavedFlights } from '@/lib/db';
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

  const addEvent = useCallback((message) => {
    setMissionData(prev => ({
      ...prev,
      events: [{ time: new Date().toLocaleTimeString(), message }, ...prev.events.slice(0, 100)]
    }));
  }, []);

  useEffect(() => {
    // Cargar demo data inicial
    const mockData = generateMockData();
    setFlightData(mockData);
    setCurrentFlight('Demo Flight');
    setCanSatStatus(prev => ({ 
      ...prev, 
      isActive: true, 
      battery: 85, 
      walkieChannel: mockData.walkieChannel[mockData.walkieChannel.length - 1] 
    }));
    updateSavedFlights();
    addEvent('Dashboard público iniciado - Solo visualización.');
  }, [addEvent]);

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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <FlightSelectorPublic 
              onFlightSelect={handleFlightSelect}
              currentFlight={currentFlight}
              savedFlights={savedFlights}
            />
          </motion.div>

          {flightData && (
            <>
              <div className="grid lg:grid-cols-3 gap-8">
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                  <StatusPanel status={canSatStatus} isLiveMode={false} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                  <MissionControl missionData={missionData} />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                <ChartsGrid data={flightData} />
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.6 }}>
                  <MapSection coordinates={flightData.coordinates} />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.8 }}>
                  <GyroscopeViewer 
                    gyroData={flightData.gyroscope[flightData.gyroscope.length - 1] || { x: 0, y: 0, z: 0 }}
                    modelUrl={modelUrl}
                    onModelUpload={setModelUrl}
                    currentFlight={currentFlight}
                    onRecordingStatusChange={() => {}} // Sin funcionalidad en modo público
                    isReadOnly={true}
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
        </main>

        <Toaster />
      </div>
    </>
  );
}

export default PublicDashboard;