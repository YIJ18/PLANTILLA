import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, './data');
const dbPath = path.join(dataDir, 'db.json');

let db;
let telemetryBuffer = [];
let lastFlush = 0;
const FLUSH_SIZE = 10;
const FLUSH_MS = 1000;
let flushTimer = null;

export async function initDB() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const adapter = new JSONFile(dbPath);
  db = new Low(adapter, { flights: [], telemetry: [], seq: { flight: 1, telemetry: 1 } });
  await db.read();
  if (!db.data) {
    db.data = { flights: [], telemetry: [], seq: { flight: 1, telemetry: 1 } };
    await db.write();
  }
}

function nextId(key) {
  const id = db.data.seq[key] || 1;
  db.data.seq[key] = id + 1;
  return id;
}

export async function createFlight({ name, port, baudRate, csvPath }) {
  const id = nextId('flight');
  const startedAt = new Date().toISOString();
  const flight = { id, name, port, baudRate, csvPath: csvPath || null, startedAt, endedAt: null, status: 'active' };
  db.data.flights.push(flight);
  await db.write();
  return flight;
}

export async function completeFlight(flightId) {
  const f = db.data.flights.find((x) => x.id === flightId);
  if (f) {
    f.endedAt = new Date().toISOString();
    f.status = 'completed';
    await db.write();
  }
}

export async function getFlights() {
  const flights = [...db.data.flights].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  return flights;
}

export async function getTelemetryForFlight(flightId, limit = 1000) {
  const all = db.data.telemetry.filter((t) => t.flightId === Number(flightId));
  if (!limit) return all;
  return all.slice(-limit);
}

async function flushBuffer(force = false) {
  const now = Date.now();
  if (!force && telemetryBuffer.length < FLUSH_SIZE && now - lastFlush < FLUSH_MS) {
    return;
  }
  if (telemetryBuffer.length === 0) return;
  db.data.telemetry.push(...telemetryBuffer);
  telemetryBuffer = [];
  lastFlush = now;
  await db.write();
}

export async function appendTelemetry(row) {
  const id = nextId('telemetry');
  telemetryBuffer.push({ id, ...row });
  // schedule flush
  if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushBuffer(true);
    }, FLUSH_MS);
  }
  if (telemetryBuffer.length >= FLUSH_SIZE) {
    await flushBuffer(true);
  }
}

export function getDbFilePath() {
  return dbPath;
}
