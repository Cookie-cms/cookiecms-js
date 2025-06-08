import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { sendVerificationEmail } from '../../inc/mail_templates.js';

import dotenv from 'dotenv';

dotenv.config();
function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

async function requestVerificationCode(req, res) {
    const { mail } = req.body;

    if (process.env.ENV === "demo") { // Fixed assignment to comparison
        return res.status(403).json({ error: true, msg: "Verification code request is disabled in demo mode." });
    }

    if (!mail) {
        return res.status(400).json({ error: true, msg: 'Email not provided.' });
    }

    const validatedMail = validate(mail);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedMail)) {
        return res.status(400).json({ error: true, msg: 'Invalid email format.' });
    }

    try {
        // Check if email exists
        const user = await knex('users')
            .whereRaw('BINARY mail = ?', [validatedMail])
            .select('id', 'mail_verify')
            .first();

        if (!user) {
            return res.status(404).json({ error: true, msg: 'Email not found.' });
        }

        if (user.mail_verify === 1) {
            return res.status(403).json({ error: true, msg: 'Your mail already verified.' });
        }

        // Generate a new verification code
        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        const length = 6;
        for (let i = 0; i < length; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const timexp = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
        const action = 1;

        // Insert the new verification code
        await knex('verify_codes')
            .insert({
                userid: user.id,
                code: randomCode,
                expire: timexp,
                action: action
            });

        await sendVerificationEmail(validatedMail, user.id, randomCode, randomCode);

        return res.status(200).json({ error: false, msg: 'New verification code generated successfully.' });
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred while generating the verification code. Please try again.' });
    }
}

export default requestVerificationCode;