import knex from '../../inc/knex.js';



async function checkExpiredRoles() {
    const now = new Date();
    const [users] = await db.query(
      "SELECT id FROM users WHERE role_expires_at IS NOT NULL AND role_expires_at <= ?",
      [now]
    );
  
    if (users.length > 0) {
      const ids = users.map(user => user.id);
      await db.query("UPDATE users SET role = 'default', role_expires_at = NULL WHERE id IN (?)", [ids]);
      logger.info(`Сброшены роли для пользователей: ${ids.join(", ")}`);
    }
  }


async function createtask(job_name, action, target_id, scheduled_date, status = 'pending') {
    const created_at = Math.floor(Date.now() / 1000); // Unix time в секундах
    const updated_at = created_at;

    try {
        await knex('job_schedule').insert({
            job_name,
            action,
            target_id,
            scheduled_date,
            status,
            created_at,
            updated_at
        });
        return { success: true, msg: 'Task created successfully' };
    }
    catch (error) {
        console.error('Error creating task:', error);
        return { success: false, msg: 'Failed to create task' };
    }
}