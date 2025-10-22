const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'backend', 'node-api', 'db', 'development.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => { if (err) { console.error('open err', err); process.exit(1); } });

// Insert a telemetry row for the most recent flight id
db.get('SELECT id FROM flights ORDER BY id DESC LIMIT 1', [], (err, row) => {
  if (err) { console.error('select flight err', err); db.close(); return; }
  if (!row) { console.error('no flights found'); db.close(); return; }
  const flightId = row.id;
  const stmt = `INSERT INTO telemetry_data (flight_id, timestamp, roll, pitch, yaw, accX, accY, accZ, temp, pres, hum, latitude, longitude, altitude, altitude_calc1, altitude_calc2, altitude_calc3, satellites) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [flightId, Date.now(), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0];
  db.run(stmt, params, function(err2) {
    if (err2) console.error('insert err', err2);
    else console.log('Inserted telemetry test row id=', this.lastID, 'for flight', flightId);
    db.close();
  });
});
