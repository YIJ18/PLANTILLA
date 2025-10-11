import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Usuarios predefinidos para demo (en producción esto vendría de una API)
const DEMO_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'astra2024',
    name: 'Administrador Astra',
    role: 'admin',
    team: 'Astra Rocketry'
  },
  {
    id: 2,
    username: 'mission-control',
    password: 'caelus2024',
    name: 'Control de Misión',
    role: 'admin',
    team: 'Mission Control'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const savedUser = localStorage.getItem('astra_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('astra_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    setIsLoading(true);
    
    // Simular delay de autenticación
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = DEMO_USERS.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      const userSession = {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
        team: foundUser.team,
        loginTime: new Date().toISOString()
      };
      
      setUser(userSession);
      localStorage.setItem('astra_user', JSON.stringify(userSession));
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { 
        success: false, 
        error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('astra_user');
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    isAuthenticated,
    isLoading
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