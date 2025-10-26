import { flightAPI, telemetryAPI } from './api.js';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

// IndexedDB fallback for offline mode
const DB_NAME = 'AstraDB';
const DB_VERSION = 1;
const STORE_NAME = 'flights';

// Live flight session management
let liveFlight = null;
let telemetryInterval = null;

// Global API request function reference
let globalApiRequest = null;

// Configure the global API request function
export function configureApiRequest(apiRequestFn) {
  globalApiRequest = apiRequestFn;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Error opening DB");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
  });
}

// Check if user is authenticated
const isAuthenticated = () => !!localStorage.getItem('astra_access_token');

// Save flight data (Django + IndexedDB fallback)
export async function saveFlightData(flightName, data) {
  try {
    if (isAuthenticated()) {
      // Use global API request if available, otherwise fallback to flightAPI
      const apiRequestFn = globalApiRequest || flightAPI.createFlight;
      
      // Save to Django backend
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const flightData = {
        name: flightName,
        flight_number: `SAVED-${timestamp}`, // Agregar flight_number requerido
        description: `Flight recorded on ${new Date().toLocaleString()}`,
        status: 'completed',
        start_time: new Date(data.timestamps[0]).toISOString(),
        end_time: new Date(data.timestamps[data.timestamps.length - 1]).toISOString(),
      };
      
      let flight;
      
      // Use existing live flight if available, otherwise create new one
      if (liveFlight && liveFlight.id) {
        flight = liveFlight;
        console.log('Using existing live flight:', flight.id);
      } else {
        // Create new flight only if no live flight exists
        if (globalApiRequest) {
          flight = await globalApiRequest('/flights/', {
            method: 'POST',
            body: JSON.stringify(flightData),
          });
        } else {
          flight = await flightAPI.createFlight(flightData);
        }
        console.log('Created new flight for data saving:', flight.id);
      }
      
      // Convert data to telemetry format
      const telemetryData = [];
      for (let i = 0; i < data.timestamps.length; i++) {
        telemetryData.push({
          flight: flight.id,
          timestamp: new Date(data.timestamps[i]).toISOString(),
          temperature: data.temperature[i],
          humidity: data.humidity[i],
          altitude: data.altitude[i],
          pressure: data.pressure[i],
          walkie_channel: data.walkieChannel[i],
          accelerometer_x: data.accelerometer[i].x,
          accelerometer_y: data.accelerometer[i].y,
          accelerometer_z: data.accelerometer[i].z,
          gyroscope_x: data.gyroscope[i].x,
          gyroscope_y: data.gyroscope[i].y,
          gyroscope_z: data.gyroscope[i].z,
          latitude: data.coordinates[i].lat,
          longitude: data.coordinates[i].lng,
        });
      }
      
      // Save telemetry data in batches
      const batchSize = 100;
      for (let i = 0; i < telemetryData.length; i += batchSize) {
        const batch = telemetryData.slice(i, i + batchSize);
        if (globalApiRequest) {
          // Send each telemetry point individually for now
          for (const point of batch) {
            await globalApiRequest('/telemetry/complete/', {
              method: 'POST',
              body: JSON.stringify(point),
            });
          }
        } else {
          await telemetryAPI.bulkCreateTelemetry(batch);
        }
      }
      
      console.log(`Flight ${flightName} saved to Django backend`);
    }
  } catch (error) {
    console.error('Error saving to Django backend:', error);
  }
  
  // Always save to IndexedDB as fallback
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ name: flightName, data: data, timestamp: new Date() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error saving flight data to IndexedDB");
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
}

