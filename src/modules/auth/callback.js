import oauth from '@cookie-cms/oauth2-discord';
import jwt from 'jsonwebtoken';
import mysql from '../../inc/mysql.js';
import logger from '../../logger.js';
import { createResponse } from '../../inc/_common.js';
import readConfig from '../../inc/yamlReader.js';
import { addaudit } from '../../inc/_common.js';

const config = readConfig();

function generateToken(userId) {
    return jwt.sign(
        {
            iss: config.NameSite,
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        },
        config.securecode,
        { algorithm: 'HS256' }
    );
}

async function linkDiscordToUser(userResponse, userId, connection) {
    await connection.query(
        "UPDATE users SET dsid = ? WHERE id = ?",
        [userResponse.id, userId]
    );

    await addaudit(connection, userId, 9, userId, null, userResponse.id, 'dsid');

    return { success: true, message: "Successfully connected Discord account" };
}

async function registerUser(userResponse, req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    try {
        const connection = await mysql.getConnection();

        let userIdFromToken = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, config.securecode);
                userIdFromToken = decoded.sub;
            } catch (err) {
                logger.warn("Invalid or expired JWT token");
            }
        }

        const [[existingUser]] = await connection.query(
            "SELECT id FROM users WHERE dsid = ?",
            [userResponse.id]
        );

        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;

        await connection.query(
            `INSERT INTO discord (avatar_cache, name_gb, conn_id, expire, mail, userid)
             VALUES (?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE avatar_cache = VALUES(avatar_cache), name_gb = VALUES(name_gb), 
             conn_id = VALUES(conn_id), expire = VALUES(expire), mail = VALUES(mail)`,
            [
                userResponse.avatar,
                userResponse.username,
                randomCode,
                timexp,
                userResponse.email || null,
                userResponse.id,
            ]
        );

        if (userIdFromToken) {
            await linkDiscordToUser(userResponse, userIdFromToken, connection);
            connection.release();
            return res.status(200).json(createResponse(false, 'Successfully connected Discord', "/home"));
        }

        if (existingUser) {
            const userData = {
                jwt: generateToken(existingUser.id),
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            connection.release();
            return res.status(200).json(createResponse(false, 'Successfully logged in', "/home", userData));
        }

        connection.release();
        return res.status(404).json(createResponse(true, 'User not found, do you want to create or link?', "/home", {
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
    const code = req.query.code;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tokenResponse = await oauth.initOAuth(
            config.discord.redirect_url,
            config.discord.client_id,
            config.discord.secret_id,
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
