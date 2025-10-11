# 🚀 Astra CanSat Dashboard - Estación de Misión Caelus

![Astra Rocketry](./public/logo.png)

## 📖 Descripción

Dashboard profesional de telemetría en tiempo real para el proyecto **CanSat Caelus** del equipo **Astra Rocketry**. Esta aplicación web proporciona una interfaz completa para el monitoreo, análisis y visualización de datos de vuelo de satélites tipo CanSat, incluyendo gráficas interactivas, mapas GPS, visualización 3D con giroscopios y exportación de datos para análisis posterior.

## ✨ Características Principales

### 🎯 Dashboard en Tiempo Real
- **Modo Live**: Monitoreo en tiempo real con simulación de telemetría
- **Panel de Estado**: Visualización del estado del CanSat (batería, canal walkie, última actualización)
- **Control de Misión**: Tiempo de vuelo, velocidades vertical/horizontal, distancia recorrida
- **Sistema de Alertas**: Notificaciones automáticas para fallos de sensores, batería baja y pérdida de GPS

### 📊 Visualización de Datos
- **Gráficas Interactivas**: Temperatura, humedad, altitud, presión y canal walkie
- **Mapa GPS**: Visualización de trayectoria en tiempo real con marcadores
- **Visor 3D**: Representación tridimensional con datos del giroscopio
- **Animaciones Fluidas**: Interfaz responsiva con Framer Motion

### 💾 Gestión de Datos
- **Base de Datos Local**: Almacenamiento persistente con IndexedDB
- **Importación de Archivos**: Carga de datos desde archivos TXT/CSV
- **Exportación Completa**: Paquetes ZIP con datos, gráficas y metadatos
- **Historial de Vuelos**: Gestión y selección de vuelos guardados

### 🛠️ Funcionalidades Avanzadas
- **Sistema de Administración**: Control de acceso con autenticación y rutas protegidas
- **Editor Visual Inline**: Sistema de edición en tiempo real del código React
- **Modelo 3D Personalizable**: Carga de modelos OBJ para visualización
- **Cálculos Automáticos**: Velocidades, distancias y análisis de trayectoria
- **Interfaz Responsive**: Diseño adaptativo con Tailwind CSS
- **Gestión de Usuarios**: Sistema de roles y permisos diferenciados

## 🏗️ Arquitectura del Proyecto

```
astra-cansat-dashboard/
├── 📁 public/                 # Recursos estáticos
│   ├── 🎨 logo.png           # Logo de Astra Rocketry
│   └── 🎯 cansat.obj         # Modelo 3D del CanSat
├── 📁 src/                   # Código fuente principal
│   ├── 📄 App.jsx            # Componente principal de la aplicación
│   ├── 🎨 index.css          # Estilos globales y variables CSS
│   ├── 📄 main.jsx           # Punto de entrada con routing
│   ├── 📁 components/        # Componentes React
│   │   ├── 📊 ChartsGrid.jsx     # Grilla de gráficas
│   │   ├── 🗃️ FlightSelector.jsx # Selector de vuelos (original)
│   │   ├── 🗃️ FlightSelectorPublic.jsx # Versión solo lectura
│   │   ├── 🗃️ FlightSelectorAdmin.jsx  # Versión completa admin
│   │   ├── 🌐 MapSection.jsx     # Mapa GPS
│   │   ├── 🎯 GyroscopeViewer.jsx # Visor 3D
│   │   ├── 🎛️ MissionControl.jsx # Control de misión
│   │   ├── 📈 StatusPanel.jsx    # Panel de estado
│   │   ├── 📁 auth/              # Componentes de autenticación
│   │   │   ├── 🔐 LoginForm.jsx      # Formulario de login
│   │   │   ├── 🛡️ ProtectedRoute.jsx # Rutas protegidas
│   │   │   └── 👑 AdminLayout.jsx    # Layout de administración
│   │   └── 📁 ui/                # Componentes UI base
│   ├── 📁 contexts/          # Contextos de React
│   │   └── 🔐 AuthContext.jsx    # Contexto de autenticación
│   ├── 📁 pages/             # Páginas principales
│   │   ├── 🌍 PublicDashboard.jsx # Dashboard público
│   │   └── 👑 AdminDashboard.jsx  # Dashboard de administración
│   ├── 📁 lib/               # Librerías y utilidades
│   │   └── 💾 db.js              # Gestión de base de datos
│   └── 📁 utils/             # Utilidades
│       ├── 🧮 calculations.js    # Cálculos de vuelo
│       └── 📊 mockData.js        # Generación de datos de prueba
├── 📁 plugins/               # Plugins personalizados de Vite
│   └── 📁 visual-editor/     # Sistema de edición visual
└── 📁 tools/                 # Herramientas de desarrollo
    └── 🤖 generate-llms.js   # Generador de datos para LLMs
```

