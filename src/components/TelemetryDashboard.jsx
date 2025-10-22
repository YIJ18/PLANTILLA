import React from 'react';
import { useTelemetryData, useSensors } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Gauge, Activity, Wifi, AlertCircle } from 'lucide-react';

const TelemetryDashboard = () => {
  const { data: telemetryData, loading: telemetryLoading, error: telemetryError } = useTelemetryData();
  const { sensors, loading: sensorsLoading, error: sensorsError } = useSensors();

  // Función para obtener el icono según el tipo de sensor
  const getSensorIcon = (sensorType) => {
    switch (sensorType?.toLowerCase()) {
      case 'temperature':
        return <Thermometer className="w-5 h-5 text-red-400" />;
      case 'pressure':
        return <Gauge className="w-5 h-5 text-blue-400" />;
      case 'accelerometer':
        return <Activity className="w-5 h-5 text-green-400" />;
      default:
        return <Wifi className="w-5 h-5 text-purple-400" />;
    }
  };

  // Función para formatear el valor según el tipo de sensor
  const formatValue = (value, unit) => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit || ''}`;
    }
    return `${value} ${unit || ''}`;
  };

  // Función para obtener los últimos datos de cada sensor
  const getLatestSensorData = () => {
    if (!telemetryData || !sensors) return [];

    return sensors.map(sensor => {
      const latestReading = telemetryData
        .filter(reading => reading.sensor === sensor.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      return {
        ...sensor,
        latestReading: latestReading || null
      };
    });
  };

  if (telemetryLoading || sensorsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-600 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (telemetryError || sensorsError) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Error: {telemetryError || sensorsError}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sensorDataWithReadings = getLatestSensorData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Telemetría en Tiempo Real</h2>
  <div className="flex items-center space-x-2 text-green-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Conectado al Backend Node</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sensorDataWithReadings.map((sensor) => (
          <Card key={sensor.id} className="bg-gray-800/50 border-gray-700 hover:border-blue-500/30 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  {getSensorIcon(sensor.sensor_type)}
                  <span className="text-white">{sensor.name}</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                  {sensor.sensor_type}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sensor.latestReading ? (
                  <>
                    <div className="text-3xl font-bold text-blue-400">
                      {formatValue(sensor.latestReading.value, sensor.unit)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Última lectura: {new Date(sensor.latestReading.timestamp).toLocaleString('es-ES')}
                    </div>
                    {sensor.latestReading.quality && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          sensor.latestReading.quality === 'good' ? 'bg-green-400' :
                          sensor.latestReading.quality === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
                        }`}></div>
                        <span className="text-xs text-gray-400 capitalize">
                          Calidad: {sensor.latestReading.quality}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500">
                    <div className="text-xl">--</div>
                    <div className="text-sm">Sin datos disponibles</div>
                  </div>
                )}
                
                {sensor.description && (
                  <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                    {sensor.description}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sensorDataWithReadings.length === 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              No hay sensores configurados
            </h3>
            <p className="text-gray-400 text-sm">
              Configura sensores en el backend Node para ver datos de telemetría aquí.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TelemetryDashboard;