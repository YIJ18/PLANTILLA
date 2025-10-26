import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import io from 'socket.io-client';
import { Satellite } from 'lucide-react';

import AdminLayout from '@/components/auth/AdminLayout';
import FlightSelectorAdmin from '@/components/FlightSelectorAdmin';
import PublicDisplayController from '@/components/PublicDisplayController';
import StatusPanel from '@/components/StatusPanel';
import ChartsGrid from '@/components/ChartsGrid';
import MapSection from '@/components/MapSection';
import GyroscopeViewer from '@/components/GyroscopeViewer';
import MissionControl from '@/components/MissionControl';
import TelemetryDashboardExpanded from '@/components/TelemetryDashboardExpanded';
import { parseDataFromFile } from '@/utils/mockData';
import { calculateSpeedsAndDistance } from '@/utils/calculations';
import { getSavedFlights } from '@/lib/dbUnified';

const socket = io('http://localhost:5000');

// Helper para transformar datos de telemetría
const transformTelemetryData = (telemetryRecords) => {
  const initialState = {
    temperature: [],
    humidity: [],
    altitude: [],
    pressure: [],
    walkieChannel: [],
    accelerometer: [],
    gyroscope: [],
    coordinates: [],
    timestamps: [],
  };

  if (!telemetryRecords || telemetryRecords.length === 0) {
    return initialState;
  }

  return telemetryRecords.reduce((acc, record) => {
    // Ensure timestamp is valid; accept numeric ms or ISO string. Fallback to now.
    let tsVal = record.timestamp;
    if (typeof tsVal === 'string' && tsVal.trim() === '') tsVal = null;
    let dateObj = tsVal ? new Date(tsVal) : new Date();
    if (!dateObj || isNaN(dateObj.getTime())) dateObj = new Date();
    acc.timestamps.push(dateObj.toISOString());
    acc.temperature.push(record.temperature);
    acc.humidity.push(record.humidity);
    acc.altitude.push(record.altitude);
    acc.pressure.push(record.pressure);
    acc.walkieChannel.push(record.walkie_channel);
    acc.accelerometer.push({ x: record.acc_x, y: record.acc_y, z: record.acc_z });
    acc.gyroscope.push({ x: record.gyro_x, y: record.gyro_y, z: record.gyro_z });
    acc.coordinates.push({ lat: record.lat, lng: record.lng });
    return acc;
  }, initialState);
};


