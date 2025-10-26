const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
let db, io;

function init(database, socketio) {
  db = database;
  io = socketio;
}

// Helper to emit telemetry updates to the room for a given flight id
function emitTelemetryToFlight(flightId, payload) {
  try {
    if (io && flightId) {
      const room = `flight-${flightId}`;
      // Debug logging to help trace why public clients may not receive telemetry
      try {
        const summary = {
          room,
          flightId,
          ts: payload && payload.timestamp,
          keys: payload ? Object.keys(payload).slice(0,6) : []
        };
        console.debug('[emitTelemetryToFlight] Emitting telemetry to room:', summary);
      } catch (logErr) {
        // ignore logging failures
      }
      io.to(room).emit('telemetry-update', payload);
    } else if (io) {
      // fallback to global emit if no flightId
      console.debug('[emitTelemetryToFlight] Emitting telemetry globally (no flightId)', { payloadKeys: payload ? Object.keys(payload).slice(0,6) : [] });
      io.emit('telemetry-update', payload);
    }
  } catch (e) {
    console.error('emitTelemetryToFlight error:', e);
  }
}

// Helper to emit flight-scoped events (flight-event, flight_started/stopped could remain global)
function emitEventToFlight(flightId, eventName, payload) {
  try {
    if (io && flightId) {
      const room = `flight-${flightId}`;
      try {
        console.debug('[emitEventToFlight] Emitting event', { room, eventName, payloadSummary: payload && { flightId: payload.flightId, type: payload.type } });
      } catch (e) {}
      io.to(room).emit(eventName, payload);
    } else if (io) {
      try { console.debug('[emitEventToFlight] Emitting event globally', { eventName }); } catch (e) {}
      io.emit(eventName, payload);
    }
  } catch (e) {
    console.error('emitEventToFlight error:', e);
  }
}

let port;
let parser;
let currentFlightId = null;
let isReading = false;
// Packet buffering to aggregate multi-line human-readable output from Arduino
let packetBuffer = [];
let packetTimer = null;
const PACKET_TIMEOUT_MS = 150; // ms to wait for packet lines to accumulate
// Track last alerted sensor states per flight to avoid spamming repeated alerts
const lastAlerts = {}; // { [flightId]: { sensorName: boolean } }

/**
 * Inicia la lectura del puerto serial para un nuevo vuelo.
 * @param {string} flightName - El nombre del vuelo.
 * @param {string} portPath - La ruta del puerto serial (ej. 'COM5').
 * @param {number} baudRate - La velocidad en baudios.
 * @returns {object} - Objeto con el resultado de la operación.
 */
