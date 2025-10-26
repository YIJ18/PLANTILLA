import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Thermometer, Gauge, Activity, Wifi, AlertCircle, 
  Battery, MapPin, Compass, Timer, Satellite,
  RotateCcw, Cpu, Radio
} from 'lucide-react';

const TelemetryDashboardExpanded = () => {
  const [telemetryData, setTelemetryData] = useState({
    cansat_status: [],
    primary_sensors: [],
    additional_sensors: [],
    flight_tracker: [],
    orientation_3d: [],
    mission_control: []
  });
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { apiRequest, isAuthenticated } = useAuth();

  // Fetch available flights (prefer JSON /api/flights endpoint)
  useEffect(() => {
    const fetchFlights = async () => {
      if (!isAuthenticated()) return;
      try {
        // Prefer the JSON endpoint that returns an array of flights
        const resp = await fetch('http://127.0.0.1:5000/api/flights');
        if (!resp.ok) throw new Error(`Failed fetching flights: ${resp.status}`);
        const flightsResponse = await resp.json();
        console.log('Raw flights response in TelemetryDashboard:', flightsResponse);

        let flightsList = [];
        if (Array.isArray(flightsResponse)) {
          flightsList = flightsResponse;
        } else if (flightsResponse && Array.isArray(flightsResponse.results)) {
          flightsList = flightsResponse.results;
        } else if (flightsResponse && Array.isArray(flightsResponse.data)) {
          flightsList = flightsResponse.data;
        } else if (flightsResponse && typeof flightsResponse === 'object' && Object.keys(flightsResponse).length > 0) {
          // If it's a single flight object, wrap it
          flightsList = [flightsResponse];
        }

        if (!Array.isArray(flightsList)) flightsList = [];
        setFlights(flightsList);

        if (flightsList.length > 0) {
          const latestFlight = flightsList[flightsList.length - 1];
          setSelectedFlight(latestFlight);
        }
      } catch (error) {
        console.error('Error fetching flights:', error);
        setError('Error al cargar vuelos');
      }
    };

    fetchFlights();
  }, [isAuthenticated]);

  // Fetch telemetry data for selected flight
  useEffect(() => {
    const fetchTelemetryData = async () => {
      if (!selectedFlight || !isAuthenticated()) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Note: Simple API doesn't have telemetry endpoints
  // Data comes directly from CSV files during COM5 reading
        console.log('📡 Using simple API - telemetry data comes from CSV files');
        
        // Set empty telemetry data for now
        const newTelemetryData = {
          cansat_status: [],
          primary_sensors: [],
          additional_sensors: [],
          flight_tracker: [],
          orientation_3d: [],
          mission_control: []
        };

        setTelemetryData(newTelemetryData);
        setLoading(false);
        
        /* 
        // TODO: In future, could read CSV file data here
        const endpoints = [
          { key: 'cansat_status', endpoint: '/telemetry/cansat-status/' },
          { key: 'primary_sensors', endpoint: '/telemetry/primary-sensors/' },
          { key: 'additional_sensors', endpoint: '/telemetry/additional-sensors/' },
          { key: 'flight_tracker', endpoint: '/telemetry/flight-tracker/' },
          { key: 'orientation_3d', endpoint: '/telemetry/orientation-3d/' },
          { key: 'mission_control', endpoint: '/telemetry/mission-control/' }
        ];

        const newTelemetryData = {};
        
        for (const { key, endpoint } of endpoints) {
          try {
            const data = await apiRequest(`${endpoint}?flight=${selectedFlight.id}&ordering=-timestamp&limit=1`);
            newTelemetryData[key] = Array.isArray(data) ? data : (data.results || []);
          } catch (error) {
            console.error(`Error fetching ${key}:`, error);
            newTelemetryData[key] = [];
          }
        }
        
        setTelemetryData(newTelemetryData);
        */
      } catch (error) {
        console.error('Error fetching telemetry data:', error);
        setError('Error al cargar datos de telemetría');
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetryData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchTelemetryData, 5000);
    return () => clearInterval(interval);
    
  }, [selectedFlight, isAuthenticated, apiRequest]);

  // Live mode: poll simple telemetry readings to populate cards
  useEffect(() => {
    if (!isAuthenticated()) return;
    let isMounted = true;
    const poll = async () => {
      try {
        const resp = await fetch('http://127.0.0.1:5000/api/telemetry/readings?limit=1');
        if (!resp.ok) return;
        const arr = await resp.json();
        if (!Array.isArray(arr) || arr.length === 0) return;
        const last = arr[arr.length - 1];
        // Map flat sensor readings into the grouped structure minimally
        const pack = {
          cansat_status: [{ is_active: true, battery_level: 100, walkie_channel: 0, last_update: new Date().toISOString() }],
          primary_sensors: [{}],
          additional_sensors: [{}],
          flight_tracker: [{}],
          orientation_3d: [{}],
          mission_control: [{}]
        };
        // last has fields: sensor, value, timestamp; but backend also keeps latestBySensor
        // Fetch latest endpoint to fill grouped fields
        const latest = await fetch('http://127.0.0.1:5000/api/telemetry/latest').then(r => r.ok ? r.json() : []);
        const toMap = Array.isArray(latest) ? latest : [];
        const get = (id) => toMap.find(x => x.sensor === id)?.value ?? null;
        pack.primary_sensors[0] = {
          temperature: get('temperature'), humidity: get('humidity'), pressure: get('pressure'), altitude: get('altitude')
        };
        pack.orientation_3d[0] = {
          roll: get('roll'), pitch: get('pitch'), yaw: get('yaw'), is_stable: true
        };
        pack.additional_sensors[0] = {
          accelerometer_x: get('accel_x'), accelerometer_y: get('accel_y'), accelerometer_z: get('accel_z')
        };
        pack.flight_tracker[0] = {
          latitude: get('latitude'), longitude: get('longitude'), speed: null
        };
        if (isMounted) setTelemetryData(pack);
      } catch {}
    };
    const interval = setInterval(poll, 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [isAuthenticated]);

  const formatValue = (value, decimals = 2, unit = '') => {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'number') {
      return `${value.toFixed(decimals)} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getLatestData = (dataArray) => {
    return dataArray.length > 0 ? dataArray[0] : null;
  };

  if (!isAuthenticated()) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Debes iniciar sesión para ver la telemetría</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && Object.keys(telemetryData).every(key => telemetryData[key].length === 0)) {
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

  const cansat = getLatestData(telemetryData.cansat_status);
  const primary = getLatestData(telemetryData.primary_sensors);
  const additional = getLatestData(telemetryData.additional_sensors);
  const tracker = getLatestData(telemetryData.flight_tracker);
  const orientation = getLatestData(telemetryData.orientation_3d);
  const mission = getLatestData(telemetryData.mission_control);

  return (
    <div className="space-y-6">
      {/* Header with flight selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Telemetría CanSat en Tiempo Real</h2>
        <div className="flex items-center space-x-4">
          <select 
            value={selectedFlight?.id || ''} 
            onChange={(e) => {
              const flight = Array.isArray(flights) ? flights.find(f => f.id === parseInt(e.target.value)) : null;
              setSelectedFlight(flight);
            }}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white text-sm"
          >
            <option value="">Seleccionar vuelo...</option>
            {Array.isArray(flights) && flights.map((flight, idx) => {
              const key = flight.id ?? flight.flight_number ?? idx;
              const val = flight.id ?? key;
              return (
                <option key={key} value={val}>
                  {flight.flight_number ?? flight.name ?? `Flight ${val}`} - {flight.status ?? 'unknown'}
                </option>
              );
            })}
          </select>
          
          {selectedFlight && (
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Vuelo: {selectedFlight.flight_number}</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CanSat Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Cpu className="w-5 h-5 mr-2 text-green-400" />
              Estado CanSat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Conexión:</span>
                <span className={cansat?.is_active ? 'text-green-400' : 'text-red-400'}>
                  {cansat?.is_active ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Batería:</span>
                <span className="text-blue-400">{formatValue(cansat?.battery_level, 1, '%')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Canal:</span>
                <span className="text-purple-400">{cansat?.walkie_channel || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Última Act.:</span>
                <span className="text-gray-300 text-xs">
                  {cansat?.last_update ? new Date(cansat.last_update).toLocaleTimeString() : '--'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Control */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Radio className="w-5 h-5 mr-2 text-blue-400" />
              Control de Misión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Tiempo:</span>
                <span className="text-blue-400">{formatTime(mission?.flight_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distancia:</span>
                <span className="text-yellow-400">{formatValue(mission?.total_distance, 2, 'km')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fase:</span>
                <span className="text-green-400">{mission?.mission_phase || 'active'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Sensors */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Thermometer className="w-5 h-5 mr-2 text-red-400" />
              Sensores Principales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">🌡️ Temp:</span>
                <span className="text-red-400">{formatValue(primary?.temperature, 2, '°C')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">💧 Hum:</span>
                <span className="text-blue-400">{formatValue(primary?.humidity, 2, '%')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">⛰️ Alt:</span>
                <span className="text-green-400">{formatValue(primary?.altitude, 2, 'm')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">🌪️ Pres:</span>
                <span className="text-purple-400">{formatValue(primary?.pressure, 2, 'hPa')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orientation 3D */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <RotateCcw className="w-5 h-5 mr-2 text-purple-400" />
              Orientación 3D
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Pitch (X):</span>
                <span className="text-red-400">{formatValue(orientation?.pitch, 1, '°')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Roll (Y):</span>
                <span className="text-green-400">{formatValue(orientation?.roll, 1, '°')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Yaw (Z):</span>
                <span className="text-blue-400">{formatValue(orientation?.yaw, 1, '°')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Estable:</span>
                <span className={orientation?.is_stable ? 'text-green-400' : 'text-yellow-400'}>
                  {orientation?.is_stable ? '✅' : '⚠️'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Sensors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Activity className="w-5 h-5 mr-2 text-green-400" />
              Acelerómetro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">X:</span>
                <span className="text-red-400">{formatValue(additional?.accelerometer_x, 3, 'm/s²')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y:</span>
                <span className="text-green-400">{formatValue(additional?.accelerometer_y, 3, 'm/s²')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Z:</span>
                <span className="text-blue-400">{formatValue(additional?.accelerometer_z, 3, 'm/s²')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Compass className="w-5 h-5 mr-2 text-yellow-400" />
              Magnetómetro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">X:</span>
                <span className="text-red-400">{formatValue(additional?.magnetometer_x, 2, 'µT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Y:</span>
                <span className="text-green-400">{formatValue(additional?.magnetometer_y, 2, 'µT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Z:</span>
                <span className="text-blue-400">{formatValue(additional?.magnetometer_z, 2, 'µT')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <MapPin className="w-5 h-5 mr-2 text-blue-400" />
              GPS Tracker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Latitud:</span>
                <span className="text-blue-400">{formatValue(tracker?.latitude, 6, '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Longitud:</span>
                <span className="text-green-400">{formatValue(tracker?.longitude, 6, '')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Velocidad:</span>
                <span className="text-yellow-400">{formatValue(tracker?.speed, 2, 'm/s')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Summary */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Satellite className="w-5 h-5 mr-2 text-green-400" />
            Resumen de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{telemetryData.cansat_status.length}</div>
              <div className="text-gray-400">Estado CanSat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{telemetryData.primary_sensors.length}</div>
              <div className="text-gray-400">Sensores Primarios</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{telemetryData.additional_sensors.length}</div>
              <div className="text-gray-400">Sensores Adicionales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{telemetryData.flight_tracker.length}</div>
              <div className="text-gray-400">GPS Tracker</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{telemetryData.orientation_3d.length}</div>
              <div className="text-gray-400">Orientación 3D</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{telemetryData.mission_control.length}</div>
              <div className="text-gray-400">Control Misión</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No data message */}
      {!selectedFlight && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-8 text-center">
            <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              Selecciona un vuelo para ver telemetría
            </h3>
            <p className="text-gray-400 text-sm">
              Elige un vuelo del menú desplegable para ver los datos de telemetría en tiempo real.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TelemetryDashboardExpanded;