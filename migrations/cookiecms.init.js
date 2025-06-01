/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return Promise.all([
    // Audit Log
    knex.schema.createTable('audit_log', table => {
      table.increments('id');
      table.integer('iss').notNullable();
      table.integer('action').notNullable();
      table.integer('target_id').notNullable();
      table.text('old_value');
      table.text('new_value');
      table.string('field_changed', 255);
      table.bigInteger('time').notNullable();
      
      table.index('iss');
      table.index('target_id');
      table.index('time');
    }),

    // Blacklisted JWTs
    knex.schema.createTable('blacklisted_jwts', table => {
      table.increments('id');
      table.text('jwt').notNullable();
      table.bigInteger('expiration');
      
      table.index('expiration');
    }),

    // Cloaks Library
    knex.schema.createTable('cloaks_lib', table => {
      table.string('uuid', 255).primary();
      table.string('name', 255).notNullable();
    }),

    // Users table (Create before references)
    knex.schema.createTable('users', table => {
      table.increments('id');
      table.string('username', 255);
      table.string('dsid', 100);
      table.string('mail', 255);
      table.integer('mail_verify').defaultTo(0);
      table.uuid('uuid');
      table.string('password', 255);
      table.integer('perms').notNullable().defaultTo(1);
      table.string('accessToken', 32);
      table.string('serverID', 41);
      table.bigInteger('hwidId');
    }),

    // HWIDs
    knex.schema.createTable('hwids', table => {
      table.bigInteger('id').primary();
      table.binary('publickey');
      table.string('hwDiskId', 255);
      table.string('baseboardSerialNumber', 255);
      table.string('graphicCard', 255);
      table.binary('displayId');
      table.integer('bitness');
      table.bigInteger('totalMemory');
      table.integer('logicalProcessors');
      table.integer('physicalProcessors');
      table.bigInteger('processorMaxFreq');
      table.boolean('battery').notNullable().defaultTo(false);
      table.boolean('banned').notNullable().defaultTo(false);
    }),

    // Job Schedule
    knex.schema.createTable('job_schedule', table => {
      table.increments('id');
      table.string('job_name', 255).notNullable();
      table.string('action', 255).notNullable();
      table.integer('target_id').notNullable();
      table.bigInteger('scheduled_date').notNullable();
      table.enum('status', ['pending', 'completed', 'cancelled']).defaultTo('pending');
      table.bigInteger('created_at');
      table.bigInteger('updated_at');
    }),

    // Skins Library
    knex.schema.createTable('skins_library', table => {
      table.string('uuid', 255).primary();
      table.string('name', 255).notNullable();
      table.integer('ownerid').notNullable();
      table.boolean('slim').notNullable().defaultTo(false);
      table.boolean('hd').notNullable().defaultTo(false);
      table.boolean('disabled').notNullable().defaultTo(false);
      table.string('cloak_id', 256).notNullable().defaultTo('0');
      
      table.foreign('ownerid').references('users.id').onDelete('CASCADE');
    }),

    // User Permissions
    knex.schema.createTable('user_permissions', table => {
      table.string('uuid', 100).notNullable();
      table.string('name', 100).notNullable();
    }),

    // Verify Codes
    knex.schema.createTable('verify_codes', table => {
      table.increments('id');
      table.integer('userid').notNullable();
      table.string('code', 64).notNullable();
      table.integer('action').notNullable();
      table.bigInteger('expire');
      
      table.foreign('userid').references('users.id').onDelete('CASCADE');
    })
  ]).then(() => {
    // Tables with foreign keys after parent tables are created
    return Promise.all([
      // Cloaks Users - depends on users and cloaks_lib
      knex.schema.createTable('cloaks_users', table => {
        table.increments('id');
        table.integer('uid').notNullable();
        table.string('cloak_id', 255).notNullable();
        
        table.foreign('uid').references('users.id').onDelete('CASCADE');
        table.foreign('cloak_id').references('cloaks_lib.uuid').onDelete('CASCADE');
      }),

      // Skin User - depends on users and skins_library
      knex.schema.createTable('skin_user', table => {
        table.integer('uid').notNullable();
        table.string('skin_id', 100).notNullable();
        
        table.unique('uid');
        table.foreign('uid').references('users.id').onDelete('CASCADE');
        table.foreign('skin_id').references('skins_library.uuid').onDelete('CASCADE');
      }),

      // Discord
      knex.schema.createTable('discord', table => {
        table.bigInteger('userid').primary();
        table.string('avatar_cache', 256).notNullable();
        table.string('name_gb', 256).notNullable();
        table.integer('conn_id');
        table.string('mail', 256);
        table.bigInteger('expire');
      }),

      // Add foreign key from users to hwids
      knex.schema.alterTable('users', table => {
        table.foreign('hwidId').references('hwids.id').onDelete('SET NULL');
      })
    ]);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('skin_user'),
    knex.schema.dropTableIfExists('cloaks_users'),
    knex.schema.dropTableIfExists('verify_codes'),
    knex.schema.dropTableIfExists('user_permissions'),
    knex.schema.dropTableIfExists('discord'),
    knex.schema.dropTableIfExists('skins_library'),
    knex.schema.dropTableIfExists('job_schedule'),
    knex.schema.dropTableIfExists('users'),
    knex.schema.dropTableIfExists('hwids'),
    knex.schema.dropTableIfExists('cloaks_lib'),
    knex.schema.dropTableIfExists('blacklisted_jwts'),
    knex.schema.dropTableIfExists('audit_log')
  ]);
}