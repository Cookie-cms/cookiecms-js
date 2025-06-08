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

  // Создание стандартных групп по уровням доступа (0-5)
  const groups = [
    { id: 0, name: 'Guest', description: 'Гости с минимальными правами', level: 0, is_default: true },
    { id: 1, name: 'User', description: 'Стандартный пользователь', level: 1, is_default: false },
    { id: 2, name: 'Premium', description: 'Премиум пользователь с HD скинами', level: 2, is_default: false },
    { id: 3, name: 'Moderator', description: 'Модератор с базовыми правами админа', level: 3, is_default: false },
    { id: 4, name: 'Admin', description: 'Администратор с доступом к настройкам', level: 4, is_default: false },
    { id: 5, name: 'Owner', description: 'Владелец с полными правами', level: 5, is_default: false },
  ];
  
  await knex('permissions_groups').insert(groups);

  // Создание всех разрешений из стандарта
  const permissions = [
    // Базовые разрешения
    { name: 'page.userlist', category: 'page', description: 'Просмотр списка пользователей' },
    
    // Разрешения профиля
    { name: 'profile.changeusername', category: 'profile', description: 'Изменение имени пользователя' },
    { name: 'profile.changeskin', category: 'profile', description: 'Изменение обычного скина' },
    { name: 'profile.changemail', category: 'profile', description: 'Изменение email' },
    { name: 'profile.changepassword', category: 'profile', description: 'Изменение пароля' },
    { name: 'profile.discord', category: 'profile', description: 'Подключение Discord' },
    { name: 'profile.changeskinHD', category: 'profile', description: 'Загрузка HD скинов' },
    
    // Разрешения админа
    { name: 'admin.users', category: 'admin', description: 'Управление пользователями' },
    { name: 'admin.userskins', category: 'admin', description: 'Управление скинами пользователей' },
    { name: 'admin.useredit', category: 'admin', description: 'Редактирование пользователей' },
    { name: 'admin.user', category: 'admin', description: 'Базовый доступ к админ-панели' },
    { name: 'admin.mailsend', category: 'admin', description: 'Отправка email' },
    { name: 'admin.capes', category: 'admin', description: 'Управление плащами' },
    { name: 'admin.audit', category: 'admin', description: 'Просмотр аудита' },
    { name: 'admin.settings', category: 'admin', description: 'Управление настройками' },
    { name: 'admin.owner', category: 'admin', description: 'Полный доступ (владелец)' },
    
    // Discord роли
    { name: 'discord.1346586587693187093', category: 'discord', description: 'Доступ к Discord роли' },
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
    3: ['admin.users', 'admin.userskins', 'admin.useredit', 'admin.user', 'admin.mailsend', 'admin.capes', 'admin.audit', 'discord.1346586587693187093'],
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
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Удаляем таблицы в обратном порядке
  await knex.schema.dropTableIfExists('permission_group_relations');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('permissions_groups');
}