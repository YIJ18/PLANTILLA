import React from 'react';
import { motion } from 'framer-motion';
import { Battery, Clock, Wifi, WifiOff, Radio } from 'lucide-react';

const StatusPanel = ({ status, isLiveMode }) => {
  const { isActive, battery, lastUpdate, walkieChannel } = status;

  const getBatteryColor = (level) => {
    if (level > 60) return 'bg-green-500';
    if (level > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="glass-card rounded-xl p-6 h-full">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        {isActive ? <Wifi className="w-6 h-6 mr-3 text-green-400" /> : <WifiOff className="w-6 h-6 mr-3 text-red-400" />}
        Estado del CanSat
      </h2>

      <div className="grid md:grid-cols-4 gap-6 items-center h-full">
        <div className="text-center">
          <motion.div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${isActive ? 'status-active' : 'status-inactive'}`}
            animate={isActive ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {isActive ? <Wifi className="w-8 h-8 text-white" /> : <WifiOff className="w-8 h-8 text-white" />}
          </motion.div>
          <h3 className="text-lg font-semibold text-white">Conexión</h3>
          <p className={`text-sm font-bold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
            {isActive ? 'ACTIVO' : 'INACTIVO'}
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gray-800 flex items-center justify-center relative overflow-hidden">
            <Battery className="w-8 h-8 text-white z-10" />
            <motion.div
              className={`absolute bottom-0 left-0 right-0 ${getBatteryColor(battery)}`}
              initial={{ height: '0%' }}
              animate={{ height: `${battery}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <h3 className="text-lg font-semibold text-white">Batería</h3>
          <p className="text-2xl font-bold text-white">{battery.toFixed(1)}%</p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center">
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Última Act.</h3>
          <p className="text-blue-400 font-mono">{lastUpdate}</p>
        </div>

        <div className="text-center relative">
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-red-600/20 border-2 border-red-500 flex items-center justify-center">
            <Radio className="w-8 h-8 text-red-400" />
          </div>
          {isLiveMode && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16">
              <motion.div
                className="w-full h-full border-2 border-red-400 rounded-full"
                animate={{ scale: [1, 1.8], opacity: [1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}
          <h3 className="text-lg font-semibold text-white">Canal</h3>
          <p className="text-red-400 font-mono text-2xl font-bold">{walkieChannel}</p>
        </div>
      </div>
    </div>
  );
};

export default StatusPanel;