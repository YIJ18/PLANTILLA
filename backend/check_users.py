#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'astra_backend.settings')
django.setup()

from accounts.models import User
from django.contrib.auth import authenticate

def check_and_create_users():
    print("🔍 Verificando usuarios existentes...")
    
    # Lista de usuarios a verificar/crear
    users_data = [
        {
            'email': 'admin@astra.com',
            'username': 'admin',
            'first_name': 'Administrador',
            'last_name': 'Astra',
            'role': 'admin',
            'department': 'Administración',
            'password': 'admin123',
            'is_staff': True,
            'is_superuser': True
        },
        {
            'email': 'operator@astra.com', 
            'username': 'operator',
            'first_name': 'Operador',
            'last_name': 'Control',
            'role': 'operator',
            'department': 'Control de Misión',
            'password': 'operator123'
        },
        {
            'email': 'analyst@astra.com',
            'username': 'analyst', 
            'first_name': 'Analista',
            'last_name': 'Datos',
            'role': 'viewer',
            'department': 'Análisis',
            'password': 'analyst123'
        }
    ]
    
    for user_data in users_data:
        email = user_data['email']
        password = user_data.pop('password')
        
        # Verificar si el usuario ya existe
        try:
            user = User.objects.get(email=email)
            print(f"✅ Usuario existente: {email}")
            
            # Verificar autenticación
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                print(f"  ✅ Autenticación correcta para {email}")
            else:
                print(f"  ❌ Autenticación fallida para {email}, actualizando contraseña...")
                user.set_password(password)
                user.save()
                
                # Probar de nuevo
                auth_user = authenticate(username=email, password=password)
                if auth_user:
                    print(f"  ✅ Contraseña actualizada correctamente para {email}")
                else:
                    print(f"  ❌ Error persistente en autenticación para {email}")
                    
        except User.DoesNotExist:
            print(f"❌ Usuario no existe: {email}, creando...")
            
            # Crear el usuario
            user = User.objects.create_user(**user_data)
            user.set_password(password)
            user.save()
            
            print(f"✅ Usuario creado: {email}")
            
            # Verificar autenticación
            auth_user = authenticate(username=email, password=password)
            if auth_user:
                print(f"  ✅ Autenticación correcta para nuevo usuario {email}")
            else:
                print(f"  ❌ Error en autenticación para nuevo usuario {email}")
    
    print(f"\n📊 Total de usuarios en la base de datos: {User.objects.count()}")
    
    print("\n🔑 Prueba de autenticación directa:")
    test_user = authenticate(username='admin@astra.com', password='admin123')
    if test_user:
        print(f"✅ Test exitoso: {test_user.email} - {test_user.full_name}")
    else:
        print("❌ Test de autenticación falló")

if __name__ == '__main__':
    check_and_create_users()