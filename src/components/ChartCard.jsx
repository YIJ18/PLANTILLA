import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { X } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const applySMA = (data, period) => {
  if (period > data.length || period <= 1) return data;
  const result = [];
  for (let i = 0; i <= data.length - period; i++) {
    const chunk = data.slice(i, i + period);
    const avg = chunk.reduce((a, b) => a + b, 0) / period;
    result.push(avg);
  }
  const padding = Array(period - 1).fill(result[0]);
  return [...padding, ...result];
};

const ChartCard = ({ title, data, timestamps, color, unit, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const chartRef = useRef();
  const filteredData = applySMA(data, 5);

  const chartData = {
    labels: timestamps.map(ts => new Date(ts).toLocaleTimeString()),
    datasets: [
      {
        label: 'Filtrado',
        data: filteredData,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Sin Filtrar',
        data: data,
        borderColor: color.replace('rgb', 'rgba').replace(')', ', 0.3)'),
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#9ca3af',
          boxWidth: 12,
          font: { size: 12 }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: color,
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ${unit}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)', drawBorder: false },
        ticks: { color: '#9ca3af', maxTicksLimit: 6, font: { size: 10 } }
      },
      y: {
        title: { display: true, text: unit, color: '#9ca3af', font: { size: 12 } },
        grid: { color: 'rgba(156, 163, 175, 0.1)', drawBorder: false },
        ticks: { color: '#9ca3af', font: { size: 10 }, callback: (value) => value.toFixed(1) }
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  const currentValue = data[data.length - 1] || 0;
  const previousValue = data[data.length - 2] || 0;
  const trend = currentValue > previousValue ? '↗️' : currentValue < previousValue ? '↘️' : '➡️';

  return (
    <>
      {/* --- Tarjeta normal --- */}
      <motion.div
        ref={chartRef}
        className="chart-card glass-card rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer"
        whileHover={{ scale: 1.02 }}
        style={{ boxShadow: `0 0 20px ${color.replace('rgb', 'rgba').replace(')', ', 0.2)')}` }}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold" style={{ color }}>
                  {currentValue.toFixed(2)}
                </span>
                <span className="text-gray-400 text-sm">{unit}</span>
                <span className="text-sm">{trend}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-container" style={{ height: '250px' }}>
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
      </motion.div>

      {/* --- Modal con gráfica ampliada --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-gray-900 rounded-xl p-6 w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="text-2xl">{icon}</span>
                <span>{title} (Ampliado)</span>
              </h3>
              <div style={{ height: '500px' }}>
                <Line data={chartData} options={options} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChartCard;
