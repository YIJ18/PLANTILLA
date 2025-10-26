const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const knex = require('knex');
const knexConfig = require('./knexfile');

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());

// Crear servidor HTTP y adjuntar Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, deberías restringir esto a tu dominio de frontend
    methods: ["GET", "POST"]
  }
});

// Conectar a la base de datos
const db = knex(knexConfig.development);

// Importar y usar las rutas de autenticación
const authRoutes = require('./routes/auth')(db);
app.use('/api/auth', authRoutes);

const serialService = require('./services/serialService');
serialService.init(db, io);

// Export endpoint: build CSVs of given tables and stream a ZIP
const archiver = require('archiver');
const stream = require('stream');

app.get('/api/export/all-csv', async (req, res) => {
  try {
    // Allow filtering by flightId or flightName
    const { flightId: qFlightId, flightName } = req.query || {};
    let resolvedFlightId = null;
    if (qFlightId) resolvedFlightId = Number(qFlightId);
    else if (flightName) {
      try {
        const f = await db('flights').where({ name: flightName }).first();
        if (f && f.id) resolvedFlightId = Number(f.id);
      } catch (e) {
        // ignore - we'll fallback to exporting all tables
      }
    }

    // If a flight id is provided/resolved, only export flight-scoped tables
    const allTables = ['flight_events','flights','knex_migrations','knex_migrations_lock','sqlite_sequence','telemetry_data','users'];
    const tables = resolvedFlightId ? ['flights','telemetry_data','flight_events'] : allTables;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="astra_export_${Date.now()}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    // Helper: convert rows to CSV string
    const toCSV = (rows) => {
      if (!rows || rows.length === 0) return '';
      const cols = Object.keys(rows[0]);
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      const header = cols.join(',') + '\n';
      const lines = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
      return header + lines + '\n';
    };

    for (const t of tables) {
      try {
        let rows = [];
        if (resolvedFlightId) {
          if (t === 'flights') {
            const row = await db('flights').where({ id: resolvedFlightId }).select('*');
            rows = row || [];
          } else if (t === 'telemetry_data') {
            rows = await db('telemetry_data').where({ flight_id: resolvedFlightId }).select('*');
          } else if (t === 'flight_events') {
            rows = await db('flight_events').where({ flight_id: resolvedFlightId }).select('*');
          } else {
            rows = await db(t).select('*');
          }
        } else {
          rows = await db(t).select('*');
        }
        const csv = toCSV(rows);
        // Name files so flight-scoped ones include the flight id when applicable
        const filename = resolvedFlightId ? `${t}_flight_${resolvedFlightId}.csv` : `${t}.csv`;
        archive.append(csv, { name: filename });
      } catch (e) {
        // On error, include a small text file describing the error
        archive.append(`Error exporting table ${t}: ${e.message}\n`, { name: `${t}_error.txt` });
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error in /api/export/all-csv:', error);
    res.status(500).json({ message: 'Error al generar el paquete de exportación.', error: error.message });
  }
});

// --- Endpoints de la API ---

// Endpoint de salud para verificar que el servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API de Node.js para CanSat funcionando' });
});

