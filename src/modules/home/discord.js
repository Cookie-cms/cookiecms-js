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
    const [user] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user.length) {
        throw new Error('User not found');
    }
    return bcrypt.compare(password, user[0].password);
}

async function removediscordconn(req, res) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ 
            error: true, 
            msg: 'Invalid token' 
        });
    }

    let connection;
    try {
        connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ 
                error: true, 
                msg: status.message 
            });
        }

        const userId = status.data.sub;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                error: true, 
                msg: 'Password required' 
            });
        }

        // Validate password
        if (!await validatePassword(connection, userId, password)) {
            return res.status(401).json({ 
                error: true, 
                msg: 'Invalid password' 
            });
        }

        const oldDiscordId = (await connection.query('SELECT dsid FROM users WHERE id = ?', [userId]))[0][0].dsid;
        addaudit(connection, userId, 'Discord connection removed', userId, oldDiscordId, null, 'dsid');
        // Remove discord connection
        await connection.query("UPDATE users SET dsid = NULL WHERE id = ?", [userId]);

        res.status(200).json({ 
            error: false, 
            msg: 'Discord connection removed successfully' 
        });

    } catch (error) {
        console.error('Error removing discord:', error);
        res.status(500).json({ 
            error: true, 
            msg: 'Internal server error' 
        });
    } finally {
        if (connection) connection.release();
    }
}

export default removediscordconn;