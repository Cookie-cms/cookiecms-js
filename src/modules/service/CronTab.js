import mysql from '../../inc/mysql.js';

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