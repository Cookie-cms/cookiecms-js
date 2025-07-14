import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import { verifyPassword } from '../../inc/common.js';
import { validateData } from '../../middleware/validation.js';
import createSession from '../../inc/createSession.js';


import dotenv from 'dotenv';
import refreshToken from './refreshtoken.js';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

function isEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
}



async function login(req, res) {
    try {
        // Валидация входных данных
        const validation = validateData(req.body, 'sign');
        if (!validation.isValid) {
            return res.status(400).json({
                error: true,
                msg: 'Validation failed',
                details: validation.errors
            });
        }

        const { username, password, meta } = validation.value;
        const clientIP = getClientIP(req);
        const sessionType = meta ? 'launcher' : 'web'; // Определяем тип сессии

        let user;

        try {
            const query = knex('users');

            if (isEmail(username)) {
                query.where('mail', username);
            } else {
                query.where('username', username);
            }

            user = await query.first();

            logger.debug(`User query result: ${user ? JSON.stringify(user) : 'Not Found'}`);
        } catch (err) {
            logger.error(`[ERROR] Database Error on user query: ${err}`);

            if (err instanceof AggregateError) {
                for (const e of err.errors) {
                    logger.error(`[AggregateError item]: ${e}`);
                }
            }

            return res.status(500).json({ error: true, msg: 'Database Error - Unable to find user' });
        }

        if (!user) {
            return res.status(403).json({ error: true, msg: 'Incorrect username or password' });
        }

        if (user.mail_verify === 0) {
            return res.status(403).json({ error: true, msg: 'Please verify your mail' });
        }

        let passwordMatch = false;
        try {
            passwordMatch = await verifyPassword(password, user.password);
        } catch (err) {
            logger.error("[ERROR] Password comparison error:", err);
            return res.status(500).json({ error: true, msg: 'Error verifying credentials' });
        }

        if (!passwordMatch) {
            return res.status(400).json({ error: true, msg: 'Incorrect username or password' });
        }

        if (meta) {
            if (!meta.id || !meta.conn_id) {
                return res.status(400).json({ error: true, msg: 'id or conn_id not provided' });
            }

            try {
                const discordCheck = await knex('users')
                    .where('id', user.id)
                    .select('dsid')
                    .first();

                if (discordCheck?.dsid && discordCheck.dsid !== meta.id) {
                    logger.info(`Discord ID mismatch: existing=${discordCheck.dsid}, new=${meta.id}`);
                    return res.status(403).json({
                        error: true,
                        msg: 'This game account is already linked to another Discord account'
                    });
                }

                const discordLink = await knex('discord')
                    .where('userid', meta.id)
                    .first();

                if (!discordLink || discordLink.conn_id !== meta.conn_id) {
                    logger.info(`Discord connection mismatch: expected=${meta.conn_id}, actual=${discordLink?.conn_id || 'none'}`);
                    return res.status(404).json({ error: true, msg: 'Account cannot be connected' });
                }

                try {
                    await knex('users')
                        .where('id', user.id)
                        .update({ dsid: meta.id, permission_group_id: 1 });

                    logger.info(`User ${user.id} successfully linked to Discord ID ${meta.id}`);
                } catch (err) {
                    logger.error("[ERROR] Failed to update Discord connection:", err);
                }
            } catch (err) {
                logger.error("[ERROR] Discord verification error:", err);
            }
        }

        try {
            // Создаем сессию
            const { sessionId, refresh } = await createSession(user.id, clientIP, sessionType);
            
            // Генерируем JWT токен с ID сессии
            const token = generateJwtToken(user.id, sessionId, JWT_SECRET_KEY);

            logger.info(`Session created for user ${user.id}: sessionId=${sessionId}, type=${sessionType}, ip=${clientIP}`);

            return res.status(200).json({
                error: false,
                msg: 'Login successful',
                url: '/home',
                data: { 
                    jwt: token,
                    refreshToken: refresh,
                }
            });
        } catch (err) {
            logger.error("[ERROR] Session/JWT Error:", err);
            return res.status(500).json({ error: true, msg: 'Session creation error' });
        }
    } catch (err) {
        logger.error("[ERROR] Unhandled error in login:", err);
        return res.status(500).json({ error: true, msg: 'Internal server error' });
    }
}

export default login;