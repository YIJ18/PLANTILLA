const knex = require('knex');
const knexConfig = require('../knexfile');
(async () => {
  const db = knex(knexConfig.development);
  try {
    const rows = await db('telemetry_data').select('*').orderBy('timestamp', 'desc').limit(10);
    console.log('Recent telemetry rows:');
    console.log(rows);
  } catch (e) {
    console.error('Error querying telemetry_data:', e);
  } finally {
    await db.destroy();
  }
})();
