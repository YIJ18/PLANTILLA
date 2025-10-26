import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, FileText, Satellite, Square, Download, Trash2, Shield, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const FlightSelectorAdmin = ({ onFlightSelect, onFileUpload, onLiveMode, onStopLive, onExport, currentFlight, isLiveMode }) => {
  const [fileName, setFileName] = useState('');
  const [flights, setFlights] = useState([]);
  const { toast } = useToast();

  const fetchFlights = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/flights');
      if (response.ok) {
        const data = await response.json();
        setFlights(data);
      } else {
        console.error("Error fetching flights from backend");
        toast({
          title: "Error de Red",
          description: "No se pudo obtener la lista de vuelos del servidor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching flights:', error);
      toast({
        title: "Error de Conexión",
        description: "No se pudo conectar con el backend para obtener los vuelos.",
        variant: "destructive",
      });
    }
  };

  // Fetch flights on component mount
  useEffect(() => {
    fetchFlights();
  }, []);


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/plain' || file.type === 'text/csv')) {
      onFileUpload(file);
      toast({
        title: "Archivo cargado",
        description: `Datos de ${file.name} procesados correctamente`,
      });
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo .txt o .csv válido",
        variant: "destructive"
      });
    }
  };

  const handleLiveStart = async () => {
    if (!fileName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el nuevo vuelo.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/flights/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ flightName: fileName.trim(), port: 'COM5', baudRate: 115200 }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Vuelo COM5 iniciado",
            description: `Grabando datos para el vuelo: ${result.flightName || fileName.trim()}`,
        });
  // Notificar al padre sobre el modo en vivo - incluir el flightId para unirse a la sala
  onLiveMode(result.flightName || fileName.trim(), result.flightId);
        setFileName(''); // Limpiar input
        setTimeout(fetchFlights, 1000); // Actualizar lista de vuelos
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar el vuelo');
      }
    } catch (error) {
      console.error('Error starting flight:', error);
      toast({
        title: "Error al Iniciar Vuelo",
        description: error.message || "No se pudo comunicar con el backend para iniciar el vuelo.",
        variant: "destructive",
      });
    }
  };

  const handleStopLive = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/flights/stop', {
        method: 'POST',
      });
       if (response.ok) {
        const result = await response.json();
        toast({
          title: "Vuelo Detenido",
          description: result.message,
        });
        onStopLive(); // Notificar al padre
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al detener el vuelo');
      }
    } catch (error) {
      console.error('Error stopping flight:', error);
      toast({
        title: "Error al Detener Vuelo",
        description: error.message || "No se pudo comunicar con el backend.",
        variant: "destructive",
      });
    }
  };


  const handleDeleteFlight = async (flightId, flightName, event) => {
    event.stopPropagation();
    
    if (currentFlight === flightName) {
      toast({
        title: "No se puede eliminar",
        description: "No puedes eliminar el vuelo que está siendo visualizado.",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar el vuelo "${flightName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('astra_access_token');
      const response = await fetch(`http://localhost:5000/api/flights/${flightId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Vuelo eliminado",
          description: `${flightName} ha sido eliminado exitosamente.`,
        });
        fetchFlights(); // Recargar la lista de vuelos
      } else {
        // Try to parse error JSON, but have a fallback
        let errorMessage = 'Error al eliminar el vuelo del servidor.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // The response was not JSON, maybe HTML or plain text
          errorMessage = `Error del servidor (${response.status}). Intente de nuevo.`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting flight:', error);
      toast({
        title: "Error",
        description: `No se pudo eliminar el vuelo: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const generateQuickFlightName = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    return `Vuelo_${dateStr}_${timeStr}`;
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Gestión de Vuelos</h2>
        <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
          ADMIN
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Vuelos guardados con opciones de admin */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-400 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Vuelos Guardados
            <div className="ml-2 flex items-center space-x-1">
              <span className="text-xs bg-gray-700 px-2 py-1 rounded flex items-center">
                <Database className="w-3 h-3 mr-1" />
                {flights.length}
              </span>
            </div>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {flights.length > 0 ? (
              flights.map((flight) => (
                <div
                  key={flight.id}
                  className="flex items-center space-x-2 bg-gray-800/50 border border-gray-600 rounded-md p-2 hover:bg-blue-600/10 hover:border-blue-500 transition-all"
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start text-left h-auto p-2"
                    onClick={() => onFlightSelect({ id: flight.id, name: flight.name })}
                  >
                    <span className={`${(typeof currentFlight === 'string' ? currentFlight : (currentFlight?.name || '')) === flight.name ? 'text-blue-400 font-semibold' : 'text-white'}`}>
                      {flight.name}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/10 p-1"
                    onClick={(e) => handleDeleteFlight(flight.id, flight.name, e)}
                    title="Eliminar vuelo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay vuelos guardados en el backend.</p>
              </div>
            )}
          </div>
        </div>

        {/* Cargar archivos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-400 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Importar Datos (CSV/TXT)
          </h3>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-500 transition-colors">
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400 mb-1">
                Arrastra archivos o haz clic
              </p>
              <p className="text-xs text-gray-500">
                Formatos: .txt, .csv
              </p>
            </label>
          </div>
        </div>

        {/* Modo en vivo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400 flex items-center">
            <Play className="w-5 h-5 mr-2" />
            Telemetría en Vivo (COM5)
          </h3>
          
          <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <Satellite className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-300">
                <p className="font-medium text-blue-300 mb-1">Configuración de Vuelo:</p>
                <p>• Puerto: COM5 | Baudios: 115200</p>
                <p>• Los datos se guardan en la base de datos central.</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Nombre del nuevo vuelo..."
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
                disabled={isLiveMode}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFileName(generateQuickFlightName())}
                className="border-gray-600 text-gray-300 hover:border-green-500"
                disabled={isLiveMode}
                title="Generar nombre automático"
              >
                🎲
              </Button>
            </div>
            
            {isLiveMode ? (
              <Button onClick={handleStopLive} className="w-full bg-red-600 hover:bg-red-700">
                <Square className="w-4 h-4 mr-2" /> Detener Vuelo ({currentFlight})
              </Button>
            ) : (
              <Button onClick={handleLiveStart} className="w-full bg-green-600 hover:bg-green-700" disabled={!fileName.trim()}>
                <Play className="w-4 h-4 mr-2" /> Iniciar Vuelo
              </Button>
            )}
          </div>

          {isLiveMode && (
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Registrando en tiempo real...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentFlight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg flex justify-between items-center"
        >
          <div>
            <p className="text-blue-300">
              <span className="font-semibold">Vuelo Actual:</span> {currentFlight}
              {isLiveMode && <span className="ml-2 text-green-400">🔴 EN VIVO</span>}
            </p>
          </div>
          <Button 
            onClick={onExport} 
            variant="outline" 
            className="bg-transparent border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar Paquete
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default FlightSelectorAdmin;