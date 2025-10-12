// Prueba simple de login desde el navegador
console.log('🚀 Iniciando prueba de login...');

async function testLogin() {
    try {
        console.log('📡 Enviando petición a Django backend...');
        
        const response = await fetch('http://127.0.0.1:8000/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@astra.com',
                password: 'admin123'
            })
        });

        console.log('📊 Estado de respuesta:', response.status);
        console.log('📋 Headers:', [...response.headers.entries()]);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Login exitoso!');
            console.log('🔑 Datos recibidos:', data);
            
            // Guardar token en localStorage
            localStorage.setItem('astra_access_token', data.access);
            localStorage.setItem('astra_refresh_token', data.refresh);
            localStorage.setItem('astra_user', JSON.stringify(data.user));
            
            console.log('💾 Tokens guardados en localStorage');
            return data;
        } else {
            const errorData = await response.json();
            console.log('❌ Error en login:', errorData);
            throw new Error(JSON.stringify(errorData));
        }
    } catch (error) {
        console.error('💥 Error en petición:', error);
        throw error;
    }
}

// Ejecutar la prueba
testLogin()
    .then(data => {
        console.log('🎉 Prueba completada exitosamente');
        console.log('👤 Usuario logueado:', data.user.full_name);
    })
    .catch(error => {
        console.error('🚨 Prueba fallida:', error.message);
    });