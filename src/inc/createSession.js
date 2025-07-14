import knex from  './knex.js';
import logger from '../logger.js'
import crypto from 'crypto';

export async function createSession(userId, ip, sessionType = 'web') {
    try {
        const refresh = crypto.randomBytes(32).toString('hex')
        
        const result = await knex('sessions').insert({
            userid: typeof userId === 'object' ? userId.id : userId, // гарантируем число
            ip,
            refresh,
            type: sessionType
        }).returning('id');
        
        // Правильно извлекаем ID из результата PostgreSQL
        let sessionId;
        if (Array.isArray(result) && result.length > 0) {
            sessionId = typeof result[0] === 'object' ? result[0].id : result[0];
        } else {
            sessionId = typeof result === 'object' ? result.id : result;
        }
        
        // Логируем для отладки
        logger.debug(`Session created: sessionId=${sessionId}, userId=${userId}, type=${typeof sessionId}`);
        logger.debug('Raw result from database:', result);
        
        return { sessionId, refresh };
    } catch (error) {
        logger.error('[ERROR] Failed to create session:', error);
        throw error;
    }
}

export default createSession;