// Load flight data (Django first, IndexedDB fallback)
export async function loadFlightData(flightArg) {
  // flightArg may be a string (flightName) or an object { id, name }
  const flightName = typeof flightArg === 'string' ? flightArg : (flightArg?.name || null);
  const flightId = typeof flightArg === 'object' ? flightArg.id : null;

  // Prefer server-side SQLite-backed Node API (uses backend/node-api/db/development.sqlite3)
  // 1) If we have an id (preferred), request telemetry by flight id from Node API
  try {
    if (flightId || (isAuthenticated() && flightName)) {
      // Determine id: if flightId present use it, otherwise try to find flight by name
      let targetId = flightId;
      if (!targetId && flightName && isAuthenticated()) {
        // Query backend flights list to find id by name
        const flightsResponse = await flightAPI.getFlights();
        let flightsArr = [];
        if (Array.isArray(flightsResponse)) flightsArr = flightsResponse;
        else if (Array.isArray(flightsResponse?.results)) flightsArr = flightsResponse.results;
        else if (Array.isArray(flightsResponse?.flights)) flightsArr = flightsResponse.flights;
        else if (flightsResponse && typeof flightsResponse === 'object') flightsArr = [flightsResponse];

        const found = flightsArr.find(f => (f.name || f.flight_number) === flightName || f.id === flightId);
        if (found) targetId = found.id;
      }

      if (targetId) {
        try {
          // Use globalApiRequest (auth-capable) if configured, otherwise call the Node API
          let telemetryResp;
          const url = `/api/flights/${targetId}/telemetry?limit=10000`;
          if (typeof globalApiRequest === 'function') {
            telemetryResp = await globalApiRequest(`/flights/${targetId}/telemetry?limit=10000`);
          } else {
            // Use a relative path so frontend calls the configured backend (dev script runs backend at :5000)
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Backend telemetry fetch failed: ${resp.status}`);
            telemetryResp = await resp.json();
          }

          const list = Array.isArray(telemetryResp?.results) ? telemetryResp.results : (Array.isArray(telemetryResp) ? telemetryResp : []);
          if (list.length > 0) {
            const data = { timestamps: [], temperature: [], humidity: [], altitude: [], pressure: [], walkieChannel: [], accelerometer: [], gyroscope: [], coordinates: [] };
            list.forEach(t => {
              data.timestamps.push(new Date(t.timestamp).getTime());
              data.temperature.push(t.temperature || 0);
              data.humidity.push(t.humidity || 0);
              data.altitude.push(t.altitude || 0);
              data.pressure.push(t.pressure || 0);
              data.walkieChannel.push(t.walkie_channel || 0);
              data.accelerometer.push({ x: t.accelerometer_x || 0, y: t.accelerometer_y || 0, z: t.accelerometer_z || 0 });
              data.gyroscope.push({ x: t.gyroscope_x || 0, y: t.gyroscope_y || 0, z: t.gyroscope_z || 0 });
              data.coordinates.push({ lat: t.latitude || 0, lng: t.longitude || 0 });
            });
            console.log(`Flight ${flightName || targetId} loaded from backend telemetry`);
            return data;
          }
        } catch (e) {
          console.error('Error fetching telemetry from backend by id:', e);
        }
      }
    }
  } catch (e) {
    console.error('Backend telemetry not available:', e);
  }

  return null;
}

  // Get saved flights (Node API / SQLite first, IndexedDB fallback)
export async function getSavedFlights() {
  let backendFlights = [];
  let indexedDBFlights = [];

  try {
    // Try backend fetch for flights. Prefer globalApiRequest (handles auth) if configured,
    // otherwise perform a direct fetch to the Node API (useful in dev without auth).
    let flightsResponse;
    if (typeof globalApiRequest === 'function') {
      flightsResponse = await globalApiRequest('/api/flights');
    } else {
      try {
        // Use relative path so frontend requests the Node API (which serves data from SQLite)
        const resp = await fetch('/api/flights');
        if (resp.ok) flightsResponse = await resp.json();
        else flightsResponse = null;
      } catch (fetchErr) {
        console.warn('Direct fetch to backend /api/flights failed:', fetchErr.message || fetchErr);
        flightsResponse = null;
      }
    }

    if (flightsResponse) console.log('Raw flights response from backend:', flightsResponse);

    // Handle different response formats
    let flights = flightsResponse;
    if (flightsResponse && typeof flightsResponse === 'object') {
      // If it's a paginated response, extract the results
      if (flightsResponse.results && Array.isArray(flightsResponse.results)) {
        flights = flightsResponse.results;
      }
      // If it's an object but has a data property
      else if (flightsResponse.data && Array.isArray(flightsResponse.data)) {
        flights = flightsResponse.data;
      }
      // If the response itself is an array
      else if (Array.isArray(flightsResponse)) {
        flights = flightsResponse;
      }
      // If it's a single object, wrap in array
      else if (!Array.isArray(flightsResponse) && flightsResponse) {
        flights = [flightsResponse];
      }
    }

    if (Array.isArray(flights)) {
      // return objects { id, name }
      backendFlights = flights.map(f => ({ id: f.id, name: f.flight_number || f.name || `Flight ${f.id}` }));
      console.log('Flights loaded from Node.js backend (objects):', backendFlights);
    } else {
      if (flightsResponse) console.warn('Flights response is not an array:', flights);
      backendFlights = [];
    }
  } catch (error) {
    console.error('Error loading flights from Node.js backend:', error);
  }

  try {
    // Get flights from IndexedDB
    const db = await openDB();
    indexedDBFlights = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result.map(k => ({ id: null, name: String(k) }))); // local flights have no backend id
      request.onerror = () => reject("Error fetching saved flights from IndexedDB");
    });
    console.log('Flights loaded from IndexedDB (objects):', indexedDBFlights);
  } catch (error) {
    console.error('Error loading flights from IndexedDB:', error);
  }

  // Combine and deduplicate
  // Combine preserving objects; dedupe by name
  const combined = [...backendFlights, ...indexedDBFlights];
  const seen = new Map();
  combined.forEach(f => {
    if (!seen.has(f.name)) seen.set(f.name, f);
  });
  return Array.from(seen.values());
}

// Delete flight (Django + IndexedDB)
export async function deleteFlightData(flightName) {
  try {
    if (isAuthenticated()) {
      // Delete from Django backend
      const flightsResponse = await flightAPI.getFlights();
      
      // Handle different response formats (same logic as getSavedFlights)
      let flights = flightsResponse;
      if (flightsResponse && typeof flightsResponse === 'object') {
        // If it's a paginated response, extract the results
        if (flightsResponse.results && Array.isArray(flightsResponse.results)) {
          flights = flightsResponse.results;
        }
        // If it's an object but has a data property
        else if (flightsResponse.data && Array.isArray(flightsResponse.data)) {
          flights = flightsResponse.data;
        }
        // If the response itself is an array
        else if (Array.isArray(flightsResponse)) {
          flights = flightsResponse;
        }
        // If it's a single object, wrap in array
        else if (!Array.isArray(flightsResponse)) {
          flights = [flightsResponse];
        }
      }
      
      if (Array.isArray(flights)) {
        const flight = flights.find(f => f.name === flightName);
        if (flight) {
          await flightAPI.deleteFlight(flight.id);
          console.log(`Flight ${flightName} deleted from Django backend`);
        }
      } else {
        console.warn('Could not find flights array to delete from');
      }
    }
  } catch (error) {
    console.error('Error deleting from Django backend:', error);
  }
  
  try {
    // Delete from IndexedDB
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(flightName);
      request.onsuccess = () => {
        console.log(`Flight ${flightName} deleted from IndexedDB`);
        resolve();
      };
      request.onerror = () => reject("Error deleting flight data from IndexedDB");
    });
  } catch (error) {
    console.error('Error deleting from IndexedDB:', error);
    throw error;
  }
}

// Export functionality remains the same
function dataToTxt(data) {
  let content = "timestamp,temp,humidity,alt,pressure,walkie,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,lat,lng\n";
  for (let i = 0; i < data.timestamps.length; i++) {
    const row = [
      data.timestamps[i],
      data.temperature[i].toFixed(2),
      data.humidity[i].toFixed(2),
      data.altitude[i].toFixed(2),
      data.pressure[i].toFixed(2),
      data.walkieChannel[i],
      data.accelerometer[i].x.toFixed(4),
      data.accelerometer[i].y.toFixed(4),
      data.accelerometer[i].z.toFixed(4),
      data.gyroscope[i].x.toFixed(4),
      data.gyroscope[i].y.toFixed(4),
      data.gyroscope[i].z.toFixed(4),
      data.coordinates[i].lat.toFixed(6),
      data.coordinates[i].lng.toFixed(6),
    ].join(',');
    content += row + '\n';
  }
  return content;
}

export async function exportFlightPackage(flightName, flightData) {
  const zip = new JSZip();

  // --- Metadata y datos crudos
  const metadata = {
    flightName,
    exportDate: new Date().toISOString(),
    totalPoints: flightData.timestamps.length,
  };
  const dataTxt = dataToTxt(flightData);

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file(`${flightName}_data.txt`, dataTxt);

  // --- Capturar todas las secciones del dashboard ---
  const sections = [
    { selector: ".chart-container", prefix: "grafica" },
    { selector: ".mission-control", prefix: "mision" },
    { selector: ".map-section", prefix: "mapa" },
    { selector: ".status-panel", prefix: "status" },
    { selector: ".gyro-viewer", prefix: "gyro" }
  ];

  let index = 1;
  for (const section of sections) {
    const elements = document.querySelectorAll(section.selector);

    for (let el of elements) {
      const canvas = await html2canvas(el, {
        backgroundColor: "#000000",
        useCORS: true,
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL("image/png").split(",")[1];
      zip.file(`${section.prefix}_${index}.png`, imgData, { base64: true });
      index++;
    }
  }
  // --- Agregar logo Astra ---
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    zip.file("astra_logo.png", blob);
  } catch (err) {
    console.error("No se pudo cargar el logo Astra:", err);
  }

  // --- Generar y descargar ZIP ---
    // Try to fetch DB CSVs from backend and merge into the zip (request flight-scoped export)
  try {
    // Backend export endpoint (Node API) - pass flightName if available
    const params = flightName ? `?flightName=${encodeURIComponent(flightName)}` : '';
    const backendExportUrl = `http://127.0.0.1:5000/api/export/all-csv${params}`;
    const resp = await fetch(backendExportUrl);
    if (resp.ok) {
      const serverBlob = await resp.blob();
      try {
        const serverZip = await JSZip.loadAsync(serverBlob);
        // Copy each file from server zip into our client zip (avoid name collisions)
        await Promise.all(Object.keys(serverZip.files).map(async (name) => {
          const fileData = await serverZip.files[name].async('arraybuffer');
          // If the zip already has a file with same name, prefix with 'db/'
          const targetName = zip.files[name] ? `db/${name}` : name;
          zip.file(targetName, fileData);
        }));
      } catch (e) {
        console.warn('Could not merge server ZIP contents into client ZIP:', e);
        // As a fallback, include the raw server blob
        zip.file('db_export.zip', serverBlob);
      }
    } else {
      console.warn('Backend export endpoint returned non-OK status:', resp.status);
    }
  } catch (fetchErr) {
    console.warn('Could not fetch backend export ZIP:', fetchErr);
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${flightName}_package.zip`);
}

// Live flight functions
export async function startLiveFlight(flightName, aircraft_id = 'CANSAT-001', departure_location = 'Base Astra') {
  try {
    if (isAuthenticated()) {
      // Start live flight via Node API serial execute-direct
      let response;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const flightData = {
        flight_name: flightName,
        flight_number: `LIVE-${timestamp}`, // Agregar flight_number requerido
        aircraft_id,
        departure_location
      };
      
      if (globalApiRequest) {
        response = await globalApiRequest('/serial/execute-direct', {
          method: 'POST',
          body: JSON.stringify({
            flight_name: flightName,
            port: 'COM5',
            baud_rate: 115200
          }),
        });
        liveFlight = response.flight || { id: response.flight_id, name: flightName, status: 'active' };
      } else {
        response = await flightAPI.startLiveFlight(flightData);
        liveFlight = response.flight;
      }
      
      console.log(`Live flight started: ${flightName}`, liveFlight);
      
      return {
        success: true,
        flight: liveFlight,
        message: 'Vuelo en vivo iniciado en el backend'
      };
    } else {
      // Offline mode - just track locally
      liveFlight = {
        id: `local-${Date.now()}`,
        flight_number: `LOCAL-${new Date().toISOString().slice(0,19).replace(/[-:]/g,'')}`,
        name: flightName,
        start_time: new Date().toISOString(),
        status: 'active'
      };
      
      console.log(`Live flight started offline: ${flightName}`, liveFlight);
      
      return {
        success: true,
        flight: liveFlight,
        message: 'Vuelo en vivo iniciado en modo offline'
      };
    }
  } catch (error) {
    // If serial already active, treat as success
    if (String(error?.message || '').includes('Ya hay una lectura activa')) {
      liveFlight = liveFlight || { id: `active-${Date.now()}`, name: flightName, status: 'active' };
      return { success: true, flight: liveFlight, message: 'Lector serial ya estaba activo' };
    }
    console.error('Error starting live flight:', error);
    throw error;
  }
}

export async function stopLiveFlight() {
  try {
    if (!liveFlight) {
      throw new Error('No hay vuelo en vivo activo');
    }
    
    if (isAuthenticated() && liveFlight.id && !liveFlight.id.toString().startsWith('local-')) {
      // Stop live flight in Django backend
      await flightAPI.stopLiveFlight(liveFlight.id);
      console.log(`Live flight stopped in backend: ${liveFlight.flight_number}`);
    }
    
    // Stop telemetry interval
    if (telemetryInterval) {
      clearInterval(telemetryInterval);
      telemetryInterval = null;
    }
    
    const stoppedFlight = liveFlight;
    liveFlight = null;
    
    return {
      success: true,
      flight: stoppedFlight,
      message: 'Vuelo en vivo finalizado'
    };
  } catch (error) {
    console.error('Error stopping live flight:', error);
    throw error;
  }
}

export async function sendLiveTelemetryData(telemetryBatch) {
  try {
    if (!liveFlight) {
      throw new Error('No hay vuelo en vivo activo');
    }
    
    if (isAuthenticated() && liveFlight.id && !liveFlight.id.toString().startsWith('local-')) {
      // Convert telemetry to structured format for new backend models
      const structuredTelemetry = convertToStructuredTelemetry(telemetryBatch[telemetryBatch.length - 1], liveFlight.id);
      
      // Send to Django backend using the complete telemetry endpoint
      if (globalApiRequest) {
        await globalApiRequest('/telemetry/complete/', {
          method: 'POST',
          body: JSON.stringify(structuredTelemetry),
        });
        console.log(`✅ Telemetría completa enviada al backend para vuelo ${liveFlight.id}`);
      } else {
        // Fallback to old endpoint if globalApiRequest not available
        await flightAPI.sendLiveTelemetry(liveFlight.id, structuredTelemetry);
        console.log(`✅ Telemetría enviada al backend (fallback) para vuelo ${liveFlight.id}`);
      }
    }
    
    // Always save locally as backup
    const flightData = convertTelemetryToFlightData(telemetryBatch);
    await saveFlightDataLocal(liveFlight.name || liveFlight.flight_number, flightData);
    
    return { success: true, count: telemetryBatch.length };
  } catch (error) {
    console.error('❌ Error sending live telemetry:', error);
    
    // Fallback to local save only
    try {
      const flightData = convertTelemetryToFlightData(telemetryBatch);
      await saveFlightDataLocal(liveFlight.name || liveFlight.flight_number, flightData);
      console.log(`📦 Telemetría guardada solo localmente como respaldo`);
      return { success: true, count: telemetryBatch.length, fallback: true };
    } catch (fallbackError) {
      console.error('Fallback save failed:', fallbackError);
      throw error;
    }
  }
}

// Convert telemetry data to structured format for Django backend
// Maps CanSat sensor fields to database structure
function convertToStructuredTelemetry(dataPoint, flightId) {
  const now = new Date().toISOString();
  const timestamp = dataPoint.timestamp || now;
  
  return {
    timestamp: timestamp,
    
    // 1. Estado del CanSat
    cansat_status: {
      flight: flightId,
      timestamp: timestamp,
      system_status: dataPoint.systemStatus || 'active',
      is_active: dataPoint.isActive !== undefined ? dataPoint.isActive : true,
      battery_level: dataPoint.batteryPercent || dataPoint.battery || 98.3, // batteryPercent from sensor
      battery_voltage: dataPoint.batteryVoltage || null, // batteryVoltage from MAX17048
      signal_strength: dataPoint.signal_strength || null,
      walkie_channel: dataPoint.walkieChannel || dataPoint.walkie_channel || 0,
      last_update: dataPoint.lastUpdate || now,
      telemetry_system_ok: true,
      gps_system_ok: dataPoint.gpsSignal !== undefined ? dataPoint.gpsSignal : (dataPoint.latitude && dataPoint.longitude),
      sensors_system_ok: true,
      communication_system_ok: true,
      power_system_ok: (dataPoint.batteryPercent || dataPoint.battery || 98.3) > 20,
    },
    
    // 2. Control de Misión
    mission_control: {
      flight: flightId,
      timestamp: timestamp,
      mission_phase: dataPoint.missionPhase || 'active',
      flight_time: dataPoint.flightTime || (liveFlight.start_time ? (new Date() - new Date(liveFlight.start_time)) / 1000 : 0),
      vertical_speed: dataPoint.verticalSpeed || dataPoint.vertical_speed || null,
      horizontal_speed: dataPoint.horizontalSpeed || dataPoint.horizontal_speed || null,
      total_distance: dataPoint.distance || dataPoint.total_distance || null,
      transmission_check: true,
      gps_check: dataPoint.gpsSignal !== undefined ? dataPoint.gpsSignal : (dataPoint.latitude && dataPoint.longitude),
      sensors_check: true,
      battery_check: (dataPoint.batteryPercent || dataPoint.battery || 98.3) > 20,
      events: [] // Will be populated with mission events
    },
    
    // 3. Sensores Principales (from BME280 + GPS)
    primary_sensors: {
      flight: flightId,
      timestamp: timestamp,
      temperature: dataPoint.temp || dataPoint.temperature || 0,     // temp from BME280
      humidity: dataPoint.hum || dataPoint.humidity || 0,           // hum from BME280
      pressure: dataPoint.pres || dataPoint.pressure || 1013.25,   // pres from BME280
      altitude: dataPoint.altitude || 0,                           // altitude from GPS
      latitude: dataPoint.latitude || dataPoint.coordinates?.lat || null,    // latitude from GPS
      longitude: dataPoint.longitude || dataPoint.coordinates?.lng || null,   // longitude from GPS
      gps_altitude: dataPoint.altitude || null,                    // altitude from GPS
      gps_satellites: dataPoint.satellites || dataPoint.gps_satellites || null, // satellites from GPS
      gps_hdop: dataPoint.gps_hdop || null,
    },
    
    // 4. Sensores Adicionales (from MPU9250 + MAX17048)
    additional_sensors: {
      flight: flightId,
      timestamp: timestamp,
      // Accelerometer from MPU9250
      accelerometer_x: dataPoint.accX || dataPoint.accelerometer?.x || dataPoint.accelerometer_x || null,
      accelerometer_y: dataPoint.accY || dataPoint.accelerometer?.y || dataPoint.accelerometer_y || null,
      accelerometer_z: dataPoint.accZ || dataPoint.accelerometer?.z || dataPoint.accelerometer_z || null,
      
      // Magnetometer from MPU9250
      magnetometer_x: dataPoint.magX || dataPoint.magnetometer_x || null,
      magnetometer_y: dataPoint.magY || dataPoint.magnetometer_y || null,
      magnetometer_z: dataPoint.magZ || dataPoint.magnetometer_z || null,
      
      // Other sensors (optional)
      light_intensity: dataPoint.light_intensity || null,
      uv_index: dataPoint.uv_index || null,
      air_quality: dataPoint.air_quality || null,
      sound_level: dataPoint.sound_level || null,
    },
    
    // 5. Tracker de Vuelo
    flight_tracker: {
      flight: flightId,
      timestamp: timestamp,
      latitude: dataPoint.latitude || dataPoint.coordinates?.lat || null,
      longitude: dataPoint.longitude || dataPoint.coordinates?.lng || null,
      altitude: dataPoint.altitude || 0,
      speed: dataPoint.speed || null,
      vertical_speed: dataPoint.verticalSpeed || dataPoint.vertical_speed || null,
      heading: dataPoint.heading || null,
      distance_from_launch: dataPoint.distance_from_launch || null,
      distance_traveled: dataPoint.distance || dataPoint.distance_traveled || null,
      estimated_landing_lat: dataPoint.estimated_landing_lat || null,
      estimated_landing_lng: dataPoint.estimated_landing_lng || null,
      max_altitude_reached: dataPoint.maxAltitude || dataPoint.max_altitude_reached || null,
      max_speed_reached: dataPoint.max_speed_reached || null,
    },
    
    // 6. Orientación 3D (from MPU9250 gyroscope)
    orientation_3d: {
      flight: flightId,
      timestamp: timestamp,
      roll: dataPoint.roll || dataPoint.gyroY || dataPoint.gyroscope?.y || dataPoint.gyroscope_y || 0,   // gyroY for roll
      pitch: dataPoint.pitch || dataPoint.gyroX || dataPoint.gyroscope?.x || dataPoint.gyroscope_x || 0, // gyroX for pitch
      yaw: dataPoint.yaw || dataPoint.gyroZ || dataPoint.gyroscope?.z || dataPoint.gyroscope_z || 0,     // gyroZ for yaw
      angular_velocity_x: dataPoint.gyroX || dataPoint.angular_velocity_x || null,
      angular_velocity_y: dataPoint.gyroY || dataPoint.angular_velocity_y || null,
      angular_velocity_z: dataPoint.gyroZ || dataPoint.angular_velocity_z || null,
      angular_acceleration_x: dataPoint.angular_acceleration_x || null,
      angular_acceleration_y: dataPoint.angular_acceleration_y || null,
      angular_acceleration_z: dataPoint.angular_acceleration_z || null,
      quaternion_w: dataPoint.quaternion_w || null,
      quaternion_x: dataPoint.quaternion_x || null,
      quaternion_y: dataPoint.quaternion_y || null,
      quaternion_z: dataPoint.quaternion_z || null,
      is_stable: Math.abs(dataPoint.roll || dataPoint.gyroX || 0) < 10 && 
                 Math.abs(dataPoint.pitch || dataPoint.gyroY || 0) < 10 && 
                 Math.abs(dataPoint.yaw || dataPoint.gyroZ || 0) < 10,
      stability_factor: dataPoint.stability_factor || null,
    },
    
    // Data quality information
    data_quality_percentage: dataPoint.dataQuality || 95.0,
  };
}

export function startTelemetryStream(dataGenerator, intervalMs = 2000) {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
  }
  
  let telemetryBatch = [];
  
  telemetryInterval = setInterval(async () => {
    try {
      // Generate new telemetry data
      const newData = dataGenerator();
      telemetryBatch.push({
        timestamp: new Date().toISOString(),
        temperature: newData.temperature || 0,
        humidity: newData.humidity || 0,
        altitude: newData.altitude || 0,
        pressure: newData.pressure || 0,
        walkie_channel: newData.walkieChannel || 0,
        accelerometer_x: newData.accelerometer?.x || 0,
        accelerometer_y: newData.accelerometer?.y || 0,
        accelerometer_z: newData.accelerometer?.z || 0,
        gyroscope_x: newData.gyroscope?.x || 0,
        gyroscope_y: newData.gyroscope?.y || 0,
        gyroscope_z: newData.gyroscope?.z || 0,
        latitude: newData.coordinates?.lat || null,
        longitude: newData.coordinates?.lng || null,
        
        // Additional data from new structure
        battery: newData.battery || 98.3,
        isActive: newData.isActive || true,
        systemStatus: newData.systemStatus || 'active',
        lastUpdate: newData.lastUpdate || new Date().toISOString(),
        flightTime: newData.flightTime || 0,
        distance: newData.distance || 0,
        missionPhase: newData.missionPhase || 'active',
        verticalSpeed: newData.verticalSpeed || null,
        horizontalSpeed: newData.horizontalSpeed || null,
        speed: newData.speed || null,
        heading: newData.heading || null,
        maxAltitude: newData.maxAltitude || null,
        roll: newData.roll || 0,
        pitch: newData.pitch || 0,
        yaw: newData.yaw || 0,
        dataQuality: newData.dataQuality || 95.0,
        gpsSignal: newData.gpsSignal || false
      });
      
      // Send batch every 5 data points or 10 seconds
      if (telemetryBatch.length >= 5) {
        console.log(`📊 Enviando lote de ${telemetryBatch.length} puntos de telemetría...`);
        await sendLiveTelemetryData([...telemetryBatch]);
        telemetryBatch = [];
      }
    } catch (error) {
      console.error('Error in telemetry stream:', error);
    }
  }, intervalMs);
  
  console.log(`🔄 Telemetry stream started with ${intervalMs}ms interval`);
}

export function stopTelemetryStream() {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
    console.log('Telemetry stream stopped');
  }
}

export function getLiveFlightStatus() {
  return {
    isActive: !!liveFlight,
    flight: liveFlight,
    hasInterval: !!telemetryInterval
  };
}

// Helper functions
function convertTelemetryToFlightData(telemetryBatch) {
  const flightData = {
    timestamps: [],
    temperature: [],
    humidity: [],
    altitude: [],
    pressure: [],
    walkieChannel: [],
    accelerometer: [],
    gyroscope: [],
    coordinates: []
  };
  
  telemetryBatch.forEach(point => {
    flightData.timestamps.push(new Date(point.timestamp).getTime());
    flightData.temperature.push(point.temperature || 0);
    flightData.humidity.push(point.humidity || 0);
    flightData.altitude.push(point.altitude || 0);
    flightData.pressure.push(point.pressure || 0);
    flightData.walkieChannel.push(point.walkie_channel || 0);
    flightData.accelerometer.push({
      x: point.accelerometer_x || 0,
      y: point.accelerometer_y || 0,
      z: point.accelerometer_z || 0
    });
    flightData.gyroscope.push({
      x: point.gyroscope_x || 0,
      y: point.gyroscope_y || 0,
      z: point.gyroscope_z || 0
    });
    flightData.coordinates.push({
      lat: point.latitude || 0,
      lng: point.longitude || 0
    });
  });
  
  return flightData;
}

async function saveFlightDataLocal(flightName, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ name: flightName, data: data, timestamp: new Date() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error saving flight data to IndexedDB");
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw error;
  }
}