import pool from '../../inc/mysql.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import {isJwtExpiredOrBlacklisted} from '../../inc/jwtHelper.js';
import { sendVerificationEmail, sendMailUnlinkNotification } from '../../inc/mail_templates.js';
import jwt from 'jsonwebtoken';
import { addaudit } from '../../inc/_common.js';


const config = readConfig();


const JWT_SECRET_KEY = config.securecode;

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

async function validatePassword(connection, userId, password) {
    const [user] = await connection.query("SELECT password FROM users WHERE id = ?", [userId]);
    return bcrypt.compare(password, user[0].password);
}

export async function changemail(req, res) {
    const connection = await pool.getConnection();
    
    try {
        const { mail, password } = req.body;
        logger.info(mail);
        logger.info(password);
        const token = req.headers.authorization?.split(' ')[1];

        if (!mail || !password || !token) {
            return res.status(400).json({ error: true, msg: "Incomplete form data provided." });
        }

        if (config.demo === true) {
            return res.status(403).json({ error: true, msg: "Registration is disabled in demo mode." });
        }

        // Verify token and get user ID
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        const userId = status.data.sub;
        // logger.info(password);  

        const validatedMail = validate(mail);
        
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedMail)) {
            return res.status(400).json({ error: true, msg: "Invalid email format" });
        }

        // Check if password is correct
        if (!await validatePassword(connection, userId, password)) {
            return res.status(401).json({ error: true, msg: "Invalid password" });
        }

        // Check if email already exists
        const [existingUser] = await connection.query(
            "SELECT * FROM users WHERE BINARY mail = ? AND id != ?", 
            [validatedMail, userId]
        );

        if (existingUser.length > 0) {
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

        const [old_mail_result] = await connection.query(
            "SELECT mail FROM users WHERE id = ?",
            [userId]
        );

        addaudit(connection, userId, 7, userId, old_mail_result[0].mail, validatedMail, 'mail');

        await connection.query(
            "INSERT INTO verify_codes (userid, code, expire, action) VALUES (?, ?, ?, ?)",
            [userId, randomCode, timexp, action]
        );

        await connection.query(
            "UPDATE users SET mail = ? WHERE id = ?",
            [validatedMail, userId]
        );

        // Send verification email
        await sendVerificationEmail(validatedMail, randomCode, randomCode);
        try {
            logger.info(old_mail_result[0].mail)
            await sendMailUnlinkNotification(old_mail_result[0].mail);
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
    } finally {
        connection.release();
    }
}

export default changemail;