const knex = require('knex');
const path = require('path');
const k = knex({
  client: 'sqlite3',
  connection: { filename: path.join(__dirname, '..','backend','node-api','db','development.sqlite3') },
  useNullAsDefault: true
});

(async () => {
  try {
    const tcount = await k('telemetry_data').count('* as cnt');
    const counts = await k('telemetry_data').select('flight_id').count('* as cnt').groupBy('flight_id').orderBy('flight_id','desc').limit(10);
    console.log('Total telemetry rows:', tcount[0].cnt);
    console.log('Counts per flight:', counts);
  } catch (e) {
    console.error('Error querying via knex:', e.message || e);
  } finally {
    await k.destroy();
  }
})();
