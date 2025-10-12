# Backend Django - Astra Telemetry System

Este es el backend del sistema de telemetría Astra, desarrollado con Django y Django REST Framework.

## Características

- **Autenticación JWT**: Sistema de autenticación seguro con tokens
- **API REST completa**: Endpoints para usuarios, telemetría, vuelos y misiones
- **Documentación automática**: Swagger/OpenAPI integrado
- **Roles de usuario**: Admin, Operador, Visualizador
- **Gestión de telemetría**: Sensores, datos en tiempo real, alertas
- **Sistema de vuelos**: Misiones, vuelos, rutas de vuelo
- **Panel de administración**: Interface completa de Django Admin

## Instalación

### Requisitos

- Python 3.8+
- pip
- virtualenv (recomendado)

### Configuración del entorno

1. **Crear entorno virtual**:
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

2. **Instalar dependencias**:
```bash
pip install -r requirements.txt
```

3. **Configurar variables de entorno**:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Ejecutar migraciones**:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. **Crear superusuario**:
```bash
python manage.py createsuperuser
```

6. **Ejecutar servidor de desarrollo**:
```bash
python manage.py runserver
```

## Estructura del Proyecto

```
backend/
├── astra_backend/          # Configuración principal
│   ├── settings.py         # Configuraciones Django
│   ├── urls.py            # URLs principales
│   └── wsgi.py            # WSGI para producción
├── accounts/              # App de usuarios
│   ├── models.py          # User, UserProfile
│   ├── views.py           # APIs de autenticación
│   └── serializers.py     # Serializadores JWT
├── telemetry/             # App de telemetría
│   ├── models.py          # Sensor, TelemetryData, Alert
│   ├── views.py           # APIs de telemetría
│   └── serializers.py     # Serializadores de datos
├── flights/               # App de vuelos
│   ├── models.py          # Mission, Flight, FlightPath
│   ├── views.py           # APIs de vuelos
│   └── serializers.py     # Serializadores de vuelos
└── requirements.txt       # Dependencias Python
```

## APIs Disponibles

### Autenticación
- `POST /api/auth/login/` - Iniciar sesión
- `POST /api/auth/refresh/` - Renovar token
- `POST /api/auth/logout/` - Cerrar sesión
- `GET /api/auth/profile/` - Perfil del usuario actual

### Usuarios
- `GET /api/auth/users/` - Listar usuarios
- `POST /api/auth/users/create/` - Crear usuario
- `GET /api/auth/users/{id}/` - Obtener usuario
- `PUT /api/auth/users/{id}/` - Actualizar usuario

### Telemetría
- `GET /api/telemetry/sensors/` - Listar sensores
- `POST /api/telemetry/sensors/` - Crear sensor
- `GET /api/telemetry/data/` - Obtener datos de telemetría
- `POST /api/telemetry/data/` - Registrar datos
- `GET /api/telemetry/gyroscope/` - Datos del giroscopio
- `GET /api/telemetry/alerts/` - Listar alertas
- `GET /api/telemetry/stats/` - Estadísticas generales

### Vuelos
- `GET /api/flights/missions/` - Listar misiones
- `POST /api/flights/missions/` - Crear misión
- `GET /api/flights/flights/` - Listar vuelos
- `POST /api/flights/flights/` - Crear vuelo
- `PATCH /api/flights/flights/{id}/status/` - Actualizar estado
- `GET /api/flights/dashboard/` - Dashboard de vuelos
- `GET /api/flights/history/` - Historial de vuelos

## Documentación API

Una vez ejecutando el servidor, puedes acceder a:

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/
- **Schema JSON**: http://localhost:8000/api/schema/

## Configuración para Producción

### Variables de Entorno

```bash
DEBUG=False
SECRET_KEY=tu-clave-secreta-muy-segura
ALLOWED_HOSTS=tu-dominio.com
DATABASE_URL=postgresql://user:pass@localhost/dbname
CORS_ALLOWED_ORIGINS=https://tu-frontend.com
```

### Base de Datos

Para PostgreSQL:
```bash
pip install psycopg2-binary
```

Configurar en `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/astra_db
```

### Servidor de Producción

```bash
# Recopilar archivos estáticos
python manage.py collectstatic

# Ejecutar con Gunicorn
gunicorn astra_backend.wsgi:application --bind 0.0.0.0:8000
```

## Roles de Usuario

### Administrador (`admin`)
- Acceso completo al sistema
- Crear/editar/eliminar usuarios
- Configurar sensores y alertas
- Gestionar misiones y vuelos

### Operador (`operator`)
- Crear y gestionar vuelos
- Actualizar estados de vuelos
- Ver todas las telemetrías
- Reconocer alertas

### Visualizador (`viewer`)
- Solo lectura de datos
- Ver dashboards y estadísticas
- Acceso a su propio perfil

## Desarrollo

### Ejecutar tests
```bash
python manage.py test
```

### Crear migraciones
```bash
python manage.py makemigrations
python manage.py migrate
```

### Shell Django
```bash
python manage.py shell
```

### Cargar datos de ejemplo
```bash
python manage.py loaddata fixtures/sample_data.json
```

## Conectar con el Frontend

El backend está configurado para trabajar con el frontend React/Vite. Asegúrate de:

1. **CORS configurado** para permitir solicitudes del frontend
2. **URLs consistentes** entre frontend y backend
3. **Autenticación JWT** implementada en el frontend
4. **Manejo de errores** apropiado en ambos lados

### Ejemplo de uso desde el frontend:

```javascript
// Login
const response = await fetch('http://localhost:8000/api/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// API call con token
const response = await fetch('http://localhost:8000/api/telemetry/data/', {
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

## Soporte

Para problemas o preguntas sobre el backend, revisa:

1. Los logs del servidor Django
2. La documentación de la API en `/api/docs/`
3. El panel de administración en `/admin/`
4. Los tests unitarios para ejemplos de uso