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

async function registerUser(userResponse, res) {
    try {
        const connection = await mysql.getConnection();
        const [[existingUser]] = await connection.query(
            "SELECT id FROM users WHERE dsid = ?",
            [userResponse.id]
        );

        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;
        
        const [[discordInfo]] = await connection.query(
            "SELECT * FROM discord WHERE userid = ?",
            [userResponse.id]
        );

        if (discordInfo) {
            await connection.query(
                `UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ?, mail = ? WHERE userid = ?`,
                [
                    userResponse.avatar,
                    userResponse.username,
                    randomCode,
                    timexp,
                    userResponse.email || null,
                    userResponse.id,
                ]
            );
        } else {
            await connection.query(
                `INSERT INTO discord (avatar_cache, name_gb, conn_id, expire, mail, userid) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userResponse.avatar,
                    userResponse.username,
                    randomCode,
                    timexp,
                    userResponse.email || null,
                    userResponse.id,
                ]
            );
        }

        connection.release();

        if (existingUser) {
            const userData = {
                jwt: generateToken(existingUser.id),
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(200).json(createResponse(false, 'Successfully logged in', "/home", userData));
        } else {
            const registerData = {
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(404).json(createResponse(true, 'User not found, do you want to create or link?', "/home", registerData));
        }
    } catch (error) {
        console.error('Error during user registration:', error);
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
        await registerUser(userResponse, res);
    } catch (error) {
        console.error('Error during Discord OAuth:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default discordCallback;