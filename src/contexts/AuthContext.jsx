import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Configuración de la API del backend (API Node.js)
const API_URL = 'http://localhost:5000/api';

// Función para hacer peticiones autenticadas
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('astra_access_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Si el token expiró, intentar refrescar
    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        config.headers.Authorization = `Bearer ${localStorage.getItem('astra_access_token')}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, config);
        return await handleResponse(retryResponse);
      } else {
        // Si no se pudo refrescar, limpiar sesión
        localStorage.removeItem('astra_access_token');
        localStorage.removeItem('astra_refresh_token');
        localStorage.removeItem('astra_user');
        window.location.reload();
        return null;
      }
    }

    return await handleResponse(response);
  } catch (error) {
    console.error('API Request Error:', error);
    throw new Error('Error de conexión con el servidor');
  }
};

// Función para manejar respuestas de la API
const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.detail || data.error || 'Error en la petición');
  }
  
  return data;
};

// Función para refrescar el token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('astra_refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('astra_access_token', data.access);
      return true;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }

  return false;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada y un token válido
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('astra_user');
      const token = localStorage.getItem('astra_access_token');
      
      if (savedUser && token) {
        try {
          // Para simple API, solo verificamos que el healthcheck funcione
          const healthCheck = await apiRequest('/health');
          if (healthCheck && healthCheck.status === 'ok') {
            setUser(JSON.parse(savedUser));
          } else {
            throw new Error('API not responding');
          }
        } catch (error) {
          console.error('Error validating session:', error);
          // Mantener la sesión local aunque la API no responda
          // porque la simple API no requiere autenticación real
          setUser(JSON.parse(savedUser));
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar sesión');
      }

      const data = await response.json();
      
      setUser(data.user);
      localStorage.setItem('astra_access_token', data.token);
      localStorage.setItem('astra_user', JSON.stringify(data.user));
      setIsLoading(false);
      
      return { success: true, user: data.user };

    } catch (error) {
      console.error("💥 Error en login:", error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error.message || 'Error de autenticación. Verifica tus credenciales.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('astra_user');
    localStorage.removeItem('astra_access_token');
    localStorage.removeItem('astra_refresh_token');
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    isAdmin,
    isAuthenticated,
    apiRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}