import jwt from 'jsonwebtoken';
import readConfig from './yamlReader.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

export async function isJwtExpiredOrBlacklisted(token, connection) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        const [blacklistedToken] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
        if (blacklistedToken.length > 0) {
            return { valid: false, message: 'Token is blacklisted' };
        }
        return { valid: true, data: decoded };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { valid: false, message: 'Token has expired' };
        } else if (err.name === 'JsonWebTokenError') {
            return { valid: false, message: 'Invalid token signature' };
        }
        throw err;
    }
}