const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'backend', 'node-api', 'db', 'development.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
});

function run() {
  console.log('Using DB:', dbPath);
  db.serialize(() => {
    db.all("PRAGMA table_info('flights')", [], (err, cols) => {
      if (err) console.error('PRAGMA flights error', err);
      else console.log('FLIGHTS schema:\n', cols);

      db.all("SELECT id, name, start_time, end_time FROM flights ORDER BY id DESC LIMIT 5", [], (err2, flights) => {
        if (err2) console.error('Flights query error', err2);
        else console.log('\nLAST 5 FLIGHTS:\n', flights);

        db.all("SELECT flight_id, COUNT(*) as cnt FROM telemetry_data GROUP BY flight_id ORDER BY flight_id DESC LIMIT 10", [], (err3, counts) => {
          if (err3) console.error('Telemetry counts error', err3);
          else console.log('\nTELEMETRY counts per flight (last 10):\n', counts);

          db.all("SELECT id, flight_id, timestamp, roll, pitch, yaw, accX, accY, accZ, temp, hum, pres, latitude, longitude, altitude, satellites FROM telemetry_data ORDER BY id DESC LIMIT 20", [], (err4, tel) => {
            if (err4) console.error('Telemetry rows error', err4);
            else console.log('\nTELEMETRY LAST 20:\n', tel);
            db.close();
          });
        });
      });
    });
  });
}

run();
