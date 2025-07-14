import knex from '../../inc/knex.js';
import logger from '../../logger.js';

export async function getUserSessions(req, res) {
    try {
        const userId = req.user.userId;
        const currentSessionId = req.session.id;

        // Получаем все сессии пользователя
        const sessions = await knex('sessions')
            .where('userid', userId)
            .select(
                'id',
                'ip',
                'type',
                'created_at',
                'updated_at'
            )
            .orderBy('updated_at', 'desc');

        // Добавляем информацию о текущей сессии
        const sessionsWithInfo = sessions.map(session => ({
            ...session,
            is_current: session.id === currentSessionId,
            created_at: session.created_at,
            updated_at: session.updated_at
        }));

        logger.info(`Retrieved ${sessions.length} sessions for user ${userId}`);

        return res.status(200).json({
            error: false,
            msg: 'Sessions retrieved successfully',
            data: {
                sessions: sessionsWithInfo,
                total: sessions.length,
                current_session_id: currentSessionId
            }
        });

    } catch (error) {
        logger.error('Error retrieving user sessions:', error);
        return res.status(500).json({
            error: true,
            msg: 'Failed to retrieve sessions'
        });
    }
}

export async function terminateSession(req, res) {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId;
        const currentSessionId = req.session.id;

        // Проверяем, что сессия принадлежит пользователю
        const session = await knex('sessions')
            .where('id', sessionId)
            .where('userid', userId)
            .first();

        if (!session) {
            return res.status(404).json({
                error: true,
                msg: 'Session not found'
            });
        }

        // Не позволяем завершить текущую сессию
        if (sessionId == currentSessionId) {
            return res.status(400).json({
                error: true,
                msg: 'Cannot terminate current session'
            });
        }

        // Удаляем сессию
        await knex('sessions')
            .where('id', sessionId)
            .where('userid', userId)
            .del();

        logger.info(`Session ${sessionId} terminated by user ${userId}`);

        return res.status(200).json({
            error: false,
            msg: 'Session terminated successfully'
        });

    } catch (error) {
        logger.error('Error terminating session:', error);
        return res.status(500).json({
            error: true,
            msg: 'Failed to terminate session'
        });
    }
}

export async function terminateAllSessions(req, res) {
    try {
        const userId = req.user.userId;
        const currentSessionId = req.session.id;

        // Удаляем все сессии кроме текущей
        const deletedCount = await knex('sessions')
            .where('userid', userId)
            .whereNot('id', currentSessionId)
            .del();

        logger.info(`Terminated ${deletedCount} sessions for user ${userId}`);

        return res.status(200).json({
            error: false,
            msg: `Successfully terminated ${deletedCount} sessions`,
            data: {
                terminated_count: deletedCount
            }
        });

    } catch (error) {
        logger.error('Error terminating all sessions:', error);
        return res.status(500).json({
            error: true,
            msg: 'Failed to terminate sessions'
        });
    }
}

export async function getSessionInfo(req, res) {
    try {
        const userId = req.user.userId;
        const sessionId = req.params.sessionId || req.session.id;

        const session = await knex('sessions')
            .where('id', sessionId)
            .where('userid', userId)
            .select(
                'id',
                'ip',
                'type',
                'created_at',
                'updated_at'
            )
            .first();

        if (!session) {
            return res.status(404).json({
                error: true,
                msg: 'Session not found'
            });
        }

        return res.status(200).json({
            error: false,
            msg: 'Session info retrieved successfully',
            data: {
                session: {
                    ...session,
                    is_current: session.id === req.session.id
                }
            }
        });

    } catch (error) {
        logger.error('Error retrieving session info:', error);
        return res.status(500).json({
            error: true,
            msg: 'Failed to retrieve session info'
        });
    }
}

export default {
    getUserSessions,
    terminateSession,
    terminateAllSessions,
    getSessionInfo
};