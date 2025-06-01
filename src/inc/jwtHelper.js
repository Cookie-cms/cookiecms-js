import jwt from 'jsonwebtoken';
import knex from './knex.js';
import readConfig from './yamlReader.js';
import logger from '../logger.js';

const config = readConfig();

export async function isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY) {
    try {
        // logger.info('Token:', token);
        // logger.debug('JWT Secret Key:', JWT_SECRET_KEY);

        // Verify and decode JWT
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        logger.debug('Decoded Token:', decoded);

        // If verification fails, the function would have thrown an error already.

        // Check if token is blacklisted
        const blacklistedToken = await knex('blacklisted_jwts')
            .where('jwt', token)
            .first();

        if (blacklistedToken) {
            return { valid: false, message: 'Token is blacklisted' };
        }

        return { valid: true, data: decoded };

    } catch (error) {
        logger.error('JWT verification error:', error);

        if (error.name === 'TokenExpiredError') {
            return { valid: false, message: 'Token has expired' };
        } else if (error.name === 'JsonWebTokenError') {
            return { valid: false, message: 'Invalid token' };
        }

        return { valid: false, message: 'JWT verification failed' };
    }
}

export function generateJwtToken(user, JWT_SECRET_KEY) {
    logger.info('Generating JWT token for user:', user);
    const payload = {
        iss: 'cookiecms',
        sub: user,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };
    logger.debug('Payload:', payload);
    return jwt.sign(payload, JWT_SECRET_KEY, { algorithm: 'HS256' });
}

export async function blacklistJwt(token, expirationTime) {
    try {
        await knex('blacklisted_jwts').insert({
            jwt: token,
            expiration: expirationTime
        });
        return true;
    } catch (error) {
        logger.error('Error blacklisting token:', error);
        return false;
    }
}

export default { isJwtExpiredOrBlacklisted, generateJwtToken, blacklistJwt };