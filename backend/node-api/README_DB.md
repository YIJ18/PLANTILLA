# Almacenamiento de vuelos (lowdb)

Este backend ahora persiste metadatos de vuelos y telemetría usando lowdb (JSON) además de los CSV normalizados.

- Archivo de BD: backend/node-api/data/db.json (se crea automáticamente)
- Directorio CSV: backend/csv_flights

Flujo:
- Al iniciar “Iniciar Vuelo COM11” (POST /api/serial/execute-direct) se crea un registro de vuelo y se empieza a guardar cada paquete de datos en la BD y en CSV.
- Al detener el vuelo (POST /api/serial/stop) o si se cierra el puerto, el vuelo se marca como “completed”.

Endpoints nuevos:
- GET /api/flights → lista de vuelos { flights: [...], dbPath }
- GET /api/flights/:id/telemetry?limit=1000 → filas de telemetría del vuelo

Dependencia:
- lowdb ^7 (ya agregada en package.json)

Notas:
- El buffer escribe cada ~1s o cada 10 lecturas (lo que ocurra primero).
- Para un almacenamiento más robusto se puede migrar a SQLite más adelante.