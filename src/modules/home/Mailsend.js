import pool from '../../inc/mysql.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
// import sendEmbed from '../../inc/_common.js';
import { sendVerificationEmail, sendMailUnlinkNotification } from '../../inc/mail_templates.js';


const config = readConfig();

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

export async function validatePassword(connection, userId, password) {
    const [user] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user.length) {
        throw new Error('User not found');
    }
    return bcrypt.compare(password, user[0].password);
}

export async function changemail(req, res) {
    const connection = await pool.getConnection();
    
    try {
        const { mail, password } = req.body;
        const token = req.headers.authorization?.split(' ')[1];

        if (!mail || !password || !token) {
            return res.status(400).json({ error: true, msg: "Incomplete form data provided." });
        }

        // Verify token and get user ID
        const status = jwt.verify(token, config.jwt.secret);
        const userId = status.data.sub;

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

        const old_mail = await connection.query(
            "SELECT mail FROM users WHERE id = ?",
            [userId]
        );

        await connection.query(
            "INSERT INTO verify_codes (userid, code, expire, action, newmail) VALUES (?, ?, ?, ?, ?)",
            [userId, randomCode, timexp, action, validatedMail]
        );

        // Send verification email
        await sendVerificationEmail(validatedMail, randomCode, randomCode);
        await sendMailUnlinkNotification(old_mail);
        return res.status(200).json({ 
            error: false, 
            msg: "Verification email sent to new address" 
        });

    } catch (error) {
        console.error("[ERROR] Change mail error:", error);
        return res.status(500).json({ 
            error: true, 
            msg: "An error occurred while changing email" 
        });
    } finally {
        connection.release();
    }
}

export default changemail;