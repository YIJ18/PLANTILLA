import { motion } from 'framer-motion';
import { FileText, Satellite, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FlightSelectorPublic = ({ onFlightSelect, currentFlight, savedFlights }) => {
  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Satellite className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Vuelos Disponibles</h2>
        </div>
      </div>

      {/* Solo vuelos guardados - Sin opciones de administración */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-blue-400 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Vuelos Registrados
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {savedFlights.length > 0 ? (
            savedFlights.map((flight) => (
              <Button
                key={flight.id || flight.name}
                variant="outline"
                className="w-full justify-start bg-gray-800/50 border-gray-600 hover:bg-blue-600/20 hover:border-blue-500"
                onClick={() => onFlightSelect(flight)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {flight.name}
              </Button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Satellite className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay vuelos disponibles</p>
              <p className="text-sm">Esperando datos del sistema...</p>
            </div>
          )}
        </div>
      </div>

      {currentFlight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-blue-600/20 border border-blue-500/30 rounded-lg"
        >
          <p className="text-blue-300">
            <span className="font-semibold">Vuelo Visualizando:</span> {currentFlight}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Modo solo lectura
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default FlightSelectorPublic;