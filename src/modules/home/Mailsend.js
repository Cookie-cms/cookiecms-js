import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { sendVerificationEmail, sendMailUnlinkNotification } from '../../inc/mail_templates.js';
import { addaudit, verifyPassword } from '../../inc/common.js';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}


export async function changemail(req, res) {
    try {
        const { mail, password } = req.body;
        logger.info(mail);
        logger.info(password);
        const token = req.headers.authorization?.split(' ')[1];

        if (!mail || !password || !token) {
            return res.status(400).json({ error: true, msg: "Incomplete form data provided." });
        }

        // if (config.demo === true) {
        //     return res.status(403).json({ error: true, msg: "Registration is disabled in demo mode." });
        // }

        // Verify token and get user ID
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message });
        }

        const userId = status.data.sub;
        const validatedMail = validate(mail);

        const user = await knex('users')
            .where({ id: userId })
            .first('password');

        // Правильно: передаём хеш пароля из объекта user
       

        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedMail)) {
            return res.status(400).json({ error: true, msg: "Invalid email format" });
        }

        // Check if password is correct
        if (!await verifyPassword(password, user.password)) {
            return res.status(401).json({ error: true, msg: "Invalid password" });
        }

        // Check if email already exists
        const existingUser = await knex('users')
            .whereRaw('mail = ?', [validatedMail])
            .andWhereNot('id', userId)
            .first();

        if (existingUser) {
            return res.status(409).json({ error: true, msg: "Email already in use" });
        }

        // Generate verification code
        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        const length = 6;
        for (let i = 0; i < length; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Store verification code
        const timexp = Math.floor(Date.now() / 1000) + 3600;
        const action = 2; // Action type for email change

        // Get old email for audit and notifications
        const oldMailData = await knex('users')
            .where({ id: userId })
            .first('mail');
            
        const oldEmail = oldMailData.mail;

        // Use transaction for data consistency
        await knex.transaction(async (trx) => {
            // Add audit log
            await addaudit(userId, 7, userId, oldEmail, validatedMail, 'mail');

            // Add verification code
            await trx('verify_codes').insert({
                userid: userId,
                code: randomCode,
                expire: timexp,
                action: action
            });

            // Update user email
            await trx('users')
                .where({ id: userId })
                .update({ mail: validatedMail });
        });

        // Send verification email
        if (process.env.ENV === 'production') {
            await sendVerificationEmail(validatedMail, randomCode, randomCode);
        }
        try {
            // logger.info(oldEmail);
            if (process.env.ENV === 'production') {
                await sendMailUnlinkNotification(oldEmail);
            }
        } catch (error) {
            logger.error("[ERROR] Failed to send unlink notification:", error);
        }

        return res.status(200).json({ 
            error: false, 
            msg: "Verification email sent to new address" 
        });

    } catch (error) {
        logger.error("[ERROR] Change mail error:", error);
        return res.status(500).json({ 
            error: true, 
            msg: "An error occurred while changing email" 
        });
    }
}

export default changemail;