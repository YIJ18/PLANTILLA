# Scripts de utilidad para el backend

## Script para configuración inicial
# setup.py - Configura el proyecto inicial
import os
import sys
import django
from django.core.management import execute_from_command_line
from django.contrib.auth import get_user_model

def setup_project():
    """
    Configura el proyecto Django desde cero
    """
    print("🚀 Configurando proyecto Astra Backend...")
    
    # Ejecutar migraciones
    print("📋 Ejecutando migraciones...")
    execute_from_command_line(['manage.py', 'makemigrations'])
    execute_from_command_line(['manage.py', 'migrate'])
    
    # Crear superusuario si no existe
    print("👤 Configurando usuario administrador...")
    User = get_user_model()
    
    if not User.objects.filter(is_superuser=True).exists():
        User.objects.create_superuser(
            username='admin',
            email='admin@astra.com',
            password='admin123',
            first_name='Administrador',
            last_name='Sistema'
        )
        print("✅ Superusuario creado: admin@astra.com / admin123")
    
    # Crear datos de ejemplo
    print("📊 Creando datos de ejemplo...")
    create_sample_data()
    
    print("🎉 ¡Configuración completada!")
    print("🌐 Servidor: python manage.py runserver")
    print("📖 Documentación: http://localhost:8000/api/docs/")
    print("⚙️  Admin: http://localhost:8000/admin/")

def create_sample_data():
    """
    Crea datos de ejemplo para desarrollo
    """
    from accounts.models import User, UserProfile
    from telemetry.models import Sensor, TelemetryData, GyroscopeData
    from flights.models import Mission, Flight
    from django.utils import timezone
    import random
    
    # Crear usuarios de ejemplo
    if not User.objects.filter(email='operator@astra.com').exists():
        operator = User.objects.create_user(
            username='operator',
            email='operator@astra.com',
            password='operator123',
            first_name='Carlos',
            last_name='Operador',
            role='operator'
        )
        UserProfile.objects.create(user=operator)
    
    if not User.objects.filter(email='viewer@astra.com').exists():
        viewer = User.objects.create_user(
            username='viewer',
            email='viewer@astra.com',
            password='viewer123',
            first_name='Ana',
            last_name='Observadora',
            role='viewer'
        )
        UserProfile.objects.create(user=viewer)
    
    # Crear sensores de ejemplo
    sensors_data = [
        {'name': 'Giroscopio Principal', 'sensor_type': 'gyroscope', 'unit': '°'},
        {'name': 'Acelerómetro X', 'sensor_type': 'accelerometer', 'unit': 'm/s²'},
        {'name': 'GPS Principal', 'sensor_type': 'gps', 'unit': 'coords'},
        {'name': 'Altímetro', 'sensor_type': 'altimeter', 'unit': 'm'},
        {'name': 'Temperatura Motor', 'sensor_type': 'temperature', 'unit': '°C'},
        {'name': 'Presión Cabina', 'sensor_type': 'pressure', 'unit': 'Pa'},
        {'name': 'Nivel Batería', 'sensor_type': 'battery', 'unit': '%'},
    ]
    
    for sensor_data in sensors_data:
        if not Sensor.objects.filter(name=sensor_data['name']).exists():
            Sensor.objects.create(**sensor_data)
    
    # Crear misión de ejemplo
    admin_user = User.objects.filter(is_superuser=True).first()
    if admin_user and not Mission.objects.exists():
        mission = Mission.objects.create(
            name='Misión de Prueba Alpha',
            description='Misión de prueba del sistema de telemetría',
            status='active',
            priority='high',
            planned_start=timezone.now(),
            planned_end=timezone.now() + timezone.timedelta(hours=2),
            created_by=admin_user
        )
        
        # Crear vuelo de ejemplo
        operator_user = User.objects.filter(role='operator').first()
        if operator_user:
            Flight.objects.create(
                mission=mission,
                flight_number='ASTRA-001',
                aircraft_id='UAV-ALPHA-01',
                pilot=operator_user,
                status='active',
                departure_location='Base Astra',
                destination_location='Punto de Observación',
                departure_latitude=19.4326,
                departure_longitude=-99.1332,
                destination_latitude=19.5000,
                destination_longitude=-99.2000,
                planned_departure=timezone.now(),
                planned_arrival=timezone.now() + timezone.timedelta(hours=1)
            )

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'astra_backend.settings')
    django.setup()
    setup_project()