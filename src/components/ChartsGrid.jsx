import React from 'react';
import { motion } from 'framer-motion';
import ChartCard from '@/components/ChartCard';

const ChartsGrid = ({ data }) => {
  const chartConfigs = [
    {
      title: 'Temperatura',
      data: data.temperature,
      timestamps: data.timestamps,
      color: 'rgb(239, 68, 68)',
      unit: '°C',
      icon: '🌡️'
    },
    {
      title: 'Altitud',
      data: data.altitude,
      timestamps: data.timestamps,
      color: 'rgb(16, 185, 129)',
      unit: 'm',
      icon: '⛰️'
    },
    {
      title: 'Presión',
      data: data.pressure,
      timestamps: data.timestamps,
      color: 'rgb(245, 158, 11)',
      unit: 'hPa',
      icon: '🌪️'
    },
    {
      title: 'Humedad',
      data: data.humidity,
      timestamps: data.timestamps,
      color: 'rgb(59, 130, 246)',
      unit: '%',
      icon: '💧'
    },
    {
      title: 'Acelerómetro',
      data: data.accelerometer.map(acc => Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2)),
      timestamps: data.timestamps,
      color: 'rgb(236, 72, 153)',
      unit: 'm/s²',
      icon: '🚀'
    },
    {
      title: 'Giroscopio',
      data: data.gyroscope.map(gyro => Math.sqrt(gyro.x**2 + gyro.y**2 + gyro.z**2)),
      timestamps: data.timestamps,
      color: 'rgb(168, 85, 247)',
      unit: '°/s',
      icon: '🔄'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Sensores Principales
        </h2>
        <div className="grid lg:grid-cols-3 gap-6">
          {chartConfigs.slice(0, 3).map((config, index) => (
            <motion.div
              key={config.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ChartCard {...config} />
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Sensores Adicionales
        </h2>
        <div className="grid lg:grid-cols-3 gap-6">
          {chartConfigs.slice(3).map((config, index) => (
            <motion.div
              key={config.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <ChartCard {...config} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChartsGrid;