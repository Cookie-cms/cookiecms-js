import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { addaudit } from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;


async function validatePassword(connection, userId, password) {
    const [user] = await connection.query("SELECT password FROM users WHERE id = ?", [userId]);
    return bcrypt.compare(password, user[0].password);
}

async function changePassword(connection, userId, currentPassword, newPassword) {
    if (!await validatePassword(connection, userId, currentPassword)) {
        throw new Error('Invalid password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
}

async function editPassword(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    if (config.demo === true) {
        return res.status(403).json({ error: true, msg: "Registration is disabled in demo mode." });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message });
        }

        const userId = status.data.sub;
        const { password, new_password } = req.body;

        if (password && new_password) {
            await changePassword(connection, userId, password, new_password);
            addaudit(connection, userId, 6, userId, null, null, 'password');
            res.status(200).json({ error: false, msg: 'Password updated successfully' });
        } else {
            res.status(400).json({ error: true, msg: 'Missing required fields for changing password' });
        }

        connection.release();
    } catch (err) {
        logger.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export default editPassword;