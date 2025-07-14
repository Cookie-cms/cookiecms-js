import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import crypto from 'crypto';

import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
}

function generateBarrierToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function refreshToken(req, res) {
    try {
        // Validate input data

        function parseCookies(cookieHeader) {
            const cookies = {};
            if (cookieHeader) {
                cookieHeader.split(';').forEach(cookie => {
                    const [name, ...rest] = cookie.trim().split('=');
                    const value = rest.join('='); // На случай если в значении есть знаки =
                    if (name && value) {
                        cookies[name] = decodeURIComponent(value);
                    }
                });
            }
            return cookies;
        }
        
        // Использование
        const cookies = parseCookies(req.headers.cookie);
        const refreshToken = cookies.refresh_token; // Только на сервере!
        
        console.log('Refresh Token from cookies:', refreshToken);
        if (!refreshToken) {
            return res.status(401).json({ error: true, msg: 'Refresh token is required' });
        }

        // Ищем сессию по refresh token (barrier)
        const session = await knex('sessions')
            .where('refresh', refreshToken)
            .first();

        console.log('Session found:', session);
        

        if (!session) {
            return res.status(401).json({ 
                error: true, 
                msg: 'Session not found or refresh token invalid' 
            });
        }

        // Проверяем, что пользователь существует
        const user = await knex('users')
            .where('id', session.userid)
            .first();

        if (!user) {
            return res.status(401).json({ 
                error: true, 
                msg: 'User not found' 
            });
        }

        const clientIP = getClientIP(req);
        const newBarrier = generateBarrierToken();

        // Обновляем barrier в сессии
        await knex('sessions')
            .where('id', session.id)
            .update({
                refresh: newBarrier,
                ip: clientIP, // Обновляем IP если изменился
                updated_at: knex.fn.now()
            });
            

        // Генерируем новый JWT токен
        const newToken = generateJwtToken(user.id, session.id, JWT_SECRET_KEY);

        logger.info(`Token refreshed for user ${user.id}, session ${session.id}, new barrier generated`);

        return res.status(200).json({
            error: false,
            msg: 'Token refreshed successfully',
            data: {
                jwt: newToken,
                sessionId: session.id,
                sessionType: session.type,
                refreshToken: newBarrier // Возвращаем новый barrier
            }
        });

    } catch (error) {
        logger.error('[ERROR] Token refresh error:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Internal server error during token refresh' 
        });
    }
}

export default refreshToken;