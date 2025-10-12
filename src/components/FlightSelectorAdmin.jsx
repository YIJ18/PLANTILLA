import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, FileText, Satellite, Square, Download, Trash2, Shield, Cloud, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getSavedFlights, deleteFlightData } from '@/lib/dbUnified';

const FlightSelectorAdmin = ({ onFlightSelect, onFileUpload, onLiveMode, onStopLive, onExport, currentFlight, isLiveMode, savedFlights, updateSavedFlights }) => {
  const [fileName, setFileName] = useState('');
  const [syncStatus, setSyncStatus] = useState({ django: 0, local: 0 });
  const { toast } = useToast();

  // Verificar estado de sincronización
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // Obtener vuelos desde Django usando la función de la API
          try {
            const response = await fetch('http://127.0.0.1:8000/api/flights/', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (response.ok) {
              const djangoFlights = await response.json();
              setSyncStatus(prev => ({ ...prev, django: djangoFlights.length }));
            } else {
              console.log('Django API response:', response.status);
              setSyncStatus(prev => ({ ...prev, django: 0 }));
            }
          } catch (error) {
            console.error('Error fetching Django flights:', error);
            setSyncStatus(prev => ({ ...prev, django: 0 }));
          }
        } else {
          setSyncStatus(prev => ({ ...prev, django: 0 }));
        }
        
        // Obtener vuelos desde IndexedDB
        try {
          const request = indexedDB.open('AstraDB', 1);
          request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction('flights', 'readonly');
            const store = transaction.objectStore('flights');
            const keysRequest = store.getAllKeys();
            keysRequest.onsuccess = () => {
              setSyncStatus(prev => ({ ...prev, local: keysRequest.result.length }));
            };
          };
        } catch (error) {
          console.error('Error fetching local flights:', error);
          setSyncStatus(prev => ({ ...prev, local: 0 }));
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };

    checkSyncStatus();
  }, [savedFlights]);

  const handleForcSync = async () => {
    try {
      toast({
        title: "Sincronizando...",
        description: "Actualizando lista de vuelos desde todas las fuentes",
      });
      
      await updateSavedFlights();
      
      toast({
        title: "Sincronización completa",
        description: "Lista de vuelos actualizada exitosamente",
      });
    } catch (error) {
      console.error('Error syncing flights:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudo completar la sincronización",
        variant: "destructive"
      });
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      onFileUpload(file);
      toast({
        title: "Archivo cargado",
        description: `Datos de ${file.name} procesados correctamente`,
      });
    } else {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo .txt válido",
        variant: "destructive"
      });
    }
  };

  const handleLiveStart = () => {
    if (!fileName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para el archivo de datos",
        variant: "destructive"
      });
      return;
    }
    onLiveMode(fileName);
    setFileName(''); // Limpiar el campo después de iniciar
    toast({
      title: "Modo en vivo iniciado",
      description: `Registrando datos en ${fileName}.txt`,
    });
  };

  const handleDeleteFlight = async (flightName, event) => {
    event.stopPropagation(); // Evitar que se seleccione el vuelo
    
    if (currentFlight === flightName) {
      toast({
        title: "No se puede eliminar",
        description: "No puedes eliminar el vuelo que está siendo visualizado",
        variant: "destructive"
      });
      return;
    }

    try {
      // Usar la función unificada que elimina de Django y IndexedDB
      await deleteFlightData(flightName);
      
      // Actualizar la lista
      updateSavedFlights();
      
      toast({
        title: "Vuelo eliminado",
        description: `${flightName} ha sido eliminado exitosamente del backend y local`,
      });
    } catch (error) {
      console.error('Error deleting flight:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el vuelo completamente",
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
        <h2 className="text-2xl font-bold text-white">Gestión Completa de Vuelos</h2>
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
                {savedFlights.length}
              </span>
              {localStorage.getItem('access_token') && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded flex items-center" title="Sincronizado con Django">
                  <Cloud className="w-3 h-3 mr-1" />
                  {syncStatus.django}
                </span>
              )}
            </div>
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {savedFlights.length > 0 ? (
              savedFlights.map((flight) => (
                <div
                  key={flight}
                  className="flex items-center space-x-2 bg-gray-800/50 border border-gray-600 rounded-md p-2 hover:bg-blue-600/10 hover:border-blue-500 transition-all"
                >
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start text-left h-auto p-2"
                    onClick={() => onFlightSelect(flight)}
                  >
                    <span className={`${currentFlight === flight ? 'text-blue-400 font-semibold' : 'text-white'}`}>
                      {flight}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/10 p-1"
                    onClick={(e) => handleDeleteFlight(flight, e)}
                    title="Eliminar vuelo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <Satellite className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay vuelos guardados</p>
              </div>
            )}
          </div>
        </div>

        {/* Cargar archivos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-400 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Importar Datos
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
          
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Formato esperado:</h4>
            <code className="text-xs text-green-400 block">
              timestamp,temp,humidity,alt,pressure,walkie,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,lat,lng
            </code>
          </div>
        </div>

        {/* Modo en vivo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400 flex items-center">
            <Play className="w-5 h-5 mr-2" />
            Telemetría en Vivo
          </h3>
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
              <Button onClick={onStopLive} className="w-full bg-red-600 hover:bg-red-700">
                <Square className="w-4 h-4 mr-2" /> Detener Registro
              </Button>
            ) : (
              <Button onClick={handleLiveStart} className="w-full bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" /> Iniciar Registro
              </Button>
            )}
          </div>

          {isLiveMode && (
            <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span>Registrando en tiempo real</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                Los datos se guardan automáticamente cada 2 segundos
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estado de sincronización */}
      <div className="mt-4 p-3 bg-gray-800/30 border border-gray-700 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
          <Database className="w-4 h-4 mr-2" />
          Estado de Sincronización
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Local (IndexedDB):</span>
            <span className="text-blue-400 font-medium">{syncStatus.local} vuelos</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Backend (Django):</span>
            <span className={`font-medium ${localStorage.getItem('access_token') ? 'text-green-400' : 'text-red-400'}`}>
              {localStorage.getItem('access_token') ? `${syncStatus.django} vuelos` : 'Desconectado'}
            </span>
          </div>
        </div>
        {localStorage.getItem('access_token') && (
          <div className="mt-2 text-xs text-green-400 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Los vuelos se guardan automáticamente en ambas bases de datos
            </div>
            <Button
              onClick={handleForcSync}
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-blue-400 hover:text-blue-300"
            >
              🔄 Sincronizar
            </Button>
          </div>
        )}
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
            <p className="text-xs text-gray-400 mt-1">
              Control administrativo completo disponible
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