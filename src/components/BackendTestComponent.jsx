import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const BackendTestComponent = () => {
  const [testResult, setTestResult] = useState('Probando conexión...');
  const [apiData, setApiData] = useState(null);
  const { apiRequest, user } = useAuth();

  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        // Test básico de conexión
        const response = await fetch('http://127.0.0.1:8000/api/auth/profile/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('astra_access_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTestResult('✅ Conexión exitosa con Django backend');
          setApiData(data);
        } else {
          setTestResult(`❌ Error: ${response.status} - ${response.statusText}`);
        }
      } catch (error) {
        setTestResult(`💥 Error de conexión: ${error.message}`);
      }
    };

    if (user) {
      testBackendConnection();
    }
  }, [user]);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">🔧 Test de Conexión Backend</h3>
      
      <div className="space-y-4">
        <div className="text-green-400">
          <strong>Estado:</strong> {testResult}
        </div>
        
        {user && (
          <div className="text-blue-400">
            <strong>Usuario autenticado:</strong> {user.email} ({user.name})
          </div>
        )}

        {apiData && (
          <div className="text-purple-400">
            <strong>Datos del backend:</strong>
            <pre className="text-xs bg-gray-900 p-2 rounded mt-2 overflow-auto">
              {JSON.stringify(apiData, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-gray-400 text-sm">
          <p>📡 Backend: http://127.0.0.1:8000</p>
          <p>🌐 Frontend: http://localhost:3000</p>
          <p>🔑 Token: {localStorage.getItem('astra_access_token') ? '✅ Presente' : '❌ Ausente'}</p>
        </div>
      </div>
    </div>
  );
};

export default BackendTestComponent;