function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [currentFlight, setCurrentFlight] = useState(null);
  const [currentFlightId, setCurrentFlightId] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [savedFlights, setSavedFlights] = useState([]);
  
  const [canSatStatus, setCanSatStatus] = useState({
    isActive: false,
    battery: 100,
    lastUpdate: null,
    walkieChannel: 0,
  });
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

  // Efecto para manejar la conexión de Socket.IO y la recepción de datos en vivo
  useEffect(() => {
    if (isLiveMode) {
      const handleTelemetryUpdate = (newDataPoint) => {
        console.log("Live data received:", newDataPoint);
        addEvent(`Nuevo dato recibido: Altitud ${newDataPoint.altitude.toFixed(2)}m`);
        
        setFlightData(prevData => {
          const transformedNewData = transformTelemetryData([newDataPoint]);
          
          const updatedData = {
            temperature: [...(prevData?.temperature || []).slice(-99), ...transformedNewData.temperature],
            humidity: [...(prevData?.humidity || []).slice(-99), ...transformedNewData.humidity],
            altitude: [...(prevData?.altitude || []).slice(-99), ...transformedNewData.altitude],
            pressure: [...(prevData?.pressure || []).slice(-99), ...transformedNewData.pressure],
            walkieChannel: [...(prevData?.walkieChannel || []).slice(-99), ...transformedNewData.walkieChannel],
            accelerometer: [...(prevData?.accelerometer || []).slice(-99), ...transformedNewData.accelerometer],
            gyroscope: [...(prevData?.gyroscope || []).slice(-99), ...transformedNewData.gyroscope],
            coordinates: [...(prevData?.coordinates || []).slice(-99), ...transformedNewData.coordinates],
            timestamps: [...(prevData?.timestamps || []).slice(-99), ...transformedNewData.timestamps]
          };
          
          // Actualizar status y misión
          const { verticalSpeed, horizontalSpeed, distance } = calculateSpeedsAndDistance(updatedData);
          setMissionData(md => ({
            ...md,
            flightTime: md.flightTime + (md.lastTime ? (new Date() - md.lastTime)/1000 : 2),
            lastTime: new Date(),
            verticalSpeed,
            horizontalSpeed,
            distance,
            checklist: { ...md.checklist, transmission: true, sensors: true, gps: true }
          }));

          setCanSatStatus({
            isActive: true,
            battery: Math.max(0, canSatStatus.battery - 0.05), // Simular descarga lenta
            lastUpdate: new Date().toLocaleTimeString(),
            walkieChannel: newDataPoint.walkie_channel
          });

          return updatedData;
        });
      };

      socket.on('telemetry-update', handleTelemetryUpdate);
      addEvent("🔌 Conectado al stream de telemetría en vivo.");

      return () => {
        socket.off('telemetry-update', handleTelemetryUpdate);
        addEvent("🔌 Stream de telemetría desconectado.");
      };
    }
  }, [isLiveMode, addEvent, canSatStatus.battery]);

  // Cargar vuelos guardados para el panel de proyección pública
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const flights = await getSavedFlights();
        setSavedFlights(flights || []); // now array of {id,name}
      } catch (err) {
        console.warn('Error cargando saved flights:', err);
      }
    };
    loadSaved();
  }, []);


  const handleFlightSelect = async (flightArg, flightIdArg) => {
    // flightArg can be an object { id, name } or a string flightName. flightIdArg is optional legacy param
    const isObj = typeof flightArg === 'object' && flightArg !== null;
    const flightName = isObj ? (flightArg.name || `Flight ${flightArg.id}`) : flightArg;
    const flightId = isObj ? flightArg.id : flightIdArg;

    addEvent(`Cargando datos para el vuelo: ${flightName}`);
    setIsLiveMode(false);
    if (currentFlightId) {
      socket.emit('leave-flight-room', currentFlightId); // Salir de la sala anterior si la hubiera
    }

    if (!flightId) {
      console.warn('handleFlightSelect: no se proporcionó flightId. Abortando carga.');
      toast({ title: 'Vuelo no especificado', description: 'No se pudo determinar el ID del vuelo para cargar.' });
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/flights/${flightId}/telemetry`);
      if (response.ok) {
        const telemetryRecords = await response.json();
        const formattedData = transformTelemetryData(telemetryRecords);

        setFlightData(formattedData);
        setCurrentFlight(flightName);
        setCurrentFlightId(flightId);

        setCanSatStatus({ isActive: false, battery: 100, lastUpdate: new Date().toLocaleTimeString(), walkieChannel: formattedData.walkieChannel.slice(-1)[0] || 0 });
        addEvent(`✅ Vuelo histórico "${flightName}" cargado con ${telemetryRecords.length} registros.`);
        toast({
          title: "Vuelo Cargado",
          description: `Se cargaron ${telemetryRecords.length} puntos de datos para ${flightName}.`
        });
      } else {
        throw new Error('Error al cargar la telemetría del vuelo.');
      }
    } catch (error) {
      console.error("Error fetching historical flight data:", error);
      toast({
        title: "Error de Carga",
        description: "No se pudieron obtener los datos para el vuelo seleccionado.",
        variant: "destructive"
      });
      addEvent(`❌ Error al cargar el vuelo: ${flightName}`);
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
      const flightName = file.name.replace(/\.(txt|csv)$/, '');
      
      // Aquí se podría implementar un endpoint para subir archivos CSV al backend
      addEvent(`Nuevo vuelo importado (localmente): ${flightName}`);
      toast({
        title: "Funcionalidad en Desarrollo",
        description: "La importación de archivos se procesa localmente por ahora.",
      });

      setFlightData(data);
      setCurrentFlight(flightName);
      setIsLiveMode(false);
    };
    reader.readAsText(file);
  };

  const handleLiveMode = (flightName, flightId) => {
    setCurrentFlight(flightName);
    setCurrentFlightId(flightId);
    setFlightData(null); // Limpiar datos anteriores
    setIsLiveMode(true);
    
    // Unirse a la sala de Socket.IO para este vuelo
    socket.emit('join-flight-room', flightId);

    setCanSatStatus(prev => ({ ...prev, isActive: true, battery: 100 }));
    setMissionData(prev => ({ ...prev, flightTime: 0, events: [], distance: 0, lastTime: new Date() }));
    addEvent(`🔴 MODO EN VIVO ACTIVADO para: ${flightName}`);
  };

  const stopLiveMode = () => {
    setIsLiveMode(false);
    socket.emit('leave-flight-room', currentFlightId);
    setCanSatStatus(prev => ({ ...prev, isActive: false }));
    setMissionData(prev => ({ ...prev, checklist: { ...prev.checklist, transmission: false } }));
    addEvent(`🛑 MODO EN VIVO DETENIDO para: ${currentFlight}`);
  };

  const handleExport = async () => {
    if (!currentFlightId) {
      toast({ title: 'Exportación', description: 'Selecciona primero un vuelo para exportar.', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Exportación', description: `Generando paquete para ${currentFlight || currentFlightId}...` });
      // Call backend export endpoint which returns a ZIP of CSV files for the flight
      const resp = await fetch(`/api/export/all-csv?flightId=${encodeURIComponent(currentFlightId)}`);
      if (!resp.ok) throw new Error(`Export failed: ${resp.statusText}`);

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `flight_${currentFlightId}_export_${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      addEvent(`Paquete de vuelo exportado: ${currentFlight || currentFlightId}`);
      toast({ title: 'Exportación', description: `Paquete generado: ${filename}` });
    } catch (error) {
      console.error('Export error', error);
      toast({ title: 'Error de exportación', description: error.message || 'No fue posible generar el paquete.', variant: 'destructive' });
      addEvent(`❌ Error exportando vuelo: ${error.message || error}`);
    }
  };

  const handleRecordingStatus = (isRecording) => {
    setMissionData(prev => ({ ...prev, checklist: { ...prev.checklist, recording: isRecording } }));
    addEvent(isRecording ? 'Grabación 3D iniciada.' : 'Grabación 3D detenida.');
  };

  return (
    <>
      <Helmet>
        <title>Astra CanSat Dashboard - Panel de Administración</title>
        <meta name="description" content="Panel de administración completo para gestión de CanSat del proyecto Astra" />
      </Helmet>
      
      <AdminLayout>
        <main className="container mx-auto px-4 py-8 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <FlightSelectorAdmin 
              onFlightSelect={handleFlightSelect}
              onFileUpload={handleFileUpload}
              onLiveMode={handleLiveMode}
              onStopLive={stopLiveMode}
              onExport={handleExport}
              currentFlight={currentFlight}
              isLiveMode={isLiveMode}
            />
          </motion.div>

          {/* Control de Proyección Pública */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <PublicDisplayController
              isLiveMode={isLiveMode}
              liveFlight={currentFlight}
              currentFlightId={currentFlightId}
              currentData={flightData}
              savedFlights={savedFlights}
              onStartPublicProjection={(payload) => {
                // payload: { mode: 'live'|'flight', flightId?, flightName?, data? }
                try {
                  console.info('[AdminDashboard] Emitting public-projection-start', payload);
                  socket.emit('public-projection-start', payload);
                  addEvent('🔊 Public projection started (announced to public clients)');
                } catch (e) {
                  console.warn('Failed to emit public-projection-start:', e);
                }
              }}
              onStopPublicProjection={() => {
                try {
                  console.info('[AdminDashboard] Emitting public-projection-stop');
                  socket.emit('public-projection-stop', {});
                  addEvent('🔈 Public projection stopped (announced to public clients)');
                } catch (e) {
                  console.warn('Failed to emit public-projection-stop:', e);
                }
              }}
            />
          </motion.div>

          {flightData ? (
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
                    isReadOnly={false}
                  />
                </motion.div>
              </div>

              {/* Dashboard de telemetría COM5 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }}>
                <TelemetryDashboardExpanded />
              </motion.div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Satellite className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold text-white">Seleccione un Vuelo</h3>
              <p>Elija un vuelo de la lista de "Vuelos Guardados" para ver su telemetría, o inicie un nuevo "Vuelo en Vivo".</p>
            </div>
          )}
        </main>

        <Toaster />
      </AdminLayout>
    </>
  );
}

export default AdminDashboard;