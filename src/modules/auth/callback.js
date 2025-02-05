import oauth from '@cookie-cms/oauth2-discord';
import jwt from 'jsonwebtoken';
import mysql from '../../inc/mysql.js';
import logger from '../../logger.js';
import createResponse from '../../inc/_common.js';
import readConfig from '../../inc/yamlReader.js';

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

        const userData = {
            id: userResponse.id,
            username: userResponse.username,
            avatar: userResponse.avatar,
            conn_id: randomCode,
        };

        const responseMessage = existingUser
            ? createResponse(false, 'Logged in', "/home", { user: userData })
            : createResponse(true, 'User not found, do you want to create or link?', "/home", { user: userData });

        res.status(existingUser ? 200 : 404).json(responseMessage);
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
