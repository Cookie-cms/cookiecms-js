import { isJwtExpiredOrBlacklisted } from '../inc/jwtHelper.js';
import dotenv from 'dotenv';
import knex from '../inc/knex.js';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

// Middleware для проверки JWT и прав доступа
export async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

    if (!status.valid) {
      return res.status(401).json({ error: true, msg: status.message, code: 401 });
    }
    req.user = status.payload;

    // Добавляем массив ролей пользователя (role_ids)
    // и массив ключей разрешений пользователя (permission names)
    if (req.user && req.user.sub) {
      const user = await knex('users').where({ id: req.user.sub }).first();
      if (user && user.permission_group_id !== undefined && user.permission_group_id !== null) {
        req.user.roles = [user.permission_group_id];
      } else {
        req.user.roles = [];
      }

      // Получаем разрешения по группе пользователя
      if (req.user.roles.length > 0) {
        const groupPermissions = await knex('permission_group_relations')
          .whereIn('group_id', req.user.roles)
          .pluck('permission_id');

        let permissionKeys = [];
        if (groupPermissions.length > 0) {
          permissionKeys = await knex('permissions')
            .whereIn('id', groupPermissions)
            .pluck('name');
        }

        // Индивидуальные разрешения пользователя (если есть таблица user_permissions)
        const userPermissions = await knex('user_permissions')
          .where({ user_id: req.user.sub })
          .pluck('permission_id');

        if (userPermissions.length > 0) {
          const userPermKeys = await knex('permissions')
            .whereIn('id', userPermissions)
            .pluck('name');
          permissionKeys = permissionKeys.concat(userPermKeys);
        }

        // Удаляем дубликаты
        req.user.role = [...new Set(permissionKeys)];
      } else {
        req.user.role = [];
      }
    } else {
      req.user.roles = [];
      req.user.role = [];
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}