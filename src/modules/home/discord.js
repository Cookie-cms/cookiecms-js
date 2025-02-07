import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';

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

        // Remove discord connection
        await connection.query("UPDATE users SET discord_id = NULL WHERE id = ?", [userId]);

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