async function startReading(flightName, portPath, baudRate) {
  if (isReading) {
    console.warn('Attempted to start a flight while another is in progress.');
    return { success: false, message: 'Ya hay un vuelo en progreso.' };
  }

  console.log(`Attempting to start flight: ${flightName}`);
  isReading = true;

  try {
    // --- Serial Port Setup Step (open first, avoid creating a DB row if port missing) ---
    // Create port but don't auto-open to control timing
    let tempPort;
    try {
      tempPort = new SerialPort({ path: portPath, baudRate: baudRate, autoOpen: false });
    } catch (e) {
      // constructor may throw for invalid args
      console.error('Failed creating SerialPort instance:', e && e.message ? e.message : e);
      throw e;
    }

    // Attempt to open the port within a timeout
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for serial port to open')), 4000);
        tempPort.open((err) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          return resolve();
        });
      });
    } catch (openErr) {
      // If the serial port failed to open, propagate error so no DB row is created
      console.error('Error en el puerto serial:', openErr && openErr.message ? openErr.message : openErr);
      throw openErr;
    }

    // At this point the physical COM port is open. Attach parser/handlers to tempPort
    port = tempPort;
    parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    // Attach data handler
    parser.on('data', (data) => {
      try {
        console.log('[Serial RAW]', data);
      } catch (e) {}
      try {
        handleSerialRaw(data);
      } catch (err) {
        console.error('Error handling raw serial data:', err);
      }
    });

    // Attach error handler that will stop reading if port errors after open
    port.on('error', (err) => {
      console.error('Error en el puerto serial:', err);
      // Ensure we attempt to stop and cleanup
      try { stopReading(); } catch (e) { console.error('Error during stopReading after port error:', e); }
    });

    // --- Database Insertion Step (only after port opened successfully) ---
    try {
      // Knex + SQLite can return different shapes from insert(). Try common patterns and fallbacks.
      let insertResult;
      try {
        // Try returning('id') for DBs that support it
        insertResult = await db('flights').insert({
          name: flightName,
          start_time: new Date().toISOString(),
        }).returning('id');
      } catch (e) {
        // fallback for sqlite which may not support returning(): perform insert and read last id
        const ids = await db('flights').insert({
          name: flightName,
          start_time: new Date().toISOString(),
        });
        insertResult = ids;
      }

      // Normalize insertResult to id
      let resolvedId = null;
      if (Array.isArray(insertResult) && insertResult.length > 0) {
        const first = insertResult[0];
        if (typeof first === 'object' && first !== null && ('id' in first || 'ID' in first)) {
          resolvedId = first.id || first.ID;
        } else if (typeof first === 'number' || typeof first === 'string') {
          resolvedId = Number(first);
        }
      } else if (typeof insertResult === 'number' || typeof insertResult === 'string') {
        resolvedId = Number(insertResult);
      }

      // Final fallback: query the max id (should be safe in single-user dev environment)
      if (!resolvedId) {
        try {
          const row = await db('flights').max('id as id').first();
          resolvedId = row && row.id ? Number(row.id) : null;
        } catch (e) {
          // ignore and let below check throw
        }
      }

      if (!resolvedId) {
        throw new Error("La inserción en la base de datos no devolvió un ID.");
      }

      currentFlightId = resolvedId;
      console.log(`Vuelo guardado correctamente en la base de datos con ID: ${currentFlightId}`);

    } catch (dbError) {
      console.error("No se pudo guardar el vuelo en la base de datos: error...", dbError);
      // If DB insert fails, close the already-opened port to avoid leaking
      try {
        if (port && port.isOpen) {
          port.close(() => {});
        }
      } catch (closeErr) {
        console.warn('Failed to close serial port after DB insert error:', closeErr && closeErr.message ? closeErr.message : closeErr);
      }
      isReading = false; // Reset state on DB failure
      throw dbError; // Propagate the error to the main catch block
    }

    // Emit a global 'flight_started' after the port has been successfully opened and flight row created
    try {
      io.emit('flight_started', { id: currentFlightId, name: flightName });
    } catch (e) {
      console.warn('Could not emit flight_started event:', e && e.message ? e.message : e);
    }

    return { success: true, message: `Vuelo '${flightName}' iniciado con éxito.`, flightId: currentFlightId, flightName };


    } catch (error) {
    // If the error originates from attempting to open the serial port, make the message explicit
    const msg = (error && error.message) ? error.message : String(error);
    console.error('Error en el proceso de startReading:', msg);

    // If it's a serial port open failure, translate to a user-friendly message
    let userMessage = 'Fallo el proceso de inicio de vuelo.';
    if (/open|no such file|file not found|could not open|Error: Opening|Opening/i.test(msg)) {
      userMessage = 'El receptor no está conectado!';
    }

    // Ensure any opened port is closed to avoid resource leak
    try {
      if (port && port.isOpen) {
        port.close(() => {});
      }
    } catch (closeErr) {
      console.warn('Error closing port after failed start:', closeErr && closeErr.message ? closeErr.message : closeErr);
    }

    // Reset state
    isReading = false;
    currentFlightId = null;

    // Throw an Error with the user-facing message so API can forward it
    const e = new Error(userMessage);
    e.original = error;
    throw e;
  }
}

/**
 * Detiene la lectura del puerto serial y finaliza el vuelo.
 * @returns {object} - Objeto con el resultado de la operación.
 */
