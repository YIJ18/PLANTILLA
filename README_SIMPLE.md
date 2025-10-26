# Sistema ASTRA COM5 - Versión Node

## 🚀 ¿Qué hace este sistema?
Lee datos del puerto COM5 (o el puerto serial que configures) y los guarda en archivos CSV, mostrando la telemetría en tiempo real en una app React.

## 📁 Archivos importantes
- `backend/node-api/index.js` - Servidor Node (Express + serialport) que maneja COM5 y la API REST
- `backend/csv_flights/` - Carpeta donde se guardan los CSV normalizados
- `package.json` - Scripts para arrancar el backend y frontend juntos

## 🖱️ Cómo usar

### 1) Instalar dependencias (una sola vez)
```powershell
npm install
```

### 2) Arrancar backend + frontend juntos
```powershell
npm run dev
```
- API Node: http://127.0.0.1:5000/api
- Frontend: http://localhost:3000

### 3) Desde la interfaz
1. Ve al Admin Dashboard
2. Ingresa un nombre de vuelo
3. Clic en "Iniciar Vuelo COM5"
4. Verás la telemetría en tiempo real; los CSV se guardan en `backend/csv_flights/`

## ❌ Si hay problemas
- COM5 ocupado: cierra cualquier app que use el puerto y vuelve a intentar
- Ver puertos disponibles: GET `http://127.0.0.1:5000/api/test/serial`
- Ver estado serial: GET `http://127.0.0.1:5000/api/serial/status`

## 🧹 Limpieza realizada
- Proyecto migrado a Node: Express + serialport
- Eliminados archivos de Flask/Python y scripts .bat
- Documentación actualizada para Node-only

## 📞 Arquitectura
React (Vite) ↔ API Node (Express) ↔ COM5 → CSV (backend/csv_flights)