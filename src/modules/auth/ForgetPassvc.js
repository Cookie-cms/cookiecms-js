import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';

const config = readConfig(process.env.CONFIG_PATH || '../config.yml');

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

async function resetPassword(req, res) {
    const { mail } = req.body;

    if (config.production = "demo") {
        return res.status(403).json({ error: true, msg: "Reset password is disabled in demo mode." });
    }

    if (!mail) {
        return res.status(400).json({ error: true, msg: 'Email not provided.' });
    }

    const validatedMail = validate(mail);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedMail)) {
        return res.status(400).json({ error: true, msg: 'Invalid email format.' });
    }

    try {
        const connection = await mysql.getConnection();

        // Check if email exists
        const [user] = await connection.query("SELECT id FROM users WHERE BINARY mail = ?", [validatedMail]);

        if (!user.length) {
            connection.release();
            return res.status(404).json({ error: true, msg: 'Email not found.' });
        }

        // Generate a new verification code
        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        const length = 6;
        for (let i = 0; i < length; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        const timexp = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour
        const action = 4;

        // Insert the new verification code
        await connection.query("INSERT INTO verify_codes (userid, code, expire, action) VALUES (?, ?, ?, ?)", [user[0].id, randomCode, timexp, action]);

        connection.release();
        return res.status(200).json({ error: false, msg: 'Code for resting password sent.' });
    } catch (err) {
        logger.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred while generating the verification code. Please try again.' });
    }
}

export default resetPassword;