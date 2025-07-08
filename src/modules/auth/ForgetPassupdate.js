import bcrypt from 'bcrypt';
import { createResponse, addaudit } from '../../inc/common.js';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { validateData } from '../../middleware/validation.js';

import dotenv from 'dotenv';

dotenv.config();

async function updatepass(req, res) {
    if (process.env.ENV === "demo") {
        return res.status(403).json(createResponse(true, 'Password reset is disabled in demo mode.'));
    }

    // Валидация входных данных
    const validation = validateData(req.body, 'resetPassword');
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Validation failed',
            details: validation.errors
        });
    }

    const { code, password } = validation.value;

    try {
        // Using knex transaction to ensure data consistency
        await knex.transaction(async (trx) => {
            const codeData = await trx('verify_codes')
                .join('users', 'verify_codes.userid', '=', 'users.id')
                .where('verify_codes.code', code)
                .first('verify_codes.userid', 'verify_codes.expire');

            if (!codeData) {
                throw new Error('Invalid or expired token');
            }

            // Check if the token is expired
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime > codeData.expire) {
                // Delete the expired verification code
                await trx('verify_codes')
                    .where('code', code)
                    .delete();
                    
                throw new Error(`Token has expired. Current time: ${new Date(currentTime * 1000)} Expire time: ${new Date(codeData.expire * 1000)}`);
            }

            // Hash the new password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            
            // Add audit log entry
            await addaudit(codeData.userid, 2, codeData.userid, null, null, null);
            
            // Update the user's password
            await trx('users')
                .where('id', codeData.userid)
                .update({ password: hashedPassword });

            // Delete the verification code
            await trx('verify_codes')
                .where('code', code)
                .delete();
        });

        return res.status(200).json(createResponse(false, 'Password updated successfully'));
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        
        if (err.message.includes('Invalid or expired token') || err.message.includes('Token has expired')) {
            return res.status(400).json(createResponse(true, err.message));
        }
        
        return res.status(500).json(createResponse(true, 'Database Error'));
    }
}

export default updatepass;