/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Создание таблицы групп пользователей
  await knex.schema.createTable('permissions_groups', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.integer('level').notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Создание таблицы разрешений
  await knex.schema.createTable('permissions', table => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('category');
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Таблица связи групп и разрешений
  await knex.schema.createTable('permission_group_relations', table => {
    table.increments('id').primary();
    table.integer('group_id').unsigned().references('id').inTable('permissions_groups').onDelete('CASCADE');
    table.integer('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['group_id', 'permission_id']);
  });

  // Таблица для индивидуальных разрешений пользователей
  await knex.schema.createTable('user_permissions', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('permission_id').unsigned().references('id').inTable('permissions').onDelete('CASCADE');
    table.boolean('granted').notNullable().defaultTo(true); // true - дать доступ, false - явно запретить
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable(); // Возможность временного разрешения
    table.unique(['user_id', 'permission_id']);
  });

  // Добавляем поле группы в таблицу пользователей
  await knex.schema.alterTable('users', table => {
    table.integer('permission_group_id').unsigned().references('id').inTable('permissions_groups')
      .onDelete('SET NULL').nullable();
  });

  // Создание стандартных групп по уровням доступа (0-5)
  const groups = [
    { id: 0, name: 'Guest', level: 0, is_default: true },
    { id: 1, name: 'User', level: 1, is_default: false },
    { id: 2, name: 'Premium', level: 2, is_default: false },
    { id: 3, name: 'Moderator', level: 3, is_default: false },
    { id: 4, name: 'Admin', level: 4, is_default: false },
    { id: 5, name: 'Owner', level: 5, is_default: false },
  ];
  
  await knex('permissions_groups').insert(groups);

  // Создание всех разрешений из стандарта
  const permissions = [
    // Базовые разрешения
    { name: 'page.userlist', category: 'page' },
    
    // Разрешения профиля
    { name: 'profile.changeusername', category: 'profile' },
    { name: 'profile.changeskin', category: 'profile',  },
    { name: 'profile.changemail', category: 'profile',  },
    { name: 'profile.changepassword', category: 'profile',  },
    { name: 'profile.discord', category: 'profile',  },
    { name: 'profile.changeskinHD', category: 'profile', description: 'Загрузка HD скинов' },
    
    // Разрешения админа
    { name: 'admin.users', category: 'admin' },
    { name: 'admin.userskins', category: 'admin' },
    { name: 'admin.useredit', category: 'admin'},
    { name: 'admin.user', category: 'admin'},
    { name: 'admin.mailsend', category: 'admin' },
    { name: 'admin.capes', category: 'admin'},
    { name: 'admin.audit', category: 'admin' },
    { name: 'admin.settings', category: 'admin' },
    { name: 'admin.page', category: 'admin' },
    { name: 'admin.owner', category: 'admin' },
    
    // Discord роли
    { name: 'discord.1346586587693187093', category: 'discord' },
  ];
  
  await knex('permissions').insert(permissions);

  // Получаем ID разрешений
  const permIds = {};
  const perms = await knex('permissions').select('id', 'name');
  perms.forEach(p => permIds[p.name] = p.id);

  // Привязка разрешений к группам согласно стандарту
  const permissionMap = {
    0: ['page.userlist'],
    1: ['profile.changeusername', 'profile.changeskin', 'profile.changemail', 'profile.changepassword', 'profile.discord'],
    2: ['profile.changeskinHD'],
    3: ['admin.users', 'admin.userskins', 'admin.useredit', 'admin.user', 'admin.mailsend', 'admin.capes', 'admin.audit', 'discord.1346586587693187093', 'admin.page'],
    4: ['admin.settings'],
    5: ['admin.owner']
  };

  // Создаём массив для связей
  const relations = [];
  
  // Для каждой группы добавляем права своего уровня И всех уровней ниже
  for (let groupId = 0; groupId <= 5; groupId++) {
    for (let level = 0; level <= groupId; level++) {
      if (permissionMap[level]) {
        permissionMap[level].forEach(permName => {
          if (permIds[permName]) {
            relations.push({
              group_id: groupId,
              permission_id: permIds[permName]
            });
          }
        });
      }
    }
  }

  // Вставляем все связи разом
  if (relations.length > 0) {
    await knex('permission_group_relations').insert(relations);
  }

  // Если есть пользователи, устанавливаем им группу по умолчанию
  try {
    const defaultGroupId = 1; // User
    await knex('users').whereNull('permission_group_id').update({ 
      permission_group_id: defaultGroupId 
    });
  } catch (e) {
    // Таблица пользователей может еще не существовать или не иметь записей
    console.log('Skipping default group assignment for users');
  }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Удаляем поле группы из таблицы пользователей
  await knex.schema.alterTable('users', table => {
    table.dropColumn('permission_group_id');
  });

  // Удаляем таблицы в обратном порядке
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('permission_group_relations');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('permissions_groups');
}