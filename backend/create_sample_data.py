"""
Script para crear datos de ejemplo en el sistema Astra
Ejecutar con: python create_sample_data.py
"""

import os
import sys
import django
from django.utils import timezone
from datetime import timedelta

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'astra_backend.settings')
django.setup()

from accounts.models import User, UserProfile
from telemetry.models import Sensor, TelemetryData, GyroscopeData, Alert
from flights.models import Mission, Flight, FlightPath
import random

def create_sample_data():
    print("🚀 Creando datos de ejemplo para Astra...")
    
    # Crear usuarios de ejemplo
    print("👥 Creando usuarios...")
    
    # Operador
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
        print("   ✅ Operador creado: operator@astra.com / operator123")
    
    # Visualizador
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
        print("   ✅ Visualizador creado: viewer@astra.com / viewer123")
    
    # Crear sensores
    print("🔧 Creando sensores...")
    sensors_data = [
        {'name': 'Giroscopio Principal', 'sensor_type': 'gyroscope', 'unit': '°', 'min_value': -180, 'max_value': 180},
        {'name': 'Acelerómetro X', 'sensor_type': 'accelerometer', 'unit': 'm/s²', 'min_value': -50, 'max_value': 50},
        {'name': 'GPS Principal', 'sensor_type': 'gps', 'unit': 'coords', 'min_value': None, 'max_value': None},
        {'name': 'Altímetro', 'sensor_type': 'altimeter', 'unit': 'm', 'min_value': 0, 'max_value': 10000},
        {'name': 'Temperatura Motor', 'sensor_type': 'temperature', 'unit': '°C', 'min_value': -40, 'max_value': 150},
        {'name': 'Presión Cabina', 'sensor_type': 'pressure', 'unit': 'Pa', 'min_value': 0, 'max_value': 200000},
        {'name': 'Nivel Batería', 'sensor_type': 'battery', 'unit': '%', 'min_value': 0, 'max_value': 100},
        {'name': 'Brújula Digital', 'sensor_type': 'compass', 'unit': '°', 'min_value': 0, 'max_value': 360},
    ]
    
    sensors = []
    for sensor_data in sensors_data:
        sensor, created = Sensor.objects.get_or_create(
            name=sensor_data['name'],
            defaults=sensor_data
        )
        sensors.append(sensor)
        if created:
            print(f"   ✅ Sensor creado: {sensor.name}")
    
    # Crear misión de ejemplo
    print("🎯 Creando misión...")
    admin_user = User.objects.filter(is_superuser=True).first()
    operator_user = User.objects.filter(role='operator').first()
    
    if admin_user and not Mission.objects.filter(name='Misión de Prueba Alpha').exists():
        mission = Mission.objects.create(
            name='Misión de Prueba Alpha',
            description='Misión de prueba del sistema de telemetría Astra. Incluye vuelo de reconocimiento y pruebas de sensores.',
            status='active',
            priority='high',
            planned_start=timezone.now() - timedelta(hours=1),
            planned_end=timezone.now() + timedelta(hours=3),
            created_by=admin_user
        )
        
        if operator_user:
            mission.assigned_to.add(operator_user)
        
        print(f"   ✅ Misión creada: {mission.name}")
        
        # Crear vuelo de ejemplo
        if operator_user:
            flight = Flight.objects.create(
                mission=mission,
                flight_number='ASTRA-001',
                aircraft_id='UAV-ALPHA-01',
                pilot=operator_user,
                status='active',
                departure_location='Base Astra - Hangar 1',
                destination_location='Zona de Observación Norte',
                departure_latitude=19.4326,
                departure_longitude=-99.1332,
                destination_latitude=19.5000,
                destination_longitude=-99.2000,
                planned_departure=timezone.now() - timedelta(minutes=30),
                planned_arrival=timezone.now() + timedelta(minutes=90),
                actual_departure=timezone.now() - timedelta(minutes=25),
                notes='Vuelo de prueba del sistema. Condiciones meteorológicas favorables.'
            )
            print(f"   ✅ Vuelo creado: {flight.flight_number}")
            
            # Crear algunos puntos de ruta
            print("📍 Creando ruta de vuelo...")
            base_lat, base_lon = 19.4326, -99.1332
            dest_lat, dest_lon = 19.5000, -99.2000
            
            for i in range(10):
                # Interpolación lineal entre origen y destino
                progress = i / 9
                lat = base_lat + (dest_lat - base_lat) * progress
                lon = base_lon + (dest_lon - base_lon) * progress
                altitude = 100 + random.randint(0, 200) + (i * 50)  # Ascenso gradual
                speed = 15 + random.randint(-3, 8)  # Velocidad variable
                
                FlightPath.objects.create(
                    flight=flight,
                    timestamp=timezone.now() - timedelta(minutes=25-i*2),
                    latitude=lat,
                    longitude=lon,
                    altitude=altitude,
                    speed=speed,
                    heading=45 + random.randint(-10, 10)
                )
            
            print("   ✅ Ruta de vuelo creada")
    
    # Crear datos de telemetría de ejemplo
    print("📊 Creando datos de telemetría...")
    now = timezone.now()
    
    for sensor in sensors[:5]:  # Solo para los primeros 5 sensores
        for i in range(20):  # 20 lecturas por sensor
            timestamp = now - timedelta(minutes=i*2)
            
            # Generar valores realistas según el tipo de sensor
            if sensor.sensor_type == 'temperature':
                value = 25 + random.randint(-5, 25)  # 20-50°C
            elif sensor.sensor_type == 'battery':
                value = 100 - (i * 2) + random.randint(-5, 5)  # Descarga gradual
            elif sensor.sensor_type == 'altimeter':
                value = 150 + random.randint(-20, 100)  # Altitud variable
            elif sensor.sensor_type == 'pressure':
                value = 101325 + random.randint(-1000, 1000)  # Presión atmosférica
            else:
                value = random.uniform(sensor.min_value or 0, sensor.max_value or 100)
            
            # Determinar calidad basada en el valor
            if sensor.min_value is not None and sensor.max_value is not None:
                if value < sensor.min_value * 1.1 or value > sensor.max_value * 0.9:
                    quality = 'warning'
                elif value < sensor.min_value * 1.05 or value > sensor.max_value * 0.95:
                    quality = 'critical'
                else:
                    quality = 'good'
            else:
                quality = 'good'
            
            TelemetryData.objects.create(
                sensor=sensor,
                value=value,
                timestamp=timestamp,
                latitude=19.4326 + random.uniform(-0.01, 0.01),
                longitude=-99.1332 + random.uniform(-0.01, 0.01),
                altitude=150 + random.randint(-20, 100),
                quality=quality
            )
    
    print("   ✅ Datos de telemetría creados")
    
    # Crear datos de giroscopio
    print("🌀 Creando datos de giroscopio...")
    for i in range(15):
        GyroscopeData.objects.create(
            timestamp=now - timedelta(minutes=i*3),
            roll=random.uniform(-45, 45),
            pitch=random.uniform(-30, 30),
            yaw=random.uniform(0, 360),
            angular_velocity_x=random.uniform(-10, 10),
            angular_velocity_y=random.uniform(-10, 10),
            angular_velocity_z=random.uniform(-15, 15)
        )
    
    print("   ✅ Datos de giroscopio creados")
    
    # Crear algunas alertas
    print("🚨 Creando alertas...")
    critical_data = TelemetryData.objects.filter(quality='critical').first()
    warning_data = TelemetryData.objects.filter(quality='warning').first()
    
    if critical_data:
        Alert.objects.create(
            title='Temperatura Motor Crítica',
            message=f'La temperatura del motor ha alcanzado {critical_data.value}°C, superando el umbral crítico.',
            alert_type='critical',
            sensor=critical_data.sensor,
            telemetry_data=critical_data
        )
    
    if warning_data:
        Alert.objects.create(
            title='Batería Baja',
            message=f'El nivel de batería está en {warning_data.value}%, considera aterrizar pronto.',
            alert_type='warning',
            sensor=warning_data.sensor,
            telemetry_data=warning_data
        )
    
    Alert.objects.create(
        title='Sistema Iniciado',
        message='El sistema de telemetría Astra ha sido iniciado correctamente.',
        alert_type='info'
    )
    
    print("   ✅ Alertas creadas")
    
    print("\n🎉 ¡Datos de ejemplo creados exitosamente!")
    print("\n📋 Resumen:")
    print(f"   👥 Usuarios: {User.objects.count()}")
    print(f"   🔧 Sensores: {Sensor.objects.count()}")
    print(f"   📊 Datos de telemetría: {TelemetryData.objects.count()}")
    print(f"   🌀 Datos de giroscopio: {GyroscopeData.objects.count()}")
    print(f"   🎯 Misiones: {Mission.objects.count()}")
    print(f"   ✈️ Vuelos: {Flight.objects.count()}")
    print(f"   🚨 Alertas: {Alert.objects.count()}")
    
    print("\n🌐 URLs importantes:")
    print("   📖 Documentación API: http://127.0.0.1:8000/api/docs/")
    print("   ⚙️  Panel Admin: http://127.0.0.1:8000/admin/")
    print("   🔑 Login API: http://127.0.0.1:8000/api/auth/login/")

if __name__ == '__main__':
    create_sample_data()