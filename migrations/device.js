/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.createTable('device_manager', table => {
    table.increments('id').primary();
    table.integer('userid').unsigned().notNullable();
    table.string('ip', 45).notNullable(); // Supports IPv4 and IPv6
    table.string('bt', 255).notNullable(); // Barrier token
    table.string('sessionid', 255).notNullable();
    table.timestamps(true, true);
    table.foreign('userid').references('id').inTable('users').onDelete('CASCADE');
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists('device_manager');
}
