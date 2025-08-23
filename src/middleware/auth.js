import jwt from 'jsonwebtoken';
import knex from '../inc/knex.js';
import config from '../inc/common.js';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

/**
 * Проверяет, существует ли таблица в базе данных
 * @param {string} tableName - Название таблицы
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName) {
  try {
    const result = await knex.schema.hasTable(tableName);
    return result;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Проверяет одно конкретное разрешение для пользователя
 */
async function checkPermission(userId, permission) {
  if (!userId || !permission) return false;
  
  try {
    // Получаем все разрешения пользователя и проверяем наличие нужного
    const userPermissions = await getAllUserPermissions(userId);
    return userPermissions.includes(permission);
  } catch (error) {
    console.error(`Error checking permission "${permission}" for user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Получает все разрешения пользователя (группы + индивидуальные)
 */
async function getAllUserPermissions(userId) {
  try {
    const permissions = new Set();
    
    // Проверяем существование таблиц
    const hasPermissionTables = await tableExists('permissions') && 
                               await tableExists('permissions_groups') && 
                               await tableExists('permission_group_relations');
    
    if (!hasPermissionTables) {
      return ['guest.view'];
    }
    
    // Получаем пользователя и его группу
    const user = await knex('users')
      .leftJoin('permissions_groups', 'users.permission_group_id', 'permissions_groups.id')
      .select('users.username', 'users.permission_group_id', 'permissions_groups.level')
      .where('users.id', userId)
      .first();
      
    if (!user) return [];
    
    // Получаем разрешения из всех групп от уровня 0 до уровня пользователя
    if (user.permission_group_id && user.level !== null) {
      const groupPermissions = await knex('permission_group_relations as pgr')
        .join('permissions as p', 'pgr.permission_id', 'p.id')
        .join('permissions_groups as pg', 'pgr.group_id', 'pg.id')
        .where('pg.level', '<=', user.level)
        .select('p.name')
        .distinct();
      
      groupPermissions.forEach(perm => permissions.add(perm.name));
    }
    
    // Получаем индивидуальные разрешения (с приоритетом)
    const userPermissions = await knex('user_permissions as up')
      .join('permissions as p', 'up.permission_id', 'p.id')
      .where('up.user_id', userId)
      .where(function() {
        this.whereNull('up.expires_at').orWhere('up.expires_at', '>', new Date());
      })
      .select('p.name', 'up.granted');
    
    // Применяем индивидуальные разрешения
    userPermissions.forEach(perm => {
      if (perm.granted) {
        permissions.add(perm.name);
      } else {
        permissions.delete(perm.name);
      }
    });
    
    return Array.from(permissions);
    
  } catch (error) {
    console.error(`Error getting permissions for user ${userId}:`, error);
    return ['guest.view'];
  }
}

/**
 * Middleware для проверки аутентификации
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7);

    // Верифицируем и декодируем токен
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_KEY);
    }
    catch (error) {
      console.error('JWT verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      } else {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to verify token'
        });
      }
    }
    
    // Получаем информацию о сессии из таблицы sessions
    const session = await knex('sessions')
      .where('id', decoded.sessionId)
      .first();
    if (!session) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Session not found' 
      });
    }
    
    const user = await knex('users')
      .where('id', session.userid)
      .first();
      
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User not found' 
      });
    }
    
    // Получаем разрешения и формируем объект пользователя
    const permissions = await getAllUserPermissions(user.id);
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.mail,
      groupId: user.permission_group_id,
      permissions,
      sub: user.id // для обратной совместимости
    };
    
    // Добавляем информацию о сессии
    req.session = {
      id: session.id,
      type: session.type,
    };

    // console.log(session.type);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    const errorMessage = error.name === 'JsonWebTokenError' ? 'Invalid token' 
                      : error.name === 'TokenExpiredError' ? 'Token expired'
                      : 'Authentication failed';
    
    const statusCode = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    
    return res.status(statusCode).json({ 
      error: statusCode === 401 ? 'Unauthorized' : 'Internal Server Error', 
      message: errorMessage 
    });
  }
};


/**
 * Middleware для проверки аутентификации
 */
export const requireAuthGravit = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7);

    // Верифицируем и декодируем токен
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET_KEY);
    }
    catch (error) {
      console.error('JWT verification error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token has expired'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      } else {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to verify token'
        });
      }
    }
    
    // Получаем информацию о сессии из таблицы sessions
    const session = await knex('sessions')
      .where('id', decoded.sessionId)
      .first();
    if (!session) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Session not found' 
      });
    }
    
    const user = await knex('users')
      .where('id', session.userid)
      .first();
      
    if (!user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'User not found' 
      });
    }
    
    // Получаем разрешения и формируем объект пользователя
    const permissions = await getAllUserPermissions(user.id);
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.mail,
      groupId: user.permission_group_id,
      permissions,
      sub: user.id // для обратной совместимости
    };
    
    // Добавляем информацию о сессии
    req.session = {
      id: session.id,
      type: session.type,
    };

    // console.log(session.type);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    const errorMessage = error.name === 'JsonWebTokenError' ? 'Invalid token' 
                      : error.name === 'TokenExpiredError' ? 'Token expired'
                      : 'Authentication failed';
    
    const statusCode = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    
    return res.status(statusCode).json({ 
      error: statusCode === 401 ? 'Unauthorized' : 'Internal Server Error', 
      message: errorMessage 
    });
  }
};


/**
 * Middleware для проверки разрешений
 */
export const requirePermission = (requiredPermissions, operator = 'OR') => {
  return (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    const userPermissions = req.user.permissions;
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    const hasPermission = operator === 'AND' 
      ? permissions.every(perm => userPermissions.includes(perm))
      : permissions.some(perm => userPermissions.includes(perm));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions',
        required: permissions,
        userPermissions
      });
    }
    
    next();
  };
};

/**
 * Middleware для проверки минимального уровня доступа
 */
export const requireMinLevel = (minLevel) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }
    
    try {
      const userGroup = await knex('permissions_groups')
        .where('id', req.user.groupId)
        .select('level')
        .first();
      
      const userLevel = userGroup?.level || 0;
      
      if (userLevel < minLevel) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: `Minimum permission level ${minLevel} required`,
          userLevel
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking user level:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Failed to check permissions' 
      });
    }
  };
};

// Для обратной совместимости
export const requireLevel = requireMinLevel;
export const requireAnyPermission = (permissions) => requirePermission(permissions, 'OR');

// Экспортируем функцию проверки разрешений
export { checkPermission };