/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('flights', function (table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.datetime('start_time').notNullable();
      table.datetime('end_time');
    })
    .createTable('telemetry_data', function (table) {
      table.increments('id').primary();
      table.integer('flight_id').unsigned().references('id').inTable('flights').onDelete('CASCADE');
      table.integer('timestamp').notNullable();
      table.float('roll');
      table.float('pitch');
      table.float('yaw');
      table.float('accX');
      table.float('accY');
      table.float('accZ');
      table.float('temp');
      table.float('pres');
      table.float('hum');
      table.float('latitude');
      table.float('longitude');
      table.float('altitude');
      table.float('altitude_calc1');
      table.float('altitude_calc2');
      table.float('altitude_calc3');
      table.integer('satellites');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('telemetry_data')
    .dropTableIfExists('flights');
};
