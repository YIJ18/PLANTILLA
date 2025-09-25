import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Play, FileText, Satellite, Square, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const FlightSelector = ({ onFlightSelect, onFileUpload, onLiveMode, onStopLive, onExport, currentFlight, isLiveMode, savedFlights }) => {
  const [fileName, setFileName] = useState('');

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
    toast({
      title: "Modo en vivo iniciado",
      description: `Registrando datos en ${fileName}.txt`,
    });
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Satellite className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Gestión de Vuelos</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-400 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Vuelos Guardados
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {savedFlights.map((flight) => (
              <Button
                key={flight}
                variant="outline"
                className="w-full justify-start bg-gray-800/50 border-gray-600 hover:bg-blue-600/20 hover:border-blue-500"
                onClick={() => onFlightSelect(flight)}
              >
                {flight}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-400 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Subir Archivo .txt
          </h3>
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-red-500 transition-colors">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-400">
                Arrastra un archivo o haz clic para seleccionar
              </p>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-400 flex items-center">
            <Play className="w-5 h-5 mr-2" />
            Modo en Vivo
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del nuevo vuelo..."
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-green-500 focus:outline-none"
            />
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
        </div>
      </div>

      {currentFlight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg flex justify-between items-center"
        >
          <p className="text-blue-300">
            <span className="font-semibold">Vuelo Actual:</span> {currentFlight}
            {isLiveMode && <span className="ml-2 pulse">🔴 EN VIVO</span>}
          </p>
          <Button onClick={onExport} variant="outline" className="bg-transparent border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black">
            <Download className="w-4 h-4 mr-2" /> Exportar Paquete
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default FlightSelector;