import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { validateData } from '../../middleware/validation.js';
import { sendVerificationEmail } from '../../inc/mail_templates.js';

import dotenv from 'dotenv';

dotenv.config();

async function resetPassword(req, res) {
    if (process.env.ENV === "demo") {
        return res.status(403).json({ error: true, msg: "Reset password is disabled in demo mode." });
    }

    // Валидация входных данных
    const validation = validateData(req.body, 'forgetPasswordRequest');
    if (!validation.isValid) {
        return res.status(400).json({
            error: true,
            msg: 'Validation failed',
            details: validation.errors
        });
    }

    const { mail } = validation.value;

    try {
        // Check if email exists
        const user = await knex('users')
            .whereRaw('LOWER(mail) = LOWER(?)', [mail])
            .first('id');

        if (!user) {
            return res.status(404).json({ error: true, msg: 'Email not found.' });
        }
        
        let randomCode = '';

        // Generate a new verification code
        if (process.env.ENV === "prod") {
            const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const length = 6;
            for (let i = 0; i < length; i++) {
                randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } else {
            randomCode = "CODE123";
        }
        const timexp = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
        const action = 4;

        // Insert the new verification code
        await knex('verify_codes').insert({
            userid: user.id,
            code: randomCode,
            expire: timexp,
            action: action
        });

        // Send verification email
        if (process.env.ENV === "prod") {
            await sendVerificationEmail(mail, user.id, randomCode, randomCode);
        }

        return res.status(200).json({ error: false, msg: 'Code for resetting password sent.' });
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred while generating the verification code. Please try again.' });
    }
}

export default resetPassword;