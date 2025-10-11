import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, User, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    });
    navigate('/');
  };

  const handleGoToPublic = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 retro-grid">
      {/* Admin Header */}
      <header className="bg-black/50 backdrop-blur-md border-b border-blue-500/30 relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and title */}
            <motion.div
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="/logo.png"
                alt="Astra Logo"
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold astra-title">
                  ADMIN PANEL
                </h1>
                <p className="text-blue-400 text-sm">
                  Astra CanSat Dashboard
                </p>
              </div>
            </motion.div>

            {/* Right side - User info and actions */}
            <motion.div
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* User info */}
              <div className="hidden md:block text-right">
                <div className="flex items-center text-white text-sm">
                  <Shield className="w-4 h-4 mr-2 text-blue-400" />
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="text-gray-400 text-xs">
                  {user?.team} • {user?.role}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handleGoToPublic}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:text-white hover:border-blue-500"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Vista Pública
                </Button>
                
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="border-red-600 text-red-400 hover:text-white hover:border-red-500 hover:bg-red-600/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Admin badge */}
        <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
          MODO ADMINISTRADOR
        </div>
      </header>

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Admin Footer */}
      <footer className="bg-black/30 border-t border-gray-700 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Conectado como: {user?.username}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Sesión iniciada: {new Date(user?.loginTime).toLocaleString()}</span>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Conectado" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;