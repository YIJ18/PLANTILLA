import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, './data');
const dbFile = path.join(dataDir, 'data.db');

let db;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function initDB() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  sqlite3.verbose();
  db = new sqlite3.Database(dbFile);
  await run(db, 'PRAGMA journal_mode = WAL;');
  await run(db, `CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    port TEXT,
    baudRate INTEGER,
    csvPath TEXT,
    startedAt TEXT,
    endedAt TEXT,
    status TEXT
  );`);
  await run(db, `CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flightId INTEGER NOT NULL,
    timestamp TEXT,
    roll REAL, pitch REAL, yaw REAL,
    accel_x REAL, accel_y REAL, accel_z REAL,
    temperature REAL, humidity REAL, pressure REAL,
    latitude REAL, longitude REAL, altitude REAL,
    satellites INTEGER, rssi REAL, snr REAL,
    FOREIGN KEY (flightId) REFERENCES flights(id)
  );`);
}

export async function createFlight({ name, port, baudRate, csvPath }) {
  const startedAt = new Date().toISOString();
  const stmt = await run(
    db,
    `INSERT INTO flights (name, port, baudRate, csvPath, startedAt, status) VALUES (?, ?, ?, ?, ?, 'active')`,
    [name, port || null, baudRate || null, csvPath || null, startedAt]
  );
  return { id: stmt.lastID, name, port, baudRate, csvPath, startedAt, status: 'active' };
}

export async function completeFlight(flightId) {
  const endedAt = new Date().toISOString();
  await run(db, `UPDATE flights SET endedAt = ?, status = 'completed' WHERE id = ?`, [endedAt, flightId]);
}

export async function appendTelemetry(row) {
  const {
    flightId, timestamp,
    roll, pitch, yaw,
    accel_x, accel_y, accel_z,
    temperature, humidity, pressure,
    latitude, longitude, altitude,
    satellites, rssi, snr
  } = row;
  await run(
    db,
    `INSERT INTO telemetry (
      flightId, timestamp, roll, pitch, yaw, accel_x, accel_y, accel_z,
      temperature, humidity, pressure, latitude, longitude, altitude,
      satellites, rssi, snr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [flightId, timestamp, roll, pitch, yaw, accel_x, accel_y, accel_z,
     temperature, humidity, pressure, latitude, longitude, altitude,
     satellites, rssi, snr]
  );
}

export async function getFlights() {
  const rows = await all(db, `SELECT id, name, port, baudRate, csvPath, startedAt, endedAt, status FROM flights ORDER BY datetime(startedAt) DESC`);
  return rows;
}

export async function getTelemetryForFlight(flightId, limit = 1000) {
  const rows = await all(
    db,
    `SELECT id, flightId, timestamp, roll, pitch, yaw, accel_x, accel_y, accel_z,
            temperature, humidity, pressure, latitude, longitude, altitude,
            satellites, rssi, snr
     FROM telemetry WHERE flightId = ? ORDER BY id DESC LIMIT ?`,
    [Number(flightId), Number(limit)]
  );
  return rows.reverse();
}

export function getDbFilePath() {
  return dbFile;
}
