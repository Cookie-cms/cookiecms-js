import knex from '../../inc/knex.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../../inc/mail_templates.js';
import { addaudit } from '../../inc/_common.js';

const config = readConfig();

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

export async function signup(req, res) {
    const { mail, password } = req.body;

    if (config.demo === true) {
        return res.status(403).json({ error: true, msg: "Registration is disabled in demo mode." });
    }

    if (!mail || !password) {
        return res.status(400).json({ error: true, msg: "Incomplete form data provided." });
    }

    const validatedMail = validate(mail);
    const validatedPassword = validate(password);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedMail)) {
        return res.status(400).json({ error: true, msg: "Invalid email format" });
    }

    if (validatedPassword.length < 8) {
        return res.status(400).json({ error: true, msg: "Password must be at least 8 characters" });
    }

    try {
        // Check if email already exists
        const existingUser = await knex('users')
            .whereRaw('BINARY mail = ?', [validatedMail])
            .first();

        if (existingUser) {
            return res.status(409).json({ error: true, msg: "Email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(validatedPassword, 10);

        // Use transaction for data consistency
        await knex.transaction(async (trx) => {
            // Insert new user
            const [userId] = await trx('users')
                .insert({
                    mail: validatedMail,
                    password: hashedPassword
                })
                .returning('id');
                
            // Add audit log
            await addaudit(userId, 1, userId, null, null, null);

            // Generate verification code
            const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let randomCode = '';
            const length = 6;
            for (let i = 0; i < length; i++) {
                randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            const timexp = Math.floor(Date.now() / 1000) + 3600;
            const action = 1;

            // Insert verification code
            await trx('verify_codes')
                .insert({
                    userid: userId,
                    code: randomCode,
                    expire: timexp,
                    action: action
                });
                
            // Send verification and welcome emails
            await sendVerificationEmail(validatedMail, randomCode, randomCode);
            
            const logo = "";
            await sendWelcomeEmail(mail, userId, logo);
        });

        return res.status(200).json({ 
            error: false, 
            msg: "Registration successful. Please check your mail to verify.", 
            url: "/signin" 
        });
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ 
            error: true, 
            msg: "An error occurred during registration. Please try again later." 
        });
    }
}

export default signup;