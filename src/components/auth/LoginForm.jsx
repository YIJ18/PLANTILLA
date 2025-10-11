import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Lock, User, Rocket, Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      toast({
        title: "¡Bienvenido!",
        description: "Inicio de sesión exitoso",
      });
    } else {
      toast({
        title: "Error de autenticación",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  const demoCredentials = [
    { username: 'admin', password: 'astra2024', role: 'Administrador Astra' },
    { username: 'mission-control', password: 'caelus2024', role: 'Control de Misión' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 retro-grid flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-black/50 backdrop-blur-md border border-blue-500/30 rounded-lg p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/logo.png"
                alt="Astra Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold astra-title text-white mb-2">
              ADMIN ACCESS
            </h1>
            <p className="text-blue-400">
              Astra CanSat Dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Ingresa tu usuario"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Ingresa tu contraseña"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Credenciales de Demo
            </h3>
            <div className="space-y-2 text-xs">
              {demoCredentials.map((cred, index) => (
                <div key={index} className="bg-gray-900/50 p-2 rounded border border-gray-600">
                  <div className="text-blue-400 font-medium">{cred.role}</div>
                  <div className="text-gray-300">
                    Usuario: <span className="font-mono text-blue-300">{cred.username}</span>
                  </div>
                  <div className="text-gray-300">
                    Contraseña: <span className="font-mono text-blue-300">{cred.password}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginForm;