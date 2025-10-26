// API configuration para backend simple (sin Django)
const API_BASE_URL = 'http://127.0.0.1:5000';

// Helper function for API requests (sin autenticación)
const apiRequest = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // Handle different response types
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      // Try to get error details from response
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
        console.error(`Fetch error from ${API_BASE_URL}${url}:`, errorData);
      }
      
      throw new Error(errorMessage);
    }

    // Return parsed JSON if content is JSON
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    // Return text for non-JSON responses
    return await response.text();
  } catch (error) {
    // Log network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`Network error connecting to ${API_BASE_URL}${url}:`, error.message);
      throw new Error(`No se pudo conectar al servidor backend en ${API_BASE_URL}`);
    }
    throw error;
  }
};

// Health check
export const healthAPI = {
  check: () => apiRequest('/api/health'),
};

// Serial COM5 API functions
export const serialAPI = {
  // Iniciar lectura COM5
  startReading: (flightName) => apiRequest('/api/serial/start', {
    method: 'POST',
    body: JSON.stringify({ flight_name: flightName }),
  }),
  
  // Detener lectura COM5
  stopReading: () => apiRequest('/api/serial/stop', {
    method: 'POST',
  }),
  
  // Obtener estado de lectura
  getStatus: () => apiRequest('/api/serial/status'),
  
  // Probar conexión COM5 (mapea al endpoint genérico de prueba del servidor)
  testCOM5: () => apiRequest('/api/test/serial'),
};

// CSV Files API functions
export const csvAPI = {
  // Listar archivos CSV
  // listFiles: () => apiRequest('/api/flights/csv'), // This endpoint does not exist in Node.js API
  listFiles: async () => { 
    console.warn("listFiles via CSV is deprecated. Fetching from /api/flights instead.");
    const flights = await apiRequest('/api/flights');
    // Adapt the response to the format expected by the original listFiles function if necessary
    return flights.map(f => ({ name: f.name, path: `/api/flights/${f.id}/telemetry` }));
  },
};

// Mock flight API para mantener compatibilidad con React existente
export const flightAPI = {
  // Funciones simplificadas que mapean a la API simple
  getFlights: async () => {
    // Prefer Node DB flights if available, fallback to CSV mapping
    try {
      const dbResp = await apiRequest('/api/flights');
      if (Array.isArray(dbResp?.flights)) {
        return { results: dbResp.flights.map((f) => ({
          id: f.id,
          name: f.name,
          flight_number: f.name,
          status: f.status || 'completed',
          created_at: f.startedAt || new Date().toISOString(),
          aircraft_id: 'CANSAT-SERIAL',
        })) };
      }
    } catch (e) {
      // ignore and fallback
    }

    const csvFiles = await csvAPI.listFiles();
    return {
      results: csvFiles.files?.map((file, index) => ({
        id: index + 1,
        name: file.name.replace('flight_', '').replace('.csv', ''),
        flight_number: file.name,
        status: 'completed',
        created_at: new Date(file.modified).toISOString(),
        aircraft_id: 'CANSAT-SERIAL',
      })) || []
    };
  },
  
  getFlight: async (id) => {
    const flights = await flightAPI.getFlights();
    const flight = flights.results.find(f => f.id === parseInt(id));
    return { flight: flight || null };
  },
  
  // Crear vuelo ahora inicia lectura COM5
  createFlight: async (flightData) => {
    let result;
    try {
      result = await serialAPI.startReading(flightData.name);
    } catch (e) {
      if (String(e?.message || '').includes('Ya hay una lectura activa')) {
        result = { message: 'Lector serial ya estaba activo' };
      } else {
        throw e;
      }
    }
    return {
      flight: {
        id: result.flight_id || Date.now(),
        name: flightData.name,
        flight_number: `SERIAL-${Date.now()}`,
        status: 'active',
        created_at: new Date().toISOString(),
        aircraft_id: 'CANSAT-SERIAL',
      },
      serial_status: 'active',
      message: result.message
    };
  },
  
  // Funciones de compatibilidad (no implementadas en API simple)
  updateFlight: () => Promise.resolve({ message: 'No implementado en API simple' }),
  deleteFlight: () => Promise.resolve({ message: 'No implementado en API simple' }),
};

// Telemetry API simplificada
export const telemetryAPI = {
  getTelemetry: () => Promise.resolve({ results: [] }),
  createTelemetry: () => Promise.resolve({ message: 'Datos van directo a CSV' }),
  bulkCreateTelemetry: () => Promise.resolve({ message: 'Datos van directo a CSV' }),
};

// Auth API simplificada (sin autenticación real)
export const authAPI = {
  login: async (credentials) => {
    // Simular login exitoso siempre
    const fakeToken = `fake-token-${Date.now()}`;
    localStorage.setItem('astra_access_token', fakeToken);
    return {
      access: fakeToken,
      user: {
        username: credentials.username || 'admin',
        is_staff: true
      }
    };
  },
  
  getProfile: () => Promise.resolve({
    username: 'admin',
    is_staff: true,
    email: 'admin@astra.com'
  }),
  
  logout: () => {
    localStorage.removeItem('astra_access_token');
    return Promise.resolve({ message: 'Logged out' });
  },
};

// Serial Flight API adaptado para API simple
export const serialFlightAPI = {
  // Iniciar vuelo serial
  startSerialFlight: async (flightData) => {
    const result = await serialAPI.startReading(flightData.name);
    return {
      flight: {
        id: Date.now(),
        name: flightData.name,
        status: 'active'
      },
      serial_status: 'active',
      message: result.message
    };
  },
  
  // Detener vuelo serial
  stopSerialFlight: async () => {
    const result = await serialAPI.stopReading();
    return result;
  },
  
  // Estado del vuelo serial
  getSerialFlightStatus: () => serialAPI.getStatus(),
  
  // Vuelos activos
  getActiveSerialFlights: () => serialAPI.getStatus(),
  
  // Estado del proceso serial
  getSerialStatus: () => serialAPI.getStatus(),
  
  // No hay streaming real, pero mantenemos la interfaz
  createTelemetryStream: () => {
    // Devolver un mock EventSource que no hace nada
    return {
      addEventListener: () => {},
      close: () => {},
      onmessage: null,
      onerror: null
    };
  },
};

export default {
  healthAPI,
  serialAPI,
  csvAPI,
  flightAPI,
  telemetryAPI,
  authAPI,
  serialFlightAPI,
};