/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return Promise.all([

    knex.schema.createTable('devices', table => {
    table.bigIncrements('id').primary(); // исправлено!
    table.integer('userid').unsigned().notNullable();
    table.string('publickey'); // лучше хранить как строку, если не бинарь
    table.string('hwDiskId', 255);
    table.string('baseboardSerialNumber', 255);
    table.string('graphicCard', 255);
    table.string('displayId'); // лучше строка, если не бинарь
    table.integer('bitness');
    table.bigInteger('totalMemory');
    table.integer('logicalProcessors');
    table.integer('physicalProcessors');
    table.bigInteger('processorMaxFreq');
    table.boolean('battery').notNullable().defaultTo(false);
    table.boolean('banned').notNullable().defaultTo(false);
    table.foreign('userid').references('id').inTable('users').onDelete('CASCADE');
  }),

  ])}


/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists('devices');
}

