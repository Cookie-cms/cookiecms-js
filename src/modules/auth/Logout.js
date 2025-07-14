import jwt from 'jsonwebtoken';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

async function logout(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ 
            error: true, 
            msg: "Authorization header not found" 
        });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    
    if (!token) {
        return res.status(400).json({ 
            error: true, 
            msg: "No token provided" 
        });
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        const sessionId = decoded.sessionId;

        // Remove session from database
        await knex('sessions')
            .where('id', sessionId)
            .delete();
        

        res.status(200).json({ 
            error: false, 
            message: "Logout successful" 
        });
    } catch (err) {
        logger.error("[ERROR] Logout error:", err);
        
        // Different error messages for different JWT errors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: true, 
                msg: "Token has already expired" 
            });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: true, 
                msg: "Invalid token format" 
            });
        }
        
        res.status(400).json({ 
            error: true, 
            msg: "Invalid token" 
        });
    }
}

export default logout;