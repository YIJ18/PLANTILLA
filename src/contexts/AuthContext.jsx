import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Configuración de la API del backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Si el token expiró, intentar refrescar
    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Reintentar la petición con el nuevo token
        config.headers.Authorization = `Bearer ${localStorage.getItem('astra_access_token')}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
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
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
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
          // Verificar que el token siga siendo válido obteniendo el perfil del usuario
          const userData = await apiRequest('/auth/profile/');
          if (userData) {
            setUser(JSON.parse(savedUser));
          }
        } catch (error) {
          console.error('Error validating session:', error);
          // Limpiar sesión inválida
          localStorage.removeItem('astra_user');
          localStorage.removeItem('astra_access_token');
          localStorage.removeItem('astra_refresh_token');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    
    console.log('🚀 Iniciando login con:', { email, password: '***' });
    console.log('📡 URL del backend:', `${API_BASE_URL}/auth/login/`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('📊 Respuesta del servidor:', response.status, response.statusText);

      const data = await handleResponse(response);
      console.log('📋 Datos recibidos:', data);

      if (data.access && data.user) {
        // Guardar tokens y datos del usuario
        localStorage.setItem('astra_access_token', data.access);
        localStorage.setItem('astra_refresh_token', data.refresh);
        
        const userSession = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          name: data.user.full_name,
          role: data.user.role,
          department: data.user.department,
          loginTime: new Date().toISOString()
        };
        
        setUser(userSession);
        localStorage.setItem('astra_user', JSON.stringify(userSession));
        setIsLoading(false);
        console.log('✅ Login exitoso, usuario guardado:', userSession);
        return { success: true };
      }
    } catch (error) {
      console.error('💥 Error en login:', error);
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