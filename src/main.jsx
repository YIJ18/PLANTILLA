import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { PublicDisplayProvider } from '@/contexts/PublicDisplayContext';
import PublicDashboard from '@/pages/PublicDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import LoginForm from '@/components/auth/LoginForm';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PublicDisplayProvider>
        <Router>
          <Routes>
            {/* Ruta pública principal */}
            <Route path="/" element={<PublicDashboard />} />
            
            {/* Ruta de login */}
            <Route path="/login" element={<LoginForm />} />
            
            {/* Rutas protegidas de administración */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Redirección de rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </PublicDisplayProvider>
    </AuthProvider>
  </React.StrictMode>
);