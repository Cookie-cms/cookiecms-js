import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import { verifyPassword } from '../../inc/common.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

function validate(data) {
    if (typeof data !== 'string') return '';
    return data.trim().replace(/<[^>]*>?/gm, '');
}

function isEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

async function login(req, res) {
    try {
        const { username, password, meta } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: true, msg: 'Username or password not provided' });
        }

        const validatedUsername = validate(username);
        const validatedPassword = validate(password);

        let user;

        try {
            const query = knex('users');

            if (isEmail(validatedUsername)) {
                query.where('mail', validatedUsername);
            } else {
                query.where('username', validatedUsername);
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
            passwordMatch = await verifyPassword(validatedPassword, user.password);
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
                        .update({ dsid: meta.id });

                    logger.info(`User ${user.id} successfully linked to Discord ID ${meta.id}`);
                } catch (err) {
                    logger.error("[ERROR] Failed to update Discord connection:", err);
                }
            } catch (err) {
                logger.error("[ERROR] Discord verification error:", err);
            }
        }

        try {
            const token = generateJwtToken(user.id, JWT_SECRET_KEY);

            return res.status(200).json({
                error: false,
                msg: 'Login successful',
                url: '/home',
                data: { jwt: token }
            });
        } catch (err) {
            logger.error("[ERROR] JWT Error:", err);
            return res.status(500).json({ error: true, msg: 'JWT Error' });
        }
    } catch (err) {
        logger.error("[ERROR] Unhandled error in login:", err);
        return res.status(500).json({ error: true, msg: 'Internal server error' });
    }
}

export default login;