// Test endpoint: inject a raw serial line to be parsed (useful for dev)
app.post('/api/test/serial', async (req, res) => {
  const { line } = req.body || {};
  if (!line) return res.status(400).json({ message: 'Se requiere campo `line` en el body.' });
  try {
    const { flightId } = req.body || {};
    if (flightId && typeof serialService.injectLineForFlight === 'function') {
      await serialService.injectLineForFlight(Number(flightId), line);
      // Return the latest telemetry row for that flight as confirmation
      try {
        const latest = await db('telemetry_data').where({ flight_id: Number(flightId) }).orderBy('id', 'desc').first();
        return res.json({ success: true, message: 'Linea enviada al parser para flightId ' + flightId, latest });
      } catch (qerr) {
        console.error('Error querying latest telemetry after inject:', qerr);
        return res.json({ success: true, message: 'Linea enviada al parser para flightId ' + flightId });
      }
    }
    if (typeof serialService.handleSerialData === 'function') {
      await serialService.handleSerialData(line);
      return res.json({ success: true, message: 'Linea enviada al parser.' });
    }
    return res.status(501).json({ success: false, message: 'Funcionalidad no disponible en este servicio.' });
  } catch (e) {
    console.error('Error in /api/test/serial:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Debug endpoint: get serial service status
app.get('/api/debug/serial', (req, res) => {
  try {
    const status = {
      isReading: typeof serialService.isReading === 'function' ? serialService.isReading() : !!serialService.isReading,
      currentFlightId: typeof serialService.getCurrentFlightId === 'function' ? serialService.getCurrentFlightId() : null
    };
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start a flight and listen to COM port
app.post('/api/flights/start', async (req, res) => {
  const { flightName, port, baudRate } = req.body;
  const { createOnly } = req.body || {};
  try {
    if (typeof serialService.isReading === 'function' ? serialService.isReading() : serialService.isReading) {
      return res.status(409).json({ message: 'Un vuelo ya está en progreso.' });
    }
  } catch (e) {
    console.warn('No se pudo comprobar el estado de lectura del servicio serial:', e.message || e);
  }
  try {
    // If frontend requested to only create the flight row (no serial), support that for test/dev
    if (createOnly) {
      if (!flightName) return res.status(400).json({ message: 'flightName requerido cuando createOnly=true' });
      try {
        // Reuse creation logic similar to /api/flights/create
        let insertResult;
        try {
          insertResult = await db('flights').insert({ name: flightName, start_time: new Date().toISOString() }).returning('id');
        } catch (e) {
          const ids = await db('flights').insert({ name: flightName, start_time: new Date().toISOString() });
          insertResult = ids;
        }
        let resolvedId = null;
        if (Array.isArray(insertResult) && insertResult.length > 0) {
          const first = insertResult[0];
          if (typeof first === 'object' && first !== null && ('id' in first)) resolvedId = first.id;
          else if (typeof first === 'number' || typeof first === 'string') resolvedId = Number(first);
        } else if (typeof insertResult === 'number' || typeof insertResult === 'string') {
          resolvedId = Number(insertResult);
        }
        if (!resolvedId) {
          const row = await db('flights').max('id as id').first();
          resolvedId = row && row.id ? Number(row.id) : null;
        }
        if (!resolvedId) return res.status(500).json({ message: 'No se pudo crear el vuelo' });
        return res.status(201).json({ success: true, flightId: resolvedId, flightName });
      } catch (error) {
        console.error('Error creating flight (createOnly):', error);
        return res.status(500).json({ success: false, message: 'Error interno al crear vuelo', error: error.message });
      }
    }
    const result = await serialService.startReading(flightName, port, baudRate);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error en el endpoint /api/flights/start:', error.message);
    // Enviar un error 500 con un mensaje más específico
    res.status(500).json({ message: `No se pudo iniciar el vuelo: ${error.message}` });
  }
});

// Test-only endpoint: create a flight row without starting serial port (useful for automated tests)
app.post('/api/flights/create', async (req, res) => {
  const { flightName } = req.body || {};
  if (!flightName) return res.status(400).json({ message: 'flightName requerido' });
  try {
    let insertResult;
    try {
      insertResult = await db('flights').insert({ name: flightName, start_time: new Date().toISOString() }).returning('id');
    } catch (e) {
      // sqlite fallback
      const ids = await db('flights').insert({ name: flightName, start_time: new Date().toISOString() });
      insertResult = ids;
    }
    let resolvedId = null;
    if (Array.isArray(insertResult) && insertResult.length > 0) {
      const first = insertResult[0];
      if (typeof first === 'object' && first !== null && ('id' in first)) resolvedId = first.id;
      else if (typeof first === 'number' || typeof first === 'string') resolvedId = Number(first);
    } else if (typeof insertResult === 'number' || typeof insertResult === 'string') resolvedId = Number(insertResult);
    if (!resolvedId) {
      const row = await db('flights').max('id as id').first();
      resolvedId = row && row.id ? Number(row.id) : null;
    }
    if (!resolvedId) return res.status(500).json({ message: 'No se pudo crear el vuelo' });
    res.status(201).json({ success: true, flightId: resolvedId, flightName });
  } catch (error) {
    console.error('Error creating test flight:', error);
    res.status(500).json({ success: false, message: 'Error interno al crear vuelo', error: error.message });
  }
});

// Stop the flight and stop listening
app.post('/api/flights/stop', async (req, res) => {
  try {
    const result = await serialService.stopReading();
    if (result.success) {
      res.status(200).json(result);
    } else {
      // Use 400 Bad Request if there was no flight to stop
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[API] Error stopping flight:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al detener el vuelo.', error: error.message });
  }
});

// Endpoint para obtener todos los vuelos
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await db('flights').select('*').orderBy('start_time', 'desc');
    res.status(200).json(flights);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los vuelos.', error: error.message });
  }
});

// Endpoint para obtener la telemetría de un vuelo específico
app.get('/api/flights/:id/telemetry', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db('telemetry_data').where({ flight_id: id }).select('*');
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'No se encontraron datos de telemetría para este vuelo.' });
    }

    // Map DB column names to the frontend shape expected by AdminDashboard
    const telemetry = rows.map(r => ({
      // timestamps in DB are stored as integer ms (Date.now())
      timestamp: Number(r.timestamp) || Date.now(),
      // backend names -> frontend expected names
      temperature: r.temp ?? r.temperature ?? null,
      humidity: r.hum ?? r.humidity ?? null,
      altitude: r.altitude ?? null,
      pressure: r.pres ?? null,
      walkie_channel: r.walkie_channel ?? r.walkieChannel ?? 0,

      // accelerometer / gyroscope mapping
      acc_x: r.accX ?? r.acc_x ?? null,
      acc_y: r.accY ?? r.acc_y ?? null,
      acc_z: r.accZ ?? r.acc_z ?? null,

      gyro_x: r.roll ?? r.gyro_x ?? null,
      gyro_y: r.pitch ?? r.gyro_y ?? null,
      gyro_z: r.yaw ?? r.gyro_z ?? null,

      // GPS
      lat: r.latitude ?? r.lat ?? null,
      lng: r.longitude ?? r.lng ?? null,

      // original raw row for debugging if needed
      _raw: r
    }));

    res.status(200).json(telemetry);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los datos de telemetría.', error: error.message });
  }
});

// Endpoint para obtener los eventos (errores/advertencias) de un vuelo específico
app.get('/api/flights/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const events = await db('flight_events').where({ flight_id: id }).select('*').orderBy('timestamp', 'asc');
    if (events) {
      res.status(200).json(events);
    } else {
      res.status(404).json({ message: 'No se encontraron eventos para este vuelo.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los eventos del vuelo.', error: error.message });
  }
});

// --- New compatibility endpoints requested by frontend ---

// Return latest telemetry readings across flights. Query param: limit (default 1)
app.get('/api/telemetry/readings', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 1;
    const rows = await db('telemetry_data').select('*').orderBy('timestamp', 'desc').limit(limit);
    const telemetry = rows.map(r => ({
      timestamp: Number(r.timestamp) || Date.now(),
      temperature: r.temp ?? r.temperature ?? null,
      humidity: r.hum ?? r.humidity ?? null,
      altitude: r.altitude ?? null,
      pressure: r.pres ?? null,
      walkie_channel: r.walkie_channel ?? r.walkieChannel ?? 0,
      acc_x: r.accX ?? r.acc_x ?? null,
      acc_y: r.accY ?? r.acc_y ?? null,
      acc_z: r.accZ ?? r.acc_z ?? null,
      gyro_x: r.roll ?? r.gyro_x ?? null,
      gyro_y: r.pitch ?? r.gyro_y ?? null,
      gyro_z: r.yaw ?? r.gyro_z ?? null,
      lat: r.latitude ?? r.lat ?? null,
      lng: r.longitude ?? r.lng ?? null,
      flightId: r.flight_id ?? r.flightId ?? null,
      _raw: r
    }));
    res.status(200).json(telemetry);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener lecturas de telemetría.', error: error.message });
  }
});

// New endpoint: return the latest telemetry row(s). Optional query: flightId, limit
app.get('/api/telemetry/latest', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 1;
    const flightId = req.query.flightId ? Number(req.query.flightId) : null;
    let q = db('telemetry_data').select('*').orderBy('timestamp', 'desc').limit(limit);
    if (flightId) q = q.where({ flight_id: flightId });
    const rows = await q;
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'No telemetry found.' });
    const telemetry = rows.map(r => ({
      timestamp: Number(r.timestamp) || Date.now(),
      temperature: r.temp ?? r.temperature ?? null,
      humidity: r.hum ?? r.humidity ?? null,
      altitude: r.altitude ?? null,
      pressure: r.pres ?? r.pressure ?? null,
      walkie_channel: r.walkie_channel ?? r.walkieChannel ?? 0,
      acc_x: r.accX ?? r.acc_x ?? null,
      acc_y: r.accY ?? r.acc_y ?? null,
      acc_z: r.accZ ?? r.acc_z ?? null,
      gyro_x: r.roll ?? r.gyro_x ?? null,
      gyro_y: r.pitch ?? r.gyro_y ?? null,
      gyro_z: r.yaw ?? r.gyro_z ?? null,
      lat: r.latitude ?? r.lat ?? null,
      lng: r.longitude ?? r.lng ?? null,
      flightId: r.flight_id ?? null,
      _raw: r
    }));
    res.status(200).json(telemetry);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching latest telemetry.', error: error.message });
  }
});

