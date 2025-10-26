const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig.development);
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const username = 'testuser';
    const email = 'test@example.com';
    const name = 'Test User';
    const role = 'admin';
    const password = 'password123';

    const existing = await knex('users').where({ email }).orWhere({ username }).first();
    if (existing) {
      console.log('User already exists:', existing.email || existing.username);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const insertResult = await knex('users').insert({ username, email, password_hash: hash, name, role });
    console.log('Inserted user with result:', insertResult);
    process.exit(0);
  } catch (e) {
    console.error('Error creating user:', e);
    process.exit(1);
  }
})();
