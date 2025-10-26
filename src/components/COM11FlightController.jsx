import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, 
  Play, 
  Square, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// Eliminamos las importaciones de dbUnified, ya que ahora todo se maneja en el backend
// import { startLiveFlight, stopLiveFlight } from '@/lib/dbUnified';

const API_URL = 'http://localhost:5000/api'; // URL del backend de Node.js

const COM11FlightController = ({ onFlightStart, onFlightStop, onDataUpdate, flightName }) => {
  const [isFlightActive, setIsFlightActive] = useState(false);
  const [serialStatus, setSerialStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [flightData, setFlightData] = useState(null);
  const [lastDataTime, setLastDataTime] = useState(null);
  // Ya no manejamos el proceso serial en el frontend
  // const [serialProcess, setSerialProcess] = useState(null);
  const [availablePorts, setAvailablePorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('COM5');
  const [loadingPorts, setLoadingPorts] = useState(false);

  // Cargar lista de puertos disponibles (ahora desde el backend de Node)
  const loadPorts = async () => {
    // Esta función necesitará un endpoint en el backend que liste los puertos
    // Por ahora, la dejamos como está, pero apuntando al nuevo backend si es necesario
    try {
      setLoadingPorts(true);
      // Asumimos que el backend de Python sigue corriendo para esta funcionalidad,
      // o que implementamos un endpoint similar en Node.
  const resp = await fetch('http://127.0.0.1:5000/api/test/serial');
      if (!resp.ok) throw new Error('No se pudo obtener la lista de puertos');
      const data = await resp.json();
      const list = Array.isArray(data.available_ports) ? data.available_ports : [];
  setAvailablePorts(list);
  if (list.includes('COM5')) setSelectedPort('COM5');
      else if (list.length > 0) setSelectedPort(list[0]);
    } catch (e) {
      console.error('Error cargando puertos:', e);
    } finally {
      setLoadingPorts(false);
    }
  };

  useEffect(() => {
    loadPorts();
  }, []);

  // Función para iniciar el vuelo
  const handleStartFlight = async () => {
    if (!flightName || flightName.trim() === '') {
      console.error('❌ No hay nombre de vuelo disponible');
      setSerialStatus('error');
      return;
    }
    
    setSerialStatus('connecting');
    console.log(`🚀 Iniciando vuelo: ${flightName}`);
    
    try {
      const response = await fetch(`${API_URL}/flights/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flightName, port: selectedPort, baudRate: 115200 }),
      });

      const result = await response.json();

      if (response.ok) {
        setFlightData({ 
          id: result.flightId, 
          name: result.flightName || flightName,
          start_time: new Date().toISOString()
        });
        setIsFlightActive(true);
        setSerialStatus('connected');
        
        if (onFlightStart) {
          onFlightStart({ 
            id: result.flightId, 
            name: result.flightName || flightName,
            start_time: new Date().toISOString()
          });
        }
        console.log(`✅ Vuelo iniciado exitosamente: ${result.message}`);
      } else {
        throw new Error(result.message || 'Error desconocido en el servidor');
      }
      
    } catch (error) {
      console.error('❌ Error iniciando vuelo:', error);
      setSerialStatus('error');
      setIsFlightActive(false);
    }
  };

  // Función para detener el vuelo
  const handleStopFlight = async () => {
    try {
      const response = await fetch(`${API_URL}/flights/stop`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setIsFlightActive(false);
        setSerialStatus('disconnected');
        setFlightData(null);
        setLastDataTime(null);
        
        if (onFlightStop) {
          onFlightStop();
        }
        console.log('🛑 Vuelo detenido:', result.message);
      } else {
        throw new Error(result.message || 'Error al detener el vuelo');
      }
    } catch (error) {
      console.error('❌ Error deteniendo vuelo:', error);
    }
  };

  // La monitorización de datos ahora se hará con Socket.IO
  useEffect(() => {
    // Importar socket.io-client dinámicamente o tenerlo como dependencia
    const { io } = require("socket.io-client");
    const socket = io("http://localhost:5000");

    socket.on('connect', () => {
      console.log('🔌 Conectado al servidor de Socket.IO');
    });

    socket.on('telemetry-update', (data) => {
      if (isFlightActive) {
        setLastDataTime(new Date());
        if (onDataUpdate) {
          onDataUpdate(data);
        }
      }
    });

    socket.on('flight-status', (status) => {
      console.log('ℹ️ Estado del vuelo:', status.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isFlightActive, onDataUpdate]);


  // El chequeo de salud ya no es tan necesario si Socket.IO maneja la conexión
  // Se podría mantener un endpoint de health check si se desea
  useEffect(() => {
    let healthCheck;
    if (isFlightActive) {
      healthCheck = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/health`);
          if (!response.ok) {
            setSerialStatus('error');
            console.warn('⚠️ El backend no responde');
          }
        } catch (error) {
          setSerialStatus('error');
        }
      }, 5000);
    }

    return () => {
      if (healthCheck) clearInterval(healthCheck);
    };
  }, [isFlightActive]);

  const getStatusIcon = () => {
// ... (código sin cambios)
    switch (serialStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-400" />;
      case 'connecting':
        return <Radio className="w-5 h-5 text-yellow-400 animate-pulse" />;
      case 'error':
        return <WifiOff className="w-5 h-5 text-red-400" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
// ... (código sin cambios)
    switch (serialStatus) {
      case 'connected':
        return `Conectado a ${selectedPort}`;
      case 'connecting':
        return `Conectando a ${selectedPort}...`;
      case 'error':
        return 'Error de conexión';
      default:
        return 'Desconectado';
    }
  };

  const getStatusColor = () => {
// ... (código sin cambios)
    switch (serialStatus) {
      case 'connected':
        return 'border-green-500 bg-green-500/10';
      case 'connecting':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'error':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={`glass-card rounded-xl p-6 mb-6 border-2 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <h2 className="text-2xl font-bold text-white">Control de Vuelo</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            serialStatus === 'connected' ? 'bg-green-400 animate-pulse' :
            serialStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            serialStatus === 'error' ? 'bg-red-400' :
            'bg-gray-400'
          }`}></div>
          <span className="text-sm text-gray-300">
            {getStatusText()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Selector de Puerto (se mantiene por si se quiere hacer dinámico) */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1">Puerto Serie</label>
            {availablePorts.length > 0 ? (
              <select
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={serialStatus === 'connected' || serialStatus === 'connecting'}
              >
                {availablePorts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            ) : (
                <input
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                placeholder="Ej: COM5"
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={serialStatus === 'connected' || serialStatus === 'connecting'}
              />
            )}
          </div>
          <Button
            onClick={loadPorts}
            disabled={loadingPorts || serialStatus === 'connecting'}
            className="mt-6"
            variant="secondary"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingPorts ? 'animate-spin' : ''}`} />
            {loadingPorts ? 'Buscando...' : 'Refrescar'}
          </Button>
        </div>

        {/* Estado del vuelo */}
        {flightData && (
// ... (código sin cambios)
          <div className="p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg">
            <h3 className="font-semibold text-blue-300 mb-2">Vuelo Activo:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Nombre:</span>
                <span className="ml-2 text-white">{flightData.name}</span>
              </div>
              <div>
                <span className="text-gray-400">ID:</span>
                <span className="ml-2 text-white">{flightData.id}</span>
              </div>
              <div>
                <span className="text-gray-400">Inicio:</span>
                <span className="ml-2 text-white">
                  {flightData.start_time ? new Date(flightData.start_time).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              {lastDataTime && (
                <div>
                  <span className="text-gray-400">Último dato:</span>
                  <span className="ml-2 text-white">{lastDataTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controles principales */}
        <div className="flex space-x-4">
          {!isFlightActive ? (
            <Button
              onClick={handleStartFlight}
              disabled={serialStatus === 'connecting' || !flightName || flightName.trim() === ''}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              {serialStatus === 'connecting' ? 'Iniciando...' : 
               !flightName || flightName.trim() === '' ? 'Esperando nombre de vuelo...' :
               'Iniciar Vuelo'}
            </Button>
          ) : (
            <Button
              onClick={handleStopFlight}
              className="flex-1 bg-red-600 hover:bg-red-700"
              size="lg"
            >
              <Square className="w-4 h-4 mr-2" />
              Detener Vuelo
            </Button>
          )}
        </div>

        {/* Información adicional */}
        <div className="p-3 bg-gray-800/50 border border-gray-600 rounded-lg">
// ... (código sin cambios)
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-300">
              <p className="font-medium text-blue-300 mb-1">Instrucciones:</p>
              <ul className="space-y-1">
                <li>• Asegúrate de que tu dispositivo esté conectado al puerto correcto.</li>
                <li>• El vuelo se guardará automáticamente en la base de datos.</li>
                <li>• Los datos se mostrarán en tiempo real.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COM11FlightController;
