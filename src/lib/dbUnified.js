import { flightAPI, telemetryAPI } from './api.js';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

// IndexedDB fallback for offline mode
const DB_NAME = 'AstraDB';
const DB_VERSION = 1;
const STORE_NAME = 'flights';

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
const isAuthenticated = () => !!localStorage.getItem('access_token');

// Save flight data (Django + IndexedDB fallback)
export async function saveFlightData(flightName, data) {
  try {
    if (isAuthenticated()) {
      // Save to Django backend
      const flightData = {
        name: flightName,
        description: `Flight recorded on ${new Date().toLocaleString()}`,
        status: 'completed',
        start_time: new Date(data.timestamps[0]).toISOString(),
        end_time: new Date(data.timestamps[data.timestamps.length - 1]).toISOString(),
      };
      
      const flight = await flightAPI.createFlight(flightData);
      
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
        await telemetryAPI.bulkCreateTelemetry(batch);
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
export async function loadFlightData(flightName) {
  try {
    if (isAuthenticated()) {
      // Try to load from Django backend first
      const flights = await flightAPI.getFlights();
      const flight = flights.find(f => f.name === flightName);
      
      if (flight) {
        const telemetryData = await telemetryAPI.getTelemetry(flight.id);
        
        // Convert telemetry back to original format
        const data = {
          timestamps: [],
          temperature: [],
          humidity: [],
          altitude: [],
          pressure: [],
          walkieChannel: [],
          accelerometer: [],
          gyroscope: [],
          coordinates: [],
        };
        
        telemetryData.forEach(t => {
          data.timestamps.push(new Date(t.timestamp).getTime());
          data.temperature.push(t.temperature);
          data.humidity.push(t.humidity);
          data.altitude.push(t.altitude);
          data.pressure.push(t.pressure);
          data.walkieChannel.push(t.walkie_channel);
          data.accelerometer.push({
            x: t.accelerometer_x,
            y: t.accelerometer_y,
            z: t.accelerometer_z,
          });
          data.gyroscope.push({
            x: t.gyroscope_x,
            y: t.gyroscope_y,
            z: t.gyroscope_z,
          });
          data.coordinates.push({
            lat: t.latitude,
            lng: t.longitude,
          });
        });
        
        console.log(`Flight ${flightName} loaded from Django backend`);
        return data;
      }
    }
  } catch (error) {
    console.error('Error loading from Django backend:', error);
  }
  
  // Fallback to IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(flightName);
      request.onsuccess = () => {
        console.log(`Flight ${flightName} loaded from IndexedDB`);
        resolve(request.result ? request.result.data : null);
      };
      request.onerror = () => reject("Error loading flight data from IndexedDB");
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    throw error;
  }
}

// Get saved flights (Django first, IndexedDB fallback)
export async function getSavedFlights() {
  let djangoFlights = [];
  let indexedDBFlights = [];
  
  try {
    if (isAuthenticated()) {
      // Get flights from Django backend
      const flights = await flightAPI.getFlights();
      djangoFlights = flights.map(f => f.name);
      console.log('Flights loaded from Django backend:', djangoFlights);
    }
  } catch (error) {
    console.error('Error loading flights from Django backend:', error);
  }
  
  try {
    // Get flights from IndexedDB
    const db = await openDB();
    indexedDBFlights = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result.map(String));
      request.onerror = () => reject("Error fetching saved flights from IndexedDB");
    });
    console.log('Flights loaded from IndexedDB:', indexedDBFlights);
  } catch (error) {
    console.error('Error loading flights from IndexedDB:', error);
  }
  
  // Combine and deduplicate
  const allFlights = [...new Set([...djangoFlights, ...indexedDBFlights])];
  return allFlights;
}

// Delete flight (Django + IndexedDB)
export async function deleteFlightData(flightName) {
  try {
    if (isAuthenticated()) {
      // Delete from Django backend
      const flights = await flightAPI.getFlights();
      const flight = flights.find(f => f.name === flightName);
      if (flight) {
        await flightAPI.deleteFlight(flight.id);
        console.log(`Flight ${flightName} deleted from Django backend`);
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
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${flightName}_package.zip`);
}