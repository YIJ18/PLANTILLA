import { flightAPI, authAPI } from './api.js';

// Test API connection
export const testAPIConnection = async () => {
  try {
    console.log('Testing API connection...');
    
    // Test if backend is reachable
    const response = await fetch('http://127.0.0.1:8000/api/flights/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend connection successful');
      console.log('Flights available:', data);
      return { success: true, data };
    } else {
      console.log('❌ Backend connection failed:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Network error:', error);
    return { success: false, error: error.message };
  }
};

// Test authentication
export const testAuth = async () => {
  try {
    console.log('Testing authentication...');
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      console.log('❌ No token found');
      return { success: false, error: 'No authentication token' };
    }
    
    const profile = await authAPI.getProfile();
    console.log('✅ Authentication successful');
    console.log('User profile:', profile);
    return { success: true, data: profile };
  } catch (error) {
    console.log('❌ Authentication failed:', error);
    return { success: false, error: error.message };
  }
};

export default { testAPIConnection, testAuth };