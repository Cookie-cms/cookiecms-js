import jwt from 'jsonwebtoken';
import readConfig from './yamlReader.js';

const config = readConfig();

export async function isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY) {
    try {
        // console.log('Token:', token);
        // console.log('JWT Secret Key:', JWT_SECRET_KEY);

        // Verify and decode JWT
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        // console.log('Decoded Token:', decoded);

        // If verification fails, the function would have thrown an error already.

        // Check if token is blacklisted
        const [blacklistedToken] = await connection.query(
            "SELECT * FROM blacklisted_jwts WHERE jwt = ?", 
            [token]
        );

        if (blacklistedToken.length > 0) {
            return { valid: false, message: 'Token is blacklisted' };
        }

        return { valid: true, data: decoded };

    } catch (error) {
        console.error('JWT verification error:', error);

        if (error.name === 'TokenExpiredError') {
            return { valid: false, message: 'Token has expired' };
        } else if (error.name === 'JsonWebTokenError') {
            return { valid: false, message: 'Invalid token' };
        }

        return { valid: false, message: 'JWT verification failed' };
    }
};

export function generateJwtToken(user, JWT_SECRET_KEY) {
    console.info('Generating JWT token for user:', user);
    const payload = {
        iss: 'cookiecms',
        sub: user,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };
    console.info('Payload:', payload);
    return jwt.sign(payload, JWT_SECRET_KEY, { algorithm: 'HS256' });
}

export default { isJwtExpiredOrBlacklisted, generateJwtToken };