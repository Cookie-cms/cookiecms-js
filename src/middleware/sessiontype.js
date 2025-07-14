import knex from '../inc/knex.js';
import logger from '../logger.js';

export const sessionType = (requiredType) => {
    return async (req, res, next) => {
        try {
            // Проверяем, что пользователь аутентифицирован
            if (!req.session.type || !req.session.id) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Session not found. Please authenticate first.'
                });
            }

            // Получаем информацию о сессии из базы данных
            const session = await knex('sessions')
                .where('id', req.session.id)
                .first();

            if (!session) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Session not found in database'
                });
            }

            // Проверяем тип сессии
            if (session.type !== requiredType) {
                logger.warn(`Session type mismatch for user ${req.user.userId}: expected ${requiredType}, got ${session.type}`);
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: `Access denied. Required session type: ${requiredType}, current: ${session.type}`
                });
            }

            // Если тип совпадает, продолжаем
            next();
        } catch (error) {
            logger.error('Session type middleware error:', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to verify session type'
            });
        }
    };
};

// Экспорт для удобства использования
export const webSession = sessionType('web');
export const launcherSession = sessionType('launcher');

export default sessionType;