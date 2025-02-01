import bcrypt from 'bcrypt';
import pool from '../../inc/mysql.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import { logger } from 'winston';
// import logger from '../../logger.js';


const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

async function isJwtExpiredOrBlacklisted(token, connection, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        const [blacklistedToken] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
        if (blacklistedToken.length > 0) {
            return false;
        }
        return { valid: true, data: decoded };
    } catch (err) {
        return false;
    }
}

async function generateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function finishRegister(req, res) {
    const { username, password } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!username) {
        return res.status(400).json({ error: true, msg: 'Username is required.' });
    }

    if (password && password.length < 6) {
        return res.status(400).json({ error: true, msg: 'Password must be at least 6 characters.' });
    }

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    try {
        const connection = await pool.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (status) {
            const userId = status.data.sub;

            const [user] = await connection.query("SELECT username, uuid, mail_verify, password FROM users WHERE id = ?", [userId]);

            if (user && user.length && (user[0].username || user[0].uuid || user[0].password)) {
                connection.release();
                return res.status(409).json({ error: true, msg: 'You already have a Player account', url: '/home' });
            }

            const [existingUsername] = await connection.query("SELECT username FROM users WHERE username = ?", [username]);

            if (existingUsername.length) {
                connection.release();
                return res.status(409).json({ error: true, msg: 'Username already taken.' });
            } else {
                const uuid = uuidv4();
                await connection.query("UPDATE users SET uuid = ?, username = ? WHERE id = ?", [uuid, username, userId]);

                if (password) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
                }

                connection.release();
                return res.status(200).json({ error: false, msg: 'Created', url: '/home' });
            }
        } else {
            connection.release();
            return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
        }
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred. Please try again later.' });
    }
}

export default finishRegister;