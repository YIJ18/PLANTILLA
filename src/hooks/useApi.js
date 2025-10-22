import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Hook personalizado para obtener datos de telemetría
export const useTelemetryData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiRequest } = useAuth();

  const fetchTelemetryData = async () => {
    try {
      setLoading(true);
      setError(null);
  // Node API endpoints expuestos bajo /api
      const result = await apiRequest('/telemetry/readings');
      setData(Array.isArray(result) ? result : (result?.results || []));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
    // Habilitar polling simple para simular tiempo real
    const interval = setInterval(fetchTelemetryData, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchTelemetryData
  };
};

// Hook para obtener sensores
export const useSensors = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiRequest } = useAuth();

  const fetchSensors = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest('/telemetry/sensors');
      setSensors(Array.isArray(result) ? result : (result?.results || []));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching sensors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  return {
    sensors,
    loading,
    error,
    refetch: fetchSensors
  };
};

// Hook para obtener vuelos
export const useFlights = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiRequest } = useAuth();

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest('/flights/flights/');
      setFlights(result?.results || result || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching flights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  return {
    flights,
    loading,
    error,
    refetch: fetchFlights
  };
};

// Hook para obtener misiones
export const useMissions = () => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiRequest } = useAuth();

  const fetchMissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest('/flights/missions/');
      setMissions(result?.results || result || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching missions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  return {
    missions,
    loading,
    error,
    refetch: fetchMissions
  };
};