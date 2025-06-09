import jwt from 'jsonwebtoken';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted, blacklistJwt } from '../../inc/jwtHelper.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;
async function logout(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(400).json({ error: true, msg: "Authorization header not found" });
    }

    const token = authHeader.replace("Bearer ", "");

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        
        // Check if token is already blacklisted
        const blacklistedToken = await knex('blacklisted_jwts')
            .where('jwt', token)
            .first();
            
        if (blacklistedToken) {
            return res.status(400).json({ error: true, msg: "Token is already blacklisted" });
        }

        // Get token expiration from decoded JWT
        const expiration = decoded.exp * 1000; // Convert to milliseconds
        
        // Add token to blacklist
        await knex('blacklisted_jwts')
            .insert({
                jwt: token,
                expiration: expiration
            });

        res.status(200).json({ error: false, message: "Logout successful" });
    } catch (err) {
        logger.error("[ERROR] Logout error:", err);
        res.status(400).json({ error: true, msg: "Invalid token" });
    }
}

export default logout;