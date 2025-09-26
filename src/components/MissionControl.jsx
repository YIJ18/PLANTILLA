import React from 'react';
import { motion } from 'framer-motion';
import { Timer, Map, ListChecks, BookOpen, CheckCircle, XCircle, Radio } from 'lucide-react';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const ChecklistItem = ({ label, checked }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-300">{label}</span>
    {checked ? (
      <CheckCircle className="w-5 h-5 text-green-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-400" />
    )}
  </div>
);

const MissionControl = ({ missionData }) => {
  const { flightTime, distance, events, checklist } = missionData;

  return (
    <div className="mission-control glass-card rounded-xl p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <Radio className="w-6 h-6 mr-3 text-green-400" />
        Control de Misión
      </h2>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Timer className="w-5 h-5 mx-auto text-blue-400 mb-1" />
          <div className="text-xs text-blue-400">Tiempo de Vuelo</div>
          <div className="text-lg font-bold font-mono">{formatTime(flightTime)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <Map className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
          <div className="text-xs text-yellow-400">Distancia</div>
          <div className="text-lg font-bold font-mono">{(distance / 1000).toFixed(2)} km</div>
        </div>
      </div>

      {/* Checklist y Registro */}
      <div className="grid grid-cols-2 gap-4 flex-grow">
        {/* Checklist */}
        <div className="bg-gray-800/30 rounded-lg p-3">
          <h3 className="text-md font-semibold text-white mb-2 flex items-center">
            <ListChecks className="w-4 h-4 mr-2" /> Checklist
          </h3>
          <div className="space-y-2">
            <ChecklistItem label="Transmisión" checked={checklist.transmission} />
            <ChecklistItem label="Sensores" checked={checklist.sensors} />
            <ChecklistItem label="GPS" checked={checklist.gps} />
            <ChecklistItem label="Grabación" checked={checklist.recording} />
          </div>
        </div>

        {/* Registro con scroll */}
        <div className="bg-gray-800/30 rounded-lg p-3 flex flex-col">
          <h3 className="text-md font-semibold text-white mb-2 flex items-center">
            <BookOpen className="w-4 h-4 mr-2" /> Registro
          </h3>
          <div className="overflow-y-auto text-xs space-y-1 pr-2 max-h-40">
            {events.map((event, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="font-mono"
              >
                <span className="text-blue-400">{event.time}</span>
                <span className="text-gray-300 ml-2">{event.message}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionControl;
