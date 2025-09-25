import { saveAs } from 'file-saver';
import JSZip from 'jszip';

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

export async function saveFlightData(flightName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ name: flightName, data: data, timestamp: new Date() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error saving flight data");
  });
}

export async function loadFlightData(flightName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(flightName);
    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = () => reject("Error loading flight data");
  });
}

export async function getSavedFlights() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result.map(String));
    request.onerror = () => reject("Error fetching saved flights");
  });
}

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
  
  const metadata = {
    flightName: flightName,
    exportDate: new Date().toISOString(),
    totalPoints: flightData.timestamps.length,
  };

  const dataTxt = dataToTxt(flightData);

  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  zip.file(`${flightName}_data.txt`, dataTxt);

  // Placeholder for snapshot
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = 'white';
  ctx.fillText('Snapshot', 10, 50);
  const snapshotBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  zip.file("snapshot.png", snapshotBlob);

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${flightName}_package.zip`);
}