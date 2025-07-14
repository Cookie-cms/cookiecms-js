import knex from '../../inc/knex.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import logger from '../../logger.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../../inc/mail_templates.js';
import { addaudit } from '../../inc/common.js';
import { validateData } from '../../middleware/validation.js';
import dotenv from 'dotenv';

dotenv.config();

export async function signup(req, res) {
    // if (process.env.ENV === "demo") {
    //     return res.status(403).json({ error: true, msg: "Registration is disabled in demo mode." });
    // }

    // Валидация входных данных
    const validation = validateData(req.body, 'signup');
    if (!validation.isValid) {
        // Более конкретные сообщения для конкретных ошибок
        let errorMsg = 'Validation failed';
        if (validation.errors && validation.errors.length > 0) {
            if (validation.errors[0].field === 'mail' && validation.errors[0].message.includes('valid')) {
                errorMsg = "Invalid email format";
            } else if (validation.errors[0].field === 'password' && validation.errors[0].message.includes('length')) {
                errorMsg = "Password must be at least 8 characters long";
            }
        }
        
        return res.status(400).json({
            error: true,
            msg: errorMsg,
            details: validation.errors
        });
    }

    const { mail, password } = validation.value;

    try {
        // Check if email already exists
        const existingUser = await knex('users')
            .whereRaw('LOWER(mail) = LOWER(?)', [mail])
            .first();

        if (existingUser) {
            return res.status(409).json({ error: true, msg: "Email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Use transaction for data consistency
        await knex.transaction(async (trx) => {
            // Insert new user
            const [userId] = await trx('users')
                .insert({
                    mail: mail,
                    password: hashedPassword
                })
                .returning('id')
                .then(rows => rows.map(row => row.id || row));
                
            // Add audit log
            // console.log(userId, 1, userId, null, null, null);

            // Generate verification code
            let randomCode = '';
            if (process.env.ENV === "prod") {
                const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const length = 6;
                for (let i = 0; i < length; i++) {
                    randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
                }
            } else {
                randomCode = "CODE123";
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
            
            await trx.commit();
            // Send verification and welcome emails
            // await sendVerificationEmail(validatedMail, randomCode, randomCode);
            
            const logo = "";
            if (process.env.ENV === "prod") {
                await sendWelcomeEmail(mail, userId, logo);
            }

        });

        return res.status(200).json({ 
            error: false, 
            msg: "Registration successful. Please check your mail to verify.", 
            url: "/signin" 
        });
    } catch (err) {
        console.log("[ERROR] Database Error: ", err);
        return res.status(500).json({ 
            error: true, 
            msg: "An error occurred during registration. Please try again later." 
        });
    }
}

export default signup;