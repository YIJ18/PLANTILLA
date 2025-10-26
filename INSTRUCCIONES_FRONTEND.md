# 🚀 Uso desde el Frontend (Node API)

## ✅ Flujo actual
La app usa un backend en Node (Express + serialport). No se requiere Flask ni scripts .bat.

## Cómo ejecutar
1) Instala dependencias (una vez):
```powershell
npm install
```
2) Arranca todo:
```powershell
npm run dev
```
3) Abre http://localhost:3000 y ve al Admin Dashboard.

## Botones en la UI
-- "Iniciar Vuelo COM5": inicia la lectura por el endpoint Node `/api/serial/start` (requiere nombre de vuelo)
-- "⚡ Ejecutar COM5 Directo": usa `/api/serial/execute-direct` para arrancar de inmediato

Ambos guardan CSV normalizados en `backend/csv_flights/` y actualizan la telemetría en vivo.

## CSV
- Ubicación: `backend/csv_flights/`
- Formato: `flight_[nombre]_[fecha]_normalized.csv`
- Contenido: timestamp, roll, pitch, yaw, accel_x/y/z, temperature, humidity, pressure, lat, lon, altitude, satellites, rssi, snr

## Solución de problemas
- Ver estado: GET `http://127.0.0.1:5000/api/serial/status`
-- Probar puertos: GET `http://127.0.0.1:5000/api/test/serial`
-- Puerto en uso: cierre apps que usen COM5 y vuelva a iniciar