const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const email = 'admin@astra.com';
    const username = 'admin';
    const existing = await knex('users').where({ email }).first();
    if (existing) {
      console.log('Admin user already exists:', existing.email);
      process.exit(0);
    }
    const password = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const [id] = await knex('users').insert({ username, email, password_hash: hash, name: 'Admin', role: 'admin' });
    console.log('Inserted admin user with id', id);
    process.exit(0);
  } catch (e) {
    console.error('Error creating admin:', e);
    process.exit(1);
  }
})();