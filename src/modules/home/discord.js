import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { addaudit, verifyPassword, hashPassword } from '../../inc/common.js';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;


async function validatePassword(userId, password) {
    try {
        const user = await knex('users')
            .where('id', userId)
            .first('password');
            
        if (!user || !user.password) {
            logger.warn(`Password validation failed: User ${userId} not found or no password set`);
            return false;
        }
        
        const isValid = await verifyPassword(password, user.password);
        return isValid;
    } catch (error) {
        logger.error(`Password validation error: ${error.message}`);
        throw new Error('Password validation failed');
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

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

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
        if (!await validatePassword(userId, password)) {
            return res.status(401).json({ 
                error: true, 
                msg: 'Invalid password' 
            });
        }

        const user = await knex('users')
            .where({ id: userId })
            .first('dsid');
            
        const oldDiscordId = user?.dsid;
        
        // Add audit log
        await addaudit(userId, 8, userId, oldDiscordId, null, 'dsid');
        
        // Remove discord connection
        await knex('users')
            .where({ id: userId })
            .update({ dsid: null });

        // Remove discord connection from discord table
        
        res.status(200).json({ 
            error: false, 
            msg: 'Discord connection removed successfully' 
        });

    } catch (error) {
        logger.error('Error removing discord:', error);
        res.status(500).json({ 
            error: true, 
            msg: 'Internal server error' 
        });
    }
}

export default removediscordconn;