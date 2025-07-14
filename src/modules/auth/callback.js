import oauth from '@cookie-cms/oauth2-discord';
import jwt from 'jsonwebtoken';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { createResponse, addaudit } from '../../inc/common.js';
import { validateData } from '../../middleware/validation.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import createSession from '../../inc/createSession.js';

import dotenv from 'dotenv';
import refreshToken from './refreshtoken.js';

dotenv.config();

function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
}



async function linkDiscordToUser(userResponse, userId) {
    await knex('users')
        .where('id', userId)
        .update({ dsid: userResponse.id });

    await addaudit(userId, 9, userId, null, userResponse.id, 'dsid');

    return { success: true, message: "Successfully connected Discord account" };
}

async function registerUser(userResponse, req, res) {
    const clientIP = getClientIP(req);

    try {
        // Check if email exists in users table
        
        let userIdFromToken = null;
        

        const existingUser = await knex('users')
            .where('dsid', userResponse.id)
            .first('id');

        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;

        await knex('discord')
            .insert({
                avatar_cache: userResponse.avatar,
                name_gb: userResponse.username,
                conn_id: randomCode,
                expire: timexp,
                mail: userResponse.email || null,
                userid: userResponse.id
            })
            .onConflict('userid')
            .merge({
                avatar_cache: userResponse.avatar,
                name_gb: userResponse.username,
                conn_id: randomCode,
                expire: timexp,
                mail: userResponse.email || null
            });

        if (userIdFromToken) {
            await linkDiscordToUser(userResponse, userIdFromToken);
            return res.status(200).json(createResponse('Successfully connected Discord', "/home"));
        }

        if (existingUser) {
            // Создаем сессию для существующего пользователя
            const session = await createSession(existingUser.id, clientIP, 'web');
            
            const userData = {
                jwt: generateJwtToken(existingUser.id, session.sessionId, process.env.SECURE_CODE),
                refreshToken: session.refresh,
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
                sessionType: 'web'
            };
            
            logger.info(`Discord OAuth session created for user ${existingUser.id}: sessionId=${session.sessionId}, ip=${clientIP}`);
            
            return res.status(200).json(createResponse('Successfully logged in', "/home", userData));
        }

        return res.status(404).json(createResponse('User not found, do you want to create or link?', "/home", {
            userid: userResponse.id,
            username: userResponse.username,
            avatar: userResponse.avatar,
            conn_id: randomCode,
        }));
    } catch (error) {
        logger.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function discordCallback(req, res) {
    // Валидация query параметров
    const validation = validateData(req.query, 'discordCallback');
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Validation failed',
            details: validation.errors
        });
    }

    const { code } = validation.value;

    try {
        const tokenResponse = await oauth.initOAuth(
            process.env.DISCORD_REDIRECT_URL,
            process.env.DISCORD_CLIENT_ID,
            process.env.DISCORD_SECRET_ID,
            code
        );
        const userResponse = await oauth.getUser(tokenResponse.access_token);
        await registerUser(userResponse, req, res);
    } catch (error) {
        logger.error('Error during Discord OAuth:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default discordCallback;