## 🚀 Instalación y Configuración

### 📋 Prerrequisitos
- **Node.js** >= 18.x
- **npm** >= 9.x
- Navegador moderno con soporte para ES6+

### ⚡ Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/astra-cansat-dashboard.git
cd astra-cansat-dashboard

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:3000
```

### 🔧 Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## 📱 Uso del Dashboard

### � Vista Pública (/)
La vista pública permite visualizar datos de vuelos sin capacidades de gestión:

- **Solo Lectura**: Visualización de vuelos guardados
- **Sin Gestión**: No permite cargar archivos ni modo live
- **Acceso Libre**: No requiere autenticación
- **Botón Admin**: Acceso directo al login de administración

### 👑 Panel de Administración (/admin)

#### 🔐 Acceso de Administrador
Para acceder al panel completo, usa estas credenciales de demo:

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `astra2024` | Administrador Astra |
| `mission-control` | `caelus2024` | Control de Misión |

#### �🎮 Funcionalidades Completas

**Modo en Vivo:**
1. Haz clic en **"Iniciar Modo Live"**
2. Introduce un nombre para el vuelo
3. Los datos se actualizarán automáticamente cada 2 segundos
4. Usa **"Detener Live"** para pausar la telemetría

**Importar Datos:**
1. Haz clic en **"Cargar Archivo"**
2. Selecciona un archivo TXT/CSV con el formato requerido
3. Los datos se parsearán y visualizarán automáticamente

**Gestión de Vuelos:**
- **Seleccionar Vuelo**: Usa el dropdown para cargar vuelos guardados
- **Eliminar Vuelos**: Botón de eliminación en cada vuelo guardado
- **Exportar**: Genera un paquete ZIP completo con datos y gráficas
- **Historial**: Todos los vuelos se guardan automáticamente en IndexedDB

### 🔄 Navegación entre Modos
- **Vista Pública → Admin**: Botón "Acceso Admin" en el selector de vuelos
- **Admin → Vista Pública**: Botón "Vista Pública" en el header de admin
- **Cerrar Sesión**: Botón "Cerrar Sesión" regresa a la vista pública

### 🗺️ Formato de Datos

```csv
timestamp,temp,humidity,alt,pressure,walkie,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,lat,lng
1635724800000,25.5,65.2,120.5,1001.2,8,0.1,-0.2,9.8,12.5,-3.4,45.2,40.7128,-74.0060
```

## 🎯 Componentes Principales

### 📊 ChartsGrid
- Gráficas interactivas con Chart.js
- Visualización de temperatura, humedad, altitud, presión
- Actualización en tiempo real

### 🗺️ MapSection
- Mapa interactivo con React Leaflet
- Marcadores de posición GPS
- Visualización de trayectoria completa

### 🎯 GyroscopeViewer
- Renderizado 3D con Three.js y React Three Fiber
- Carga de modelos OBJ personalizados
- Rotación basada en datos del giroscopio

### 🎛️ MissionControl
- Panel de control de misión
- Checklist automático de sistemas
- Log de eventos en tiempo real

## 🛠️ Tecnologías Utilizadas

### 🎨 Frontend
- **React 18** - Framework principal
- **Vite 4** - Build tool y dev server
- **React Router DOM** - Routing y navegación
- **Tailwind CSS** - Framework de estilos
- **Framer Motion** - Animaciones
- **Radix UI** - Componentes base accesibles

### 🔐 Autenticación y Seguridad
- **Context API** - Gestión de estado de autenticación
- **localStorage** - Persistencia de sesiones
- **Protected Routes** - Rutas protegidas por rol
- **Role-based Access** - Control de acceso basado en roles

### 📊 Visualización
- **Chart.js + React-ChartJS-2** - Gráficas interactivas
- **React Leaflet** - Mapas
- **Three.js + React Three Fiber** - Renderizado 3D
- **React Three Drei** - Utilidades 3D

### 💾 Gestión de Datos
- **IndexedDB** - Base de datos local
- **JSZip** - Exportación de archivos
- **HTML2Canvas** - Captura de gráficas
- **File-Saver** - Descarga de archivos

### 🔧 Herramientas de Desarrollo
- **ESLint** - Linting de código
- **PostCSS + Autoprefixer** - Procesamiento de CSS
- **Babel** - Transpilación para editor visual

## ⚙️ Configuración Avanzada

### 🎨 Personalización de Estilos
Los estilos utilizan variables CSS customizables en `src/index.css`:

```css
:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  /* ... más variables */
}
```

### 🛠️ Plugin de Editor Visual
El proyecto incluye un sistema de edición visual que permite:
- Edición inline de elementos React
- Transformación automática de JSX
- API de aplicación de cambios en tiempo real

### 🌐 Configuración de Red
Para desarrollo en red local, modifica `vite.config.js`:

```javascript
server: {
  host: '0.0.0.0', // Permitir conexiones externas
  port: 3000,
  cors: true
}
```

## � Sistema de Administración

### 👥 Roles y Permisos

**Vista Pública (`/`)**
- ✅ Visualización de vuelos guardados
- ✅ Acceso a gráficas y mapas
- ✅ Visor 3D (solo lectura)
- ❌ Gestión de archivos
- ❌ Modo en vivo
- ❌ Exportación de datos

**Administrador (`/admin`)**
- ✅ Todas las funciones públicas
- ✅ Carga de archivos de telemetría
- ✅ Modo de monitoreo en vivo
- ✅ Eliminación de vuelos
- ✅ Exportación completa
- ✅ Grabación de videos 3D
- ✅ Carga de modelos 3D personalizados

### 🛡️ Seguridad
- **Autenticación Local**: Sistema de login con credenciales predefinidas
- **Persistencia de Sesión**: Las sesiones se mantienen en localStorage
- **Rutas Protegidas**: Acceso controlado a funcionalidades administrativas
- **Validación de Roles**: Verificación de permisos en tiempo real
- **Timeout de Sesión**: (Implementable según necesidades)

### 🔧 Configuración de Usuarios
Actualmente usa usuarios predefinidos en `AuthContext.jsx`:
```javascript
const DEMO_USERS = [
  {
    username: 'admin',
    password: 'astra2024',
    name: 'Administrador Astra',
    role: 'admin'
  },
  // ... más usuarios
];
```

## 🔍 Cálculos y Algoritmos

### 📏 Cálculo de Distancias
Utiliza la fórmula de Haversine para calcular distancias entre coordenadas GPS:

```javascript
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  // ... implementación completa
}
```

### 📊 Análisis de Velocidades
- **Velocidad Vertical**: Cambio de altitud / tiempo
- **Velocidad Horizontal**: Distancia GPS / tiempo
- **Distancia Total**: Suma acumulativa de segmentos

## 🚨 Sistema de Alertas

El dashboard incluye un sistema inteligente de alertas:

- **🔋 Batería Crítica**: Alerta cuando < 20%
- **🌡️ Sensor de Temperatura**: Detecta fallos (valor 0)
- **📡 Pérdida de GPS**: Sin actualización por 10+ segundos
- **📻 Canal Walkie**: Monitoreo de frecuencia

## 📦 Exportación de Datos

### 📋 Contenido del Paquete ZIP
- `metadata.json` - Información del vuelo
- `{nombre}_data.txt` - Datos en formato CSV
- `grafica_*.png` - Capturas de todas las gráficas
- `mapa_*.png` - Captura del mapa
- `status_*.png` - Panel de estado
- `astra_logo.png` - Logo del equipo

## 🐛 Troubleshooting

### ❌ Problemas Comunes

**Error de instalación de dependencias:**
```bash
# Limpiar caché de npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Problemas con el servidor de desarrollo:**
```bash
# Verificar puerto disponible
netstat -ano | findstr :3000
# Cambiar puerto en package.json si es necesario
```

**Errores de memoria en build:**
```bash
# Aumentar memoria para Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

## 🤝 Contribución

### 📝 Flujo de Contribución
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### 📏 Estándares de Código
- Usar ESLint para consistencia
- Comentarios en español para el equipo
- Componentes funcionales con hooks
- Props tipadas cuando sea posible

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 👥 Equipo Astra Rocketry

**Misión Caelus - Universidad Iberoamericana**

- 🚀 Desarrollo de CanSat
- 📡 Sistemas de Telemetría  
- 💻 Dashboard de Monitoreo
- 🎯 Análisis de Datos de Vuelo

---

### 📞 Contacto

Para dudas técnicas o colaboración, contacta al equipo de desarrollo.

**¡Vuela alto con Astra Rocketry! 🚀**
