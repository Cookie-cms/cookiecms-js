import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import User from 'discord-oauth2-api/classes/user.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function isJwtExpiredOrBlacklisted(token, connection, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        const [blacklistedToken] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
        if (blacklistedToken.length > 0) {
            return { valid: false, message: 'Token is blacklisted' };
        }
        return { valid: true, data: decoded };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { valid: false, message: 'Token has expired' };
        } else if (err.name === 'JsonWebTokenError') {
            return { valid: false, message: 'Invalid token' };
        }
        return { valid: false, message: 'JWT verification failed' };
    }
}

async function validatePassword(connection, userId, password) {
    const [user] = await connection.query("SELECT password FROM users WHERE id = ?", [userId]);
    return bcrypt.compare(password, user[0].password);
}

async function updateUsername(connection, userId, newUsername, currentPassword) {
    if (!await validatePassword(connection, userId, currentPassword)) {
        throw new Error('Invalid password');
    }

    const [existingUser] = await connection.query("SELECT id FROM users WHERE username = ? AND id != ?", [newUsername, userId]);
    if (existingUser.length > 0) {
        throw new Error('Username is already taken by another user');
    }

    await connection.query("UPDATE users SET username = ? WHERE id = ?", [newUsername, userId]);
}

async function Username(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message });
        }

        const userId = status.data.sub;
        const { username, password } = req.body;

        if (username && password) {
            await updateUsername(connection, userId, username, password);
            res.status(200).json({ error: false, msg: 'Username updated successfully' });
        } else {
            res.status(400).json({ error: true, msg: 'Missing required fields for updating username' });
        }

        connection.release();
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export default username;