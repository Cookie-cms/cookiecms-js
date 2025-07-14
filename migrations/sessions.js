/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.createTable('sessions', table => {
    table.increments('id').primary();
    table.integer('userid').unsigned().notNullable();
    table.string('ip', 45).notNullable(); // Supports IPv4 and IPv6
    table.string('refresh', 255).notNullable(); // Barrier token
    table.string('expRefresh', 255).nullable(); // Expiration time for refresh token
    table.string('first_seen', 100).nullable(); // User agent string
    table.string('accessToken', 32);
    table.string('lastseen', 100).nullable(); // User agent string
    table.enum('type', ['web', 'launcher']).notNullable(); // Session type
    table.timestamps(true, true);
    table.foreign('userid').references('id').inTable('users').onDelete('CASCADE');
  });
}



/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists('sessions');
}
