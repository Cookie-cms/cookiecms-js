import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import knex from '../../inc/knex.js';
import { addaudit } from '../../inc/common.js';
import logger from '../../logger.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.securecode;

async function finishRegister(req, res) {
    const data = req.body;

    // logger.info("Incoming request body: " + JSON.stringify(data, null, 2));

    if (!data.username) {
        logger.info("Username is required.");
        return res.status(400).json({ error: true, msg: 'Username is required.' });
    }

    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

    // logger.info("Token status:", status);

    if (!status.valid) {
        return res.status(401).json({ error: true, msg: status.message });
    }

    const userId = status.data.sub;

    try {
        const user = await knex('users')
            .where('id', userId)
            .select('username', 'uuid', 'mail_verify', 'password')
            .first();

        // logger.info("User data: " + JSON.stringify(user, null, 2));

        if (user && (user.username || user.uuid)) {
            logger.info("User already has a Player account.");
            return res.status(409).json({ error: true, msg: 'You already have a Player account', url: '/home' });
        }

        const existingUsername = await knex('users')
            .where('username', data.username)
            .first();

        if (existingUsername) {
            logger.info("Username already taken.");
            return res.status(409).json({ error: true, msg: 'Username already taken.' });
        } else {
            const newUuid = uuidv4();

            // Using a transaction to ensure data consistency
            await knex.transaction(async (trx) => {
                // Update user
                await trx('users')
                    .where('id', userId)
                    .update({
                        uuid: newUuid,
                        username: data.username
                    });

                // Add audit log
                await addaudit(
                    userId,
                    5,
                    userId,
                    null,  // oldValue
                    data.username,  // newValue
                    'users-update'  // fieldChanged
                );

                // Update password if provided
                if (data.password) {
                    const hashedPassword = await bcrypt.hash(data.password, 10);
                    await trx('users')
                        .where('id', userId)
                        .update({ password: hashedPassword });
                }
            });

            return res.status(200).json({ 
                success: true, 
                msg: 'Registration completed successfully', 
                url: '/home' 
            });
        }
    } catch (error) {
        logger.error("[ERROR] Database Error:", error);
        return res.status(500).json({ 
            error: true, 
            msg: 'An error occurred during registration' 
        });
    }
}

export default finishRegister;