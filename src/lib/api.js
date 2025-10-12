// API configuration for Django backend
const API_BASE_URL = 'http://127.0.0.1:8000';

// Get token from localStorage
const getToken = () => localStorage.getItem('access_token');

// Helper function for API requests
const apiRequest = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Flight API functions
export const flightAPI = {
  // Get all flights
  getFlights: () => apiRequest('/api/flights/'),
  
  // Get specific flight
  getFlight: (id) => apiRequest(`/api/flights/${id}/`),
  
  // Create new flight
  createFlight: (flightData) => apiRequest('/api/flights/', {
    method: 'POST',
    body: JSON.stringify(flightData),
  }),
  
  // Update flight
  updateFlight: (id, flightData) => apiRequest(`/api/flights/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(flightData),
  }),
  
  // Delete flight
  deleteFlight: (id) => apiRequest(`/api/flights/${id}/`, {
    method: 'DELETE',
  }),
};

// Telemetry API functions
export const telemetryAPI = {
  // Get telemetry for a flight
  getTelemetry: (flightId) => apiRequest(`/api/telemetry/data/?flight=${flightId}`),
  
  // Create telemetry data
  createTelemetry: (telemetryData) => apiRequest('/api/telemetry/data/', {
    method: 'POST',
    body: JSON.stringify(telemetryData),
  }),
  
  // Bulk create telemetry data - Note: this endpoint may not exist yet
  bulkCreateTelemetry: (telemetryArray) => {
    // Send individual requests for now, can be optimized later
    return Promise.all(
      telemetryArray.map(data => 
        apiRequest('/api/telemetry/data/', {
          method: 'POST',
          body: JSON.stringify(data),
        })
      )
    );
  },
};

// Auth API functions
export const authAPI = {
  // Login
  login: (credentials) => apiRequest('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  // Get user profile
  getProfile: () => apiRequest('/api/auth/profile/'),
  
  // Logout
  logout: () => apiRequest('/api/auth/logout/', {
    method: 'POST',
  }),
};

export default {
  flightAPI,
  telemetryAPI,
  authAPI,
};