// Return flights as CSV for legacy frontend endpoint
app.get('/api/flights/csv', async (req, res) => {
  try {
    const flights = await db('flights').select('*').orderBy('start_time', 'desc');
    // Build simple CSV: id,name,start_time,end_time
    const header = ['id', 'name', 'start_time', 'end_time'];
    const lines = flights.map(f => {
      const values = [f.id, f.name ?? '', f.start_time ?? '', f.end_time ?? ''];
      // Escape double quotes and wrap each value in double quotes
      return values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="flights.csv"');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error al generar CSV de vuelos.', error: error.message });
  }
});

// DELETE a flight and its telemetry data
app.delete('/api/flights/:id', async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  try {
    // Try to remove from the knex-backed DB
    let numDeleted = 0;
    try {
      numDeleted = await db.transaction(async (trx) => {
        await trx('telemetry_data').where('flight_id', numericId).del().catch(() => {});
        await trx('telemetry').where('flightId', numericId).del().catch(() => {});
        return trx('flights').where('id', numericId).del();
      });
    } catch (e) {
      // ignore knex errors; we'll try auxiliary stores below
      console.warn('Knex transaction failed when deleting flight (continuing with auxiliary stores):', e.message || e);
      numDeleted = 0;
    }

    // Auxiliary cleanup: lowdb JSON and local sqlite - treat as best-effort
    let auxRemoved = false;
    try {
      const fs = require('fs');
      const path = require('path');
      const dataJsonPath = path.join(__dirname, 'data', 'db.json');
      if (fs.existsSync(dataJsonPath)) {
        try {
          const raw = fs.readFileSync(dataJsonPath, { encoding: 'utf8' });
          const obj = JSON.parse(raw || '{}');
          const beforeFlights = Array.isArray(obj.flights) ? obj.flights.length : 0;
          if (obj && Array.isArray(obj.flights)) {
            obj.flights = obj.flights.filter(f => Number(f.id) !== numericId);
          }
          if (obj && Array.isArray(obj.telemetry)) {
            obj.telemetry = obj.telemetry.filter(t => Number(t.flightId) !== numericId && Number(t.flight_id) !== numericId);
          }
          if (obj && Array.isArray(obj.events)) {
            obj.events = obj.events.filter(e => Number(e.flightId) !== numericId && Number(e.flight_id) !== numericId);
          }
          const afterFlights = Array.isArray(obj.flights) ? obj.flights.length : 0;
          if (afterFlights < beforeFlights) auxRemoved = true;
          fs.writeFileSync(dataJsonPath, JSON.stringify(obj, null, 2), { encoding: 'utf8' });
          console.log(`Updated lowdb JSON at ${dataJsonPath} (removed=${auxRemoved})`);
        } catch (e) {
          console.warn('Could not update lowdb JSON file when deleting flight:', e.message || e);
        }
      }

      // Try to remove from the sqlite.js DB if present
      const sqlite3Path = path.join(__dirname, 'data', 'data.db');
      if (fs.existsSync(sqlite3Path)) {
        try {
          const sqlite3 = require('sqlite3').verbose();
          const localDb = new sqlite3.Database(sqlite3Path);
          await new Promise((resolve, reject) => {
            localDb.serialize(() => {
              localDb.run('BEGIN TRANSACTION');
              localDb.run('DELETE FROM telemetry WHERE flightId = ? OR flight_id = ?', [numericId, numericId]);
              localDb.run('DELETE FROM flights WHERE id = ?', [numericId]);
              localDb.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          });
          localDb.close();
          // best-effort: we can't easily know if rows were removed without querying; assume success
          auxRemoved = true || auxRemoved;
          console.log(`Attempted removal from local sqlite DB at ${sqlite3Path}`);
        } catch (e) {
          console.warn('Could not update local sqlite DB when deleting flight:', e.message || e);
        }
      }
    } catch (auxErr) {
      console.warn('Auxiliary cleanup failed when deleting flight:', auxErr.message || auxErr);
    }

    if (numDeleted > 0 || auxRemoved) {
      io.emit('flight_deleted', { id: numericId });
      res.status(200).json({ message: `Flight with ID ${numericId} deleted successfully.`, deletedFromKnex: numDeleted > 0, deletedFromAux: auxRemoved });
      return;
    }

    // If nothing removed yet, try an explicit lowdb JSON deletion by searching for the id
    try {
      const fs = require('fs');
      const path = require('path');
      const dataJsonPath = path.join(__dirname, 'data', 'db.json');
      if (fs.existsSync(dataJsonPath)) {
        const raw = fs.readFileSync(dataJsonPath, { encoding: 'utf8' });
        const obj = JSON.parse(raw || '{}');
        const beforeFlights = Array.isArray(obj.flights) ? obj.flights.length : 0;
        if (Array.isArray(obj.flights)) {
          obj.flights = obj.flights.filter(f => Number(f.id) !== numericId);
        }
        if (Array.isArray(obj.telemetry)) {
          obj.telemetry = obj.telemetry.filter(t => Number(t.flightId) !== numericId && Number(t.flight_id) !== numericId);
        }
        if (Array.isArray(obj.events)) {
          obj.events = obj.events.filter(e => Number(e.flightId) !== numericId && Number(e.flight_id) !== numericId);
        }
        const afterFlights = Array.isArray(obj.flights) ? obj.flights.length : 0;
        if (afterFlights < beforeFlights) {
          fs.writeFileSync(dataJsonPath, JSON.stringify(obj, null, 2), { encoding: 'utf8' });
          io.emit('flight_deleted', { id: numericId });
          res.status(200).json({ message: `Flight with ID ${numericId} deleted from lowdb JSON.` });
          return;
        }
      }
    } catch (e) {
      console.warn('Explicit lowdb deletion failed:', e.message || e);
    }

    res.status(404).json({ error: `Flight with ID ${numericId} not found in any known storage.` });
  } catch (error) {
    console.error('Error deleting flight:', error);
    res.status(500).json({ error: 'Failed to delete flight.' });
  }
});

// --- Lógica de Socket.IO ---

io.on('connection', (socket) => {
  console.log('🚀 Un cliente se ha conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('👋 Un cliente se ha desconectado:', socket.id);
  });

  // Allow clients to join a room for a specific flight to receive only that flight's live telemetry
  socket.on('join-flight-room', (flightId) => {
    try {
      const room = `flight-${flightId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room}`);
      socket.emit('joined-flight-room', { flightId });
    } catch (e) {
      console.warn('Failed to join flight room:', e && e.message ? e.message : e);
    }
  });

  socket.on('leave-flight-room', (flightId) => {
    try {
      const room = `flight-${flightId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left room ${room}`);
      socket.emit('left-flight-room', { flightId });
    } catch (e) {
      console.warn('Failed to leave flight room:', e && e.message ? e.message : e);
    }
  });

  // Admin can request a public projection to start/stop for all public clients
  socket.on('public-projection-start', (payload) => {
    try {
      console.log('Received public-projection-start from', socket.id, payload);
      // Broadcast to all connected clients that a public projection should start
      io.emit('public-projection-start', payload);
    } catch (e) {
      console.warn('Error handling public-projection-start:', e && e.message ? e.message : e);
    }
  });

  socket.on('public-projection-stop', (payload) => {
    try {
      console.log('Received public-projection-stop from', socket.id, payload);
      io.emit('public-projection-stop', payload || {});
    } catch (e) {
      console.warn('Error handling public-projection-stop:', e && e.message ? e.message : e);
    }
  });

  // Aquí se añadirán más eventos de socket para telemetría
});


// --- Iniciar Servidor ---
const PORT = process.env.PORT || 5000; // Cambiado a 5000 para evitar conflicto con Vite
// Handle server listen errors (EADDRINUSE) with a friendly message for devs
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} ya está en uso. Asegúrate de no tener otra instancia del servidor ejecutándose.`);
    console.error('Puedes listar procesos con: Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess  (PowerShell) o usar el Administrador de Tareas para terminar el proceso.');
  } else {
    console.error('Server error:', err && err.message ? err.message : err);
  }
  // Let the process exit with non-zero code after logging
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`🛰️  Servidor Node.js escuchando en el puerto ${PORT}`);
  console.log(`📡 Socket.IO listo para recibir conexiones.`);
});

module.exports = { app, server, db, io };
