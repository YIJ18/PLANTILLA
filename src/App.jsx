import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import FlightSelector from '@/components/FlightSelector';
import StatusPanel from '@/components/StatusPanel';
import ChartsGrid from '@/components/ChartsGrid';
import MapSection from '@/components/MapSection';
import GyroscopeViewer from '@/components/GyroscopeViewer';
import MissionControl from '@/components/MissionControl';
import { generateMockData, parseDataFromFile } from '@/utils/mockData';
import { saveFlightData, loadFlightData, getSavedFlights, exportFlightPackage } from '@/lib/dbUnified';
import { calculateSpeedsAndDistance } from '@/utils/calculations';

function App() {
  const [currentFlight, setCurrentFlight] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
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
  const [lastGpsTime, setLastGpsTime] = useState(null);

  const { toast } = useToast();

  const addEvent = useCallback((message) => {
    setMissionData(prev => ({
      ...prev,
      events: [{ time: new Date().toLocaleTimeString(), message }, ...prev.events.slice(0, 100)]
    }));
  }, []);

  const checkAlerts = useCallback((data, status) => {
    if (!data || !status) return;

    const lastTemp = data.temperature[data.temperature.length - 1];
    if (lastTemp === 0) {
      toast({ title: 'Alerta de Sensor', description: 'Fallo detectado en el sensor de temperatura (valor 0).', variant: 'destructive' });
      addEvent('Alerta: Fallo en sensor de temperatura.');
    }

    if (status.battery < 20 && status.battery > 19.9) { // Fire once
      toast({ title: 'Alerta de Batería', description: 'Nivel de batería crítico, por debajo del 20%.', variant: 'destructive' });
      addEvent('Alerta: Batería crítica.');
    }

    if (lastGpsTime && (Date.now() - lastGpsTime > 10000)) {
      toast({ title: 'Alerta de GPS', description: 'Pérdida de señal GPS (sin actualización en 10s).', variant: 'destructive' });
      addEvent('Alerta: Pérdida de señal GPS.');
      setLastGpsTime(null); // Prevent re-firing
    }
  }, [toast, addEvent, lastGpsTime]);

  useEffect(() => {
    const mockData = generateMockData();
    setFlightData(mockData);
    setCurrentFlight('Demo Flight');
    setCanSatStatus(prev => ({ ...prev, isActive: true, battery: 85, walkieChannel: mockData.walkieChannel[mockData.walkieChannel.length - 1] }));
    updateSavedFlights();
    addEvent('Dashboard iniciado en modo de demostración.');
  }, [addEvent]);

  const updateSavedFlights = async () => {
    const flights = await getSavedFlights();
    setSavedFlights(flights);
  };

  useEffect(() => {
    let interval;
    if (isLiveMode && flightData) {
      interval = setInterval(() => {
        const newData = generateMockData(1);
        setFlightData(prev => {
          if (!prev) return newData;
          const updatedData = {
            temperature: [...prev.temperature.slice(-49), ...newData.temperature],
            humidity: [...prev.humidity.slice(-49), ...newData.humidity],
            altitude: [...prev.altitude.slice(-49), ...newData.altitude],
            pressure: [...prev.pressure.slice(-49), ...newData.pressure],
            walkieChannel: [...prev.walkieChannel.slice(-49), ...newData.walkieChannel],
            accelerometer: [...prev.accelerometer.slice(-49), ...newData.accelerometer],
            gyroscope: [...prev.gyroscope.slice(-49), ...newData.gyroscope],
            coordinates: [...prev.coordinates.slice(-49), ...newData.coordinates],
            timestamps: [...prev.timestamps.slice(-49), ...newData.timestamps]
          };
          if (currentFlight) {
            saveFlightData(currentFlight, updatedData);
          }
          
          const { verticalSpeed, horizontalSpeed, distance } = calculateSpeedsAndDistance(updatedData);
          setMissionData(md => ({
            ...md,
            flightTime: md.flightTime + 2,
            verticalSpeed,
            horizontalSpeed,
            distance,
            checklist: { ...md.checklist, transmission: true, sensors: true, gps: true }
          }));
          setLastGpsTime(Date.now());

          const newStatus = {
            isActive: true,
            battery: Math.max(0, canSatStatus.battery - 0.1),
            lastUpdate: new Date().toLocaleTimeString(),
            walkieChannel: newData.walkieChannel[0]
          };
          setCanSatStatus(newStatus);
          checkAlerts(updatedData, newStatus);

          return updatedData;
        });
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLiveMode, flightData, currentFlight, canSatStatus.battery, checkAlerts]);

  const handleFlightSelect = async (flightName) => {
    const data = await loadFlightData(flightName);
    if (data) {
      setCurrentFlight(flightName);
      setFlightData(data);
      setIsLiveMode(false);
      setCanSatStatus({ isActive: true, battery: 100, lastUpdate: new Date().toLocaleTimeString(), walkieChannel: data.walkieChannel[data.walkieChannel.length - 1] });
      addEvent(`Vuelo cargado: ${flightName}`);
    }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      const { data, errors } = parseDataFromFile(content);
      if (errors.length > 0) {
        toast({ title: "Error de parseo", description: errors.join(' '), variant: "destructive" });
      }
      const flightName = file.name.replace('.txt', '');
      await saveFlightData(flightName, data);
      setFlightData(data);
      setCurrentFlight(flightName);
      setIsLiveMode(false);
      updateSavedFlights();
      addEvent(`Nuevo vuelo importado: ${flightName}`);
    };
    reader.readAsText(file);
  };

  const handleLiveMode = async (fileName) => {
    const newFlightData = generateMockData(1);
    await saveFlightData(fileName, newFlightData);
    setCurrentFlight(fileName);
    setFlightData(newFlightData);
    setIsLiveMode(true);
    setCanSatStatus(prev => ({ ...prev, isActive: true, battery: 100, walkieChannel: newFlightData.walkieChannel[0] }));
    setMissionData(prev => ({ ...prev, flightTime: 0, events: [], distance: 0 }));
    updateSavedFlights();
    addEvent(`Modo en vivo iniciado: ${fileName}`);
  };

  const stopLiveMode = () => {
    setIsLiveMode(false);
    addEvent('Modo en vivo detenido.');
    setMissionData(prev => ({ ...prev, checklist: { ...prev.checklist, transmission: false } }));
  };

  const handleExport = async () => {
    if (currentFlight && flightData) {
      await exportFlightPackage(currentFlight, flightData);
      addEvent(`Paquete de vuelo exportado: ${currentFlight}`);
    }
  };

  const handleRecordingStatus = (isRecording) => {
    setMissionData(prev => ({ ...prev, checklist: { ...prev.checklist, recording: isRecording } }));
    addEvent(isRecording ? 'Grabación 3D iniciada.' : 'Grabación 3D detenida.');
  };

  return (
    <>
      <Helmet>
        <title>Astra CanSat Dashboard - Estación de Misión</title>
        <meta name="description" content="Dashboard profesional para monitoreo de CanSat del proyecto Astra con gráficas interactivas, mapas y visualización 3D" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-900 retro-grid">
        <Header />
        
        <main className="container mx-auto px-4 py-8 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <FlightSelector 
              onFlightSelect={handleFlightSelect}
              onFileUpload={handleFileUpload}
              onLiveMode={handleLiveMode}
              onStopLive={stopLiveMode}
              onExport={handleExport}
              currentFlight={currentFlight}
              isLiveMode={isLiveMode}
              savedFlights={savedFlights}
            />
          </motion.div>

          {flightData && (
            <>
              <div className="grid lg:grid-cols-3 gap-8">
                <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                  <StatusPanel status={canSatStatus} isLiveMode={isLiveMode} />
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
                    onRecordingStatusChange={handleRecordingStatus}
                  />
                </motion.div>
              </div>
            </>
          )}
        </main>

        <Toaster />
      </div>
    </>
  );
}

export default App;