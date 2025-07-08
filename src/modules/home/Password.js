import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import logger from '../../logger.js';
import { addaudit, verifyPassword, hashPassword } from '../../inc/common.js';
import { validateData } from '../../middleware/validation.js';

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

async function updatePassword(userId, currentPassword, newPassword) {
    try {
        // Validate current password
        const isValidPassword = await validatePassword(userId, currentPassword);
        
        if (!isValidPassword) {
            return { success: false, message: 'Current password is incorrect' };
        }

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
        // Update password and add audit
        await knex.transaction(async (trx) => {
            await trx('users')
                .where('id', userId)
                .update({ password: hashedPassword });
                
            await addaudit(userId, 6, userId, null, '[REDACTED]', 'password');
        });

        return { success: true, message: 'Password updated successfully' };
    } catch (error) {
        logger.error(`Password update error: ${error.message}`);
        throw new Error('Failed to update password');
    }
}

async function editPassword(req, res) {
    const token = req.headers['authorization']?.replace('Bearer ', '') || '';
    
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const userId = status.data.sub;
        const { currentPassword, newPassword } = req.body;

        // Проверяем наличие всех необходимых полей
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: true, msg: 'Missing required fields for changing password' });
        }

        // Проверяем минимальную длину нового пароля
        if (newPassword.length < 8) {
            return res.status(400).json({ error: true, msg: 'New password must be at least 8 characters long' });
        }

        const result = await updatePassword(userId, currentPassword, newPassword);
        
        if (result.success) {
            res.status(200).json({ error: false, msg: result.message });
        } else {
            res.status(400).json({ error: true, msg: result.message });
        }
    } catch (err) {
        logger.error(`[ERROR] Password Change Error: ${err.message}`);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

export default editPassword;