/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('flight_events', function(table) {
    table.increments('id').primary();
    table.integer('flight_id').unsigned().notNullable().references('id').inTable('flights').onDelete('CASCADE');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.string('event_type').notNullable(); // 'warning', 'error', 'info'
    table.string('source').notNullable(); // 'lora', 'gps', 'bme', 'system'
    table.text('message').notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('flight_events');
};
