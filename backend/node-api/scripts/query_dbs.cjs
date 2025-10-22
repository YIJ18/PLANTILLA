const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

function querySqlite(dbPath, query) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) return resolve({ exists: false, rows: [] });
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return reject(err);
    });
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve({ exists: true, rows });
      db.close();
    });
  });
}

(async () => {
  try {
    const base = path.resolve(__dirname, '..');
    const lowdbPath = path.join(base, 'data', 'db.json');
    console.log('=== lowdb (data/db.json) ===');
    if (fs.existsSync(lowdbPath)) {
      const raw = fs.readFileSync(lowdbPath, 'utf8');
      const obj = JSON.parse(raw || '{}');
      console.log('exists: true');
      console.log('flights.length =', Array.isArray(obj.flights) ? obj.flights.length : 0);
      if (Array.isArray(obj.flights)) console.log(obj.flights.slice(-10));
    } else {
      console.log('exists: false (no lowdb JSON)');
    }

    console.log('\n=== knex sqlite (db/development.sqlite3) ===');
    const knexDbPath = path.join(base, 'db', 'development.sqlite3');
    const knexQ = 'SELECT id, name, start_time, end_time FROM flights ORDER BY start_time DESC LIMIT 20';
    const knexRes = await querySqlite(knexDbPath, knexQ);
    console.log('exists:', knexRes.exists);
    console.log('rows:', knexRes.rows.length);
    console.log(knexRes.rows.slice(-10));

    console.log('\n=== local sqlite (data/data.db) ===');
    const localDbPath = path.join(base, 'data', 'data.db');
    const localQ = "SELECT id, name, startedAt as start_time, endedAt as end_time, status FROM flights ORDER BY datetime(startedAt) DESC LIMIT 20";
    const localRes = await querySqlite(localDbPath, localQ);
    console.log('exists:', localRes.exists);
    console.log('rows:', localRes.rows.length);
    console.log(localRes.rows.slice(-10));

  } catch (e) {
    console.error('Error querying DBs:', e);
    process.exit(1);
  }
})();
