import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { v4 as uuidv4 } from 'uuid';

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

async function requestMailCode(req, res) {
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
        const { mail, password } = req.body;

        if (!await validatePassword(connection, userId, password)) {
            connection.release();
            return res.status(403).json({ error: true, msg: 'Invalid password' });
        }

        const code = uuidv4();
        await connection.query("INSERT INTO mail_verification (user_id, mail, code) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE code = ?", [userId, mail, code, code]);

        // Send the code to the user's email (implementation depends on your email service)
        // sendMail(mail, code);

        connection.release();
        res.status(200).json({ error: false, msg: 'Verification code sent to email' });
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

async function validateMailCode(req, res) {
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
        const { code, password } = req.body;

        if (!await validatePassword(connection, userId, password)) {
            connection.release();
            return res.status(403).json({ error: true, msg: 'Invalid password' });
        }

        const [verification] = await connection.query("SELECT * FROM mail_verification WHERE user_id = ? AND code = ?", [userId, code]);

        if (verification.length === 0) {
            connection.release();
            return res.status(400).json({ error: true, msg: 'Invalid verification code' });
        }

        await connection.query("UPDATE users SET mail = ?, mail_verify = 1 WHERE id = ?", [verification[0].mail, userId]);
        await connection.query("DELETE FROM mail_verification WHERE user_id = ?", [userId]);

        connection.release();
        res.status(200).json({ error: false, msg: 'Email verified successfully' });
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export { requestMailCode, validateMailCode };
