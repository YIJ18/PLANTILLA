const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB path (matches backend/node-api/sqlite.js)
const dbFile = path.join(__dirname, '..', 'data', 'data.db');

const argv = require('minimist')(process.argv.slice(2));
const flightId = argv.flightId || argv.f || null;
const limit = Number(argv.limit || argv.l || 10);

function openDb() {
  return new sqlite3.Database(dbFile, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error opening DB:', err.message);
      process.exit(1);
    }
  });
}

async function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

(async () => {
  console.log('Inspecting DB at', dbFile);
  const db = openDb();

  try {
    const flights = await all(db, `SELECT id, name, port, baudRate, startedAt, endedAt, status FROM flights ORDER BY id DESC LIMIT 10`);
    console.log('\nLast flights:');
    console.table(flights.map(f => ({ id: f.id, name: f.name, port: f.port || '-', status: f.status || '-', startedAt: f.startedAt })));

    let targetFlightId = flightId;
    if (!targetFlightId) {
      if (flights.length === 0) {
        console.log('\nNo flights found in DB.');
        process.exit(0);
      }
      targetFlightId = flights[0].id;
      console.log(`\nNo flightId provided. Using latest flight id=${targetFlightId}`);
    }

    const telemetry = await all(db, `SELECT id, flightId, timestamp, roll, pitch, yaw, accel_x, accel_y, accel_z, temperature, humidity, pressure, latitude, longitude, altitude, satellites FROM telemetry WHERE flightId = ? ORDER BY id DESC LIMIT ?`, [Number(targetFlightId), limit]);

    if (!telemetry || telemetry.length === 0) {
      console.log(`\nNo telemetry rows found for flightId=${targetFlightId}`);
    } else {
      console.log(`\nLast ${telemetry.length} telemetry rows for flightId=${targetFlightId}:`);
      // reverse to show chronological order
      telemetry.reverse();
      telemetry.forEach(row => {
        console.log(`- [${row.id}] ${row.timestamp} | lat=${row.latitude} lon=${row.longitude} alt=${row.altitude} temp=${row.temperature} hum=${row.humidity} roll=${row.roll} pitch=${row.pitch} yaw=${row.yaw}`);
      });
    }

    db.close();
  } catch (err) {
    console.error('Error querying DB:', err);
    db.close();
    process.exit(1);
  }
})();