async function stopReading() {
  if (!isReading) {
    console.warn('Attempted to stop a flight when none was in progress.');
    return { success: false, message: 'No hay ningún vuelo en progreso.' };
  }

  console.log(`Attempting to stop flight ID: ${currentFlightId}`);

  try {
    // 1. Cerrar el puerto serial si está abierto
    if (port && port.isOpen) {
      await new Promise((resolve, reject) => {
        port.close(err => {
          if (err) {
            console.error('Error al cerrar el puerto serial:', err);
            return reject(err);
          }
          console.log('Puerto serial cerrado correctamente.');
          resolve();
        });
      });
    }

    // 2. Actualizar la hora de finalización del vuelo en la BD
    if (currentFlightId) {
      await db('flights').where({ id: currentFlightId }).update({ end_time: new Date() });
      console.log(`Vuelo (ID: ${currentFlightId}) finalizado en la base de datos.`);
      io.emit('flight_stopped', { id: currentFlightId });
    }

    // 3. Resetear el estado global
    isReading = false;
    port = null;
    parser = null;
    const stoppedFlightId = currentFlightId;
    currentFlightId = null;

    console.log(`Flight stop process completed for ID: ${stoppedFlightId}. State has been reset.`);
    return { success: true, message: 'Vuelo detenido con éxito.', flightId: stoppedFlightId };

  } catch (error) {
    console.error('Error during stopReading process:', error);
    // Incluso si hay un error, intentamos forzar el reseteo del estado para evitar bloqueos
    isReading = false;
    port = null;
    parser = null;
    currentFlightId = null;
    console.error('Forced state reset due to an error during stop process.');
    // Propagar el error para que la API pueda responder adecuadamente
    throw new Error('Failed to stop flight cleanly.');
  }
}

/**
 * Parsea una línea de datos y la procesa.
 * @param {string} line - La línea de datos recibida del puerto serial.
 */
async function handleSerialData(line) {
  if (!currentFlightId) return; // No procesar si no hay un vuelo activo

  try {
    // 1. Intentar parsear como telemetría
    const telemetry = parseSensorData(line);

    if (telemetry) {
        // Es un dato de telemetría válido
        const ts = Date.now();
        try {
          const insertRes = await db('telemetry_data').insert({
            flight_id: currentFlightId,
            timestamp: ts,
            ...telemetry
          });
          console.log('[DB] telemetry_data insert result:', insertRes);
        } catch (dbErr) {
          console.error('[DB ERROR] Failed inserting telemetry_data:', dbErr);
        }

        // Emitir una forma consistente que el frontend espera
        const emitted = {
          flightId: currentFlightId,
          timestamp: ts,
          temperature: telemetry.temp ?? null,
          humidity: telemetry.hum ?? null,
          altitude: telemetry.altitude ?? null,
          pressure: telemetry.pres ?? null,
          walkie_channel: telemetry.walkie_channel ?? 0,
          acc_x: telemetry.accX ?? null,
          acc_y: telemetry.accY ?? null,
          acc_z: telemetry.accZ ?? null,
          gyro_x: telemetry.roll ?? null,
          gyro_y: telemetry.pitch ?? null,
          gyro_z: telemetry.yaw ?? null,
          lat: telemetry.latitude ?? null,
          lng: telemetry.longitude ?? null,
        };
  emitTelemetryToFlight(currentFlightId, emitted);
        // Check for zero-valued sensors and create alerts if necessary
        try {
          await checkAndInsertAlerts(currentFlightId, emitted);
        } catch (e) {
          console.warn('Failed checking/inserting alerts:', e);
        }
    } else {
      // 2. Si no es telemetría, tratarlo como un evento/alerta
      const event = parseEventData(line);
      if (event) {
        // Save event
        try {
          const insertEv = await db('flight_events').insert({
            flight_id: currentFlightId,
            event_type: event.type,
            source: event.source,
            message: event.message
          });
          console.log('[DB] flight_events insert result:', insertEv);
        } catch (dbErr) {
          console.error('[DB ERROR] Failed inserting flight_events:', dbErr);
        }
  emitEventToFlight(currentFlightId, 'flight-event', { flightId: currentFlightId, ...event });
        console.log(`[Event] [${event.type.toUpperCase()}] from ${event.source}: ${event.message}`);

        // Try to extract numeric telemetry from the event message (some sensors send their values inside error strings)
        const telemetryFromEvent = extractTelemetryFromMessage(event.message);
        if (telemetryFromEvent) {
          // Ensure we always insert a full telemetry object (no NULLs) by merging
          // the parsed values onto a zero-filled template.
          const fullTelemetry = buildEmptyTelemetry();
          Object.assign(fullTelemetry, telemetryFromEvent);
          const ts2 = Date.now();
          await db('telemetry_data').insert({ flight_id: currentFlightId, timestamp: ts2, ...fullTelemetry });
          emitTelemetryToFlight(currentFlightId, {
            flightId: currentFlightId,
            timestamp: ts2,
            temperature: fullTelemetry.temp ?? null,
            humidity: fullTelemetry.hum ?? null,
            altitude: fullTelemetry.altitude ?? null,
            pressure: fullTelemetry.pres ?? null,
            walkie_channel: fullTelemetry.walkie_channel ?? 0,
            acc_x: fullTelemetry.accX ?? null,
            acc_y: fullTelemetry.accY ?? null,
            acc_z: fullTelemetry.accZ ?? null,
            gyro_x: fullTelemetry.roll ?? null,
            gyro_y: fullTelemetry.pitch ?? null,
            gyro_z: fullTelemetry.yaw ?? null,
            lat: fullTelemetry.latitude ?? null,
            lng: fullTelemetry.longitude ?? null,
          });
          console.log('[Telemetry] Inserted telemetry row parsed from event message.');
        } else {
          // If the event references a known sensor but no numeric values were parsed,
          // insert a default telemetry row with zeros so telemetry is present for this flight.
          const sensor = event.source;
          let defaultTelemetry = null;
          if (sensor === 'gyro') {
            defaultTelemetry = { roll: 0.0, pitch: 0.0, yaw: 0.0 };
          } else if (sensor === 'accelerometer') {
            defaultTelemetry = { accX: 0.0, accY: 0.0, accZ: 0.0 };
          } else if (sensor === 'bme_sensor') {
            defaultTelemetry = { temp: 0.0, hum: 0.0, pres: 0.0 };
          } else if (sensor === 'gps') {
            defaultTelemetry = { latitude: 0.0, longitude: 0.0, altitude: 0.0, satellites: 0 };
          }

          if (defaultTelemetry) {
            const fullTelemetry = buildEmptyTelemetry();
            Object.assign(fullTelemetry, defaultTelemetry);
            const tsDefault = Date.now();
            await db('telemetry_data').insert({
              flight_id: currentFlightId,
              timestamp: tsDefault,
              ...fullTelemetry
            });
            emitTelemetryToFlight(currentFlightId, {
              flightId: currentFlightId,
              timestamp: tsDefault,
              temperature: fullTelemetry.temp ?? null,
              humidity: fullTelemetry.hum ?? null,
              altitude: fullTelemetry.altitude ?? null,
              pressure: fullTelemetry.pres ?? null,
              walkie_channel: fullTelemetry.walkie_channel ?? 0,
              acc_x: fullTelemetry.accX ?? null,
              acc_y: fullTelemetry.accY ?? null,
              acc_z: fullTelemetry.accZ ?? null,
              gyro_x: fullTelemetry.roll ?? null,
              gyro_y: fullTelemetry.pitch ?? null,
              gyro_z: fullTelemetry.yaw ?? null,
              lat: fullTelemetry.latitude ?? null,
              lng: fullTelemetry.longitude ?? null,
            });
            console.log('[Telemetry] Inserted default zero telemetry for sensor event:', sensor);
          }
        }
      } else {
        // If not an event and not telemetry, attempt to parse generic numeric CSV inside the raw line
        const fallbackTelemetry = parseSensorData(line);
        if (fallbackTelemetry) {
          const fullTelemetry = buildEmptyTelemetry();
          Object.assign(fullTelemetry, fallbackTelemetry);
            const ts3 = Date.now();
            await db('telemetry_data').insert({ flight_id: currentFlightId, timestamp: ts3, ...fullTelemetry });
            emitTelemetryToFlight(currentFlightId, {
              flightId: currentFlightId,
              timestamp: ts3,
              temperature: fullTelemetry.temp ?? null,
              humidity: fullTelemetry.hum ?? null,
              altitude: fullTelemetry.altitude ?? null,
              pressure: fullTelemetry.pres ?? null,
              walkie_channel: fullTelemetry.walkie_channel ?? 0,
              acc_x: fullTelemetry.accX ?? null,
              acc_y: fullTelemetry.accY ?? null,
              acc_z: fullTelemetry.accZ ?? null,
              gyro_x: fullTelemetry.roll ?? null,
              gyro_y: fullTelemetry.pitch ?? null,
              gyro_z: fullTelemetry.yaw ?? null,
              lat: fullTelemetry.latitude ?? null,
              lng: fullTelemetry.longitude ?? null,
            });
        }
      }
    }
  } catch (error) {
    console.error('Error procesando el dato serial:', error);
  }
}

/**
          const ts4 = Date.now();
          await db('telemetry_data').insert({ flight_id: currentFlightId, timestamp: ts4, ...fullTelemetry });
          io.emit('telemetry-update', {
            flightId: currentFlightId,
            timestamp: ts4,
            temperature: fullTelemetry.temp ?? null,
            humidity: fullTelemetry.hum ?? null,
            altitude: fullTelemetry.altitude ?? null,
            pressure: fullTelemetry.pres ?? null,
            walkie_channel: fullTelemetry.walkie_channel ?? 0,
            acc_x: fullTelemetry.accX ?? null,
            acc_y: fullTelemetry.accY ?? null,
            acc_z: fullTelemetry.accZ ?? null,
            gyro_x: fullTelemetry.roll ?? null,
            gyro_y: fullTelemetry.pitch ?? null,
            gyro_z: fullTelemetry.yaw ?? null,
            lat: fullTelemetry.latitude ?? null,
            lng: fullTelemetry.longitude ?? null,
          });
 * sensor message is used to create telemetry rows.
 */
function buildEmptyTelemetry() {
  return {
    roll: 0.0,
    pitch: 0.0,
    yaw: 0.0,
    accX: 0.0,
    accY: 0.0,
    accZ: 0.0,
    temp: 0.0,
    pres: 0.0,
    hum: 0.0,
    latitude: 0.0,
    longitude: 0.0,
    altitude: 0.0,
    altitude_calc1: 0.0,
    altitude_calc2: 0.0,
    altitude_calc3: 0.0,
    satellites: 0,
  };
}

/**
 * Try to extract telemetry numeric values from a textual event message.
 * Returns an object with telemetry fields or null when nothing matched.
 */
function extractTelemetryFromMessage(msg) {
  if (!msg || typeof msg !== 'string') return null;
  const m = msg;

  // Roll/Pitch/Yaw: 0.0 / 0.0 / 0.0
  const rpy = /Roll\/Pitch\/Yaw:\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)/i.exec(m);
  if (rpy) {
    return { roll: parseFloat(rpy[1]) || 0.0, pitch: parseFloat(rpy[2]) || 0.0, yaw: parseFloat(rpy[3]) || 0.0 };
  }

  // Accel (X/Y/Z): 0.00 / 0.00 / 0.00
  const accel = /Accel[^:]*:\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)/i.exec(m);
  if (accel) {
    return { accX: parseFloat(accel[1]) || 0.0, accY: parseFloat(accel[2]) || 0.0, accZ: parseFloat(accel[3]) || 0.0 };
  }

  // Temp/Hum/Pres...: 0.0°C / 0.0% / 0.0 hPa
  const bme = /Temp\/?Hum\/?Pres[^:]*:\s*([\-0-9\.]+)°?C?\s*\/\s*([\-0-9\.]+)%?\s*\/\s*([\-0-9\.]+)/i.exec(m);
  if (bme) {
    return { temp: parseFloat(bme[1]) || 0.0, hum: parseFloat(bme[2]) || 0.0, pres: parseFloat(bme[3]) || 0.0 };
  }

  // GPS Lat/Lon/Alt: 0.000000 / 0.000000 / 0.00
  const gps = /GPS Lat\/Lon\/Alt:\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)\s*\/\s*([\-0-9\.]+)/i.exec(m);
  if (gps) {
    return { latitude: parseFloat(gps[1]) || 0.0, longitude: parseFloat(gps[2]) || 0.0, altitude: parseFloat(gps[3]) || 0.0 };
  }

  // SATS: 0
  const sats = /SATS:\s*(\d+)/i.exec(m);
  if (sats) {
    return { satellites: parseInt(sats[1], 10) || 0 };
  }

  return null;
}

/**
 * Placeholder para la función que convierte la línea de datos en un objeto de telemetría.
 * DEBE SER REEMPLAZADA con la lógica de parseo correcta.
 */
