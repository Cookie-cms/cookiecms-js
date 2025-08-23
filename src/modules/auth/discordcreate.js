import knex from '../../inc/knex.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../../logger.js';
import sendEmbed from '../../inc/common.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import { addaudit } from '../../inc/common.js';
import { validateData } from '../../middleware/validation.js';
import crypto from 'crypto';
import createSession from '../../inc/createSession.js';

import dotenv from 'dotenv';
dotenv.config();


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


export async function discordcreate(req, res) {
    // Валидация входных данных
    const validation = validateData(req.body, 'discordCreate');
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Validation failed',
            details: validation.errors
        });
    }

    const { meta } = validation.value;
    const { id, conn_id } = meta;

    try {
        const JWT_SECRET_KEY = process.env.SECURE_CODE;
        
        // Проверяем наличие JWT секрета
        if (!JWT_SECRET_KEY) {
            logger.error('[ERROR] JWT_SECRET_KEY (SECURE_CODE) is not defined in environment variables');
            return res.status(500).json({ error: true, msg: 'Server configuration error' });
        }
 
        const discord_link = await knex('discord')
            .where('userid', id)
            .first();

        if (!discord_link || discord_link.conn_id !== conn_id) {
            logger.info('Discord:', discord_link?.conn_id, 'Meta:', conn_id, 'Discord:', discord_link);
            return res.status(404).json({ error: true, msg: 'Account cannot be connected' });
        }

        // Проверяем, не занята ли уже почта другим пользователем
        if (discord_link.mail) {
            const existingUser = await knex('users')
                .where('mail', discord_link.mail)
                .first();

            if (existingUser) {
                return res.status(409).json({ 
                    error: true, 
                    msg: 'Email address is already registered with another account' 
                });
            }
        }

        let userId;
        const clientIP = getClientIP(req);

        // Using a transaction for data consistency
        await knex.transaction(async (trx) => {
            const insertData = {
                dsid: id,
                permission_group_id: 1,  // Default permission group
            };
            
            if (discord_link.mail) {
                insertData.mail = discord_link.mail;
                insertData.mail_verify = 1;
            }
            
            // Insert new user
            [userId] = await trx('users')
                .insert(insertData)
                .returning('id');
                
            // Add audit log entry
            await addaudit(userId, 1, userId, null, null, null);
        });
        
        logger.info('User ID:', userId);
        
        // Создаем сессию
        const { sessionId, refresh } = await createSession(userId, clientIP, 'web');
        
        // Генерируем JWT токен с ID сессии
        const token = generateJwtToken(userId, sessionId, JWT_SECRET_KEY);

        // logger.info(`Discord registration session created for user ${userId}: sessionId=${sessionId}, ip=${clientIP}`);
        console.log("Discord registration successful for user:", userId);
        return res.status(200).json({ 
            error: false, 
            msg: "Registration successful", 
            // urlYES I CONFIRM TO RESET: "/home",  // Optional redirect URL
            data: {
                jwt: token,  // The JWT token for authenticated requests
                refreshToken: refresh,  // The session refresh token
            }
        });
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: "An error occurred during registration. Please try again later." });
    }
}

export default discordcreate;