function parseSensorData(line) {
    if (!line || typeof line !== 'string') return null;
    const cleaned = line.trim();
    if (cleaned.length === 0) return null;

    // Split and trim parts. Accept lines that may have fewer fields than 16 but at least some numeric data.
    const parts = cleaned.split(',').map(p => p.trim());

    // If the line contains at least one numeric token (including 0 or 0.0),
    // treat it as telemetry. This keeps zeros (0.0) as valid values even
    // when the CSV has fewer than the full number of fields.
    const numericTokens = parts.filter(p => p !== '' && !Number.isNaN(parseFloat(p))).length;
    if (numericTokens === 0) return null;

    // Helper to parse numbers and fallback to 0.0 when value is missing or NaN.
    const num = (idx) => {
      const v = parts[idx];
      if (v === undefined || v === null || v === '') return 0.0;
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0.0;
    };

    const intVal = (idx) => {
      const v = parts[idx];
      if (v === undefined || v === null || v === '') return 0;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    };

    return {
      // Many CSV formats include a leading sequence number or timestamp at index 0;
      // Use safe indexing and default to 0.0 so zeros are preserved.
      roll: num(1),
      pitch: num(2),
      yaw: num(3),
      accX: num(4),
      accY: num(5),
      accZ: num(6),
      temp: num(7),
      pres: num(8),
      hum: num(9),
      latitude: num(10),
      longitude: num(11),
      altitude: num(12),
      altitude_calc1: num(12),
      altitude_calc2: num(13) || 0,
      altitude_calc3: num(14) || 0,
      satellites: intVal(13),
    };
}

/**
 * Parsea una línea de texto para identificar si es un evento de advertencia o error.
 * @param {string} line - La línea de texto recibida.
 * @returns {object|null} - Un objeto de evento o null si no coincide.
 */
function parseEventData(line) {
  line = line.trim();

  // Recognize generic warnings and system messages
  if (/advertencia|warning/i.test(line)) {
    return { type: 'warning', source: 'system', message: line };
  }

  // If it starts with 'FAIL:' treat it specially but also accept other formats
  if (/^FAIL:/i.test(line)) {
    const message = line.substring(5).trim(); // remove 'FAIL:'
    let source = 'unknown';
    if (message.includes('Roll/Pitch/Yaw')) source = 'gyro';
    if (message.includes('Accel')) source = 'accelerometer';
    if (message.includes('Temp/Hum/Pres')) source = 'bme_sensor';
    if (message.includes('GPS')) source = 'gps';
    if (message.includes('SATS')) source = 'gps';
    return { type: 'error', source: source, message: message };
  }

  // Accept other lines that mention sensor keywords (even if they don't start with FAIL:)
  // e.g. "[ERROR] from gyro: Roll/Pitch/Yaw: 0.0 / 0.0 / 0.0"
  const msg = line;
  if (/Roll\/Pitch\/Yaw/i.test(msg)) {
    return { type: 'error', source: 'gyro', message: msg };
  }
  if (/\bAccel\b/i.test(msg)) {
    return { type: 'error', source: 'accelerometer', message: msg };
  }
  if (/Temp\/?Hum\/?Pres/i.test(msg) || /\bBME\b/i.test(msg)) {
    return { type: 'error', source: 'bme_sensor', message: msg };
  }
  if (/GPS|SATS|Satellites/i.test(msg)) {
    return { type: 'error', source: 'gps', message: msg };
  }

  return null;
}


module.exports = {
  init,
  startReading,
  stopReading,
  handleSerialData,
  // Dev helper: inject a single raw line for a specific flight id (temporarily sets currentFlightId)
  injectLineForFlight: async (flightId, line) => {
    const prev = currentFlightId;
    try {
      currentFlightId = flightId;
      await handleSerialData(line);
    } finally {
      currentFlightId = prev;
    }
  },
  isReading: () => isReading,
  getCurrentFlightId: () => currentFlightId,
};

// ------------------ Packet buffering and aggregation helpers ------------------
// Collect multiple lines printed by Arduino into a single logical packet.
function handleSerialRaw(line) {
  // Push the raw line to the current packet buffer
  packetBuffer.push(line);

  // Reset timer
  if (packetTimer) clearTimeout(packetTimer);
  packetTimer = setTimeout(() => {
    // When timeout expires, process the buffered packet
    const packetLines = packetBuffer.slice();
    packetBuffer.length = 0; // clear buffer
    packetTimer = null;
    processBufferedPacket(packetLines).catch(err => console.error('Error processing buffered packet:', err));
  }, PACKET_TIMEOUT_MS);
}

async function processBufferedPacket(lines) {
  if (!lines || lines.length === 0) return;
  // Join lines for logging and for regex-based extraction
  const joined = lines.join('\n');
  console.log('[Serial PACKET]', `lines=${lines.length}`);
  lines.forEach((l, i) => console.log(`  ${i}: ${l}`));

  // Try to extract structured telemetry from the joined packet
  // Strategy: 1) try parseSensorData on any line that looks like CSV; 2) run extractTelemetryFromMessage on all lines and merge
  let mergedTelemetry = buildEmptyTelemetry();
  let foundAny = false;

  // First pass: CSV-like lines (complete payloads)
  for (const l of lines) {
    const maybe = parseSensorData(l);
    if (maybe) {
      Object.assign(mergedTelemetry, maybe);
      foundAny = true;
      // assume CSV line is full packet — break to prefer CSV
      break;
    }
  }

  // Second pass: extract numeric fragments from human-readable lines
  if (!foundAny) {
    for (const l of lines) {
      const frag = extractTelemetryFromMessage(l);
      if (frag) {
        Object.assign(mergedTelemetry, frag);
        foundAny = true;
      }
    }
  }

// Helper: decide if merged telemetry contains any meaningful (non-zero) numeric value
function hasMeaningfulTelemetry(t) {
  if (!t || typeof t !== 'object') return false;
  const numericKeys = ['roll','pitch','yaw','accX','accY','accZ','temp','pres','hum','latitude','longitude','altitude','altitude_calc1','altitude_calc2','altitude_calc3','satellites'];
  for (const k of numericKeys) {
    if (!(k in t)) continue;
    const v = t[k];
    if (v === null || v === undefined) continue;
    if (k === 'satellites') {
      if (Number(v) > 0) return true;
      continue;
    }
    // treat any numeric value whose absolute value > small epsilon as meaningful
    if (typeof v === 'number' && Math.abs(v) > 1e-6) return true;
  }
  return false;
}

  // Always emit log of what was merged
  if (foundAny) {
    // Insert a single telemetry row representing this packet
    if (currentFlightId) {
      const ts = Date.now();
        try {
          // Always insert merged telemetry rows, even if values are zeros.
          const res = await db('telemetry_data').insert({ flight_id: currentFlightId, timestamp: ts, ...mergedTelemetry });
          console.log('[DB] merged telemetry insert result:', res);
        } catch (e) {
          console.error('[DB ERROR] DB insert error for merged telemetry:', e);
        }

      // Emit normalized telemetry
      const emitted = {
        flightId: currentFlightId,
        timestamp: ts,
        temperature: mergedTelemetry.temp ?? null,
        humidity: mergedTelemetry.hum ?? null,
        altitude: mergedTelemetry.altitude ?? null,
        pressure: mergedTelemetry.pres ?? null,
        walkie_channel: mergedTelemetry.walkie_channel ?? 0,
        acc_x: mergedTelemetry.accX ?? null,
        acc_y: mergedTelemetry.accY ?? null,
        acc_z: mergedTelemetry.accZ ?? null,
        gyro_x: mergedTelemetry.roll ?? null,
        gyro_y: mergedTelemetry.pitch ?? null,
        gyro_z: mergedTelemetry.yaw ?? null,
        lat: mergedTelemetry.latitude ?? null,
        lng: mergedTelemetry.longitude ?? null,
      };
  emitTelemetryToFlight(currentFlightId, emitted);
      console.log('[Telemetry] Inserted merged packet telemetry and emitted telemetry-update');
    } else {
      console.log('[Telemetry] Packet parsed but no active flight; skipping DB insert.');
    }
  } else {
    // No numeric telemetry found — treat as events and store messages
    for (const l of lines) {
      const ev = parseEventData(l);
      if (ev && currentFlightId) {
        try {
          await db('flight_events').insert({ flight_id: currentFlightId, event_type: ev.type, source: ev.source, message: ev.message });
          emitEventToFlight(currentFlightId, 'flight-event', { flightId: currentFlightId, ...ev });
          console.log('[Event] Stored event from packet:', ev);
        } catch (e) {
          console.error('DB insert error for event:', e);
        }
      }
    }
  }
}
