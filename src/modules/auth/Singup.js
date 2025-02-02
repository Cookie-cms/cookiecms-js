import pool from '../../inc/mysql.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

export async function signup(req, res) {
    const { mail, password } = req.body;

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
        const connection = await pool.getConnection();

        const [existingUser] = await connection.query("SELECT * FROM users WHERE BINARY mail = ?", [validatedMail]);

        if (existingUser.length > 0) {
            connection.release();
            return res.status(409).json({ error: true, msg: "Email is already registered." });
        }

        const userID = Math.floor(Math.random() * (999999999999999999 - 1 + 1)) + 1;
        const hashedPassword = await bcrypt.hash(validatedPassword, 10);

        await connection.query("INSERT INTO users (id, mail, password) VALUES (?, ?, ?)", [userID, validatedMail, hashedPassword]);

        // if (config.AuditSecret.enabled) {
        //      // Prepare the payload
        //     const payload = {
        //         description: `mail ${mail}\ntime ${new Date().toISOString()}`,
        //         color: '#00b0f4',
        //         footer: {
        //             text: 'Cookiecms',
        //             icon_url: 'https://avatars.githubusercontent.com/u/152858724?s=200&v=4'
        //         }
        //     };

        //     // const response = await axios.post('https://discord.com/api/webhooks/1335629021349806080/LgTW8ar3URK41OTcMIsnsxSs3cTVeKZPtOu0x4xm138az2J4guy_VuBjwlmR4pVG2FWA', payload);


        //     const auditUrl = `${config.AuditSecret.url}?thread_id=${config.discord.thread_id}&spamming=${config.discord.spamming}`;
        //     await axios.post(auditUrl, payload);
        // }

        const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let randomCode = '';
        const length = 6;
        for (let i = 0; i < length; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const timexp = Math.floor(Date.now() / 1000) + 3600;
        const action = 1;

        await connection.query("INSERT INTO verify_codes (userid, code, expire, action) VALUES (?, ?, ?, ?)", [userID, randomCode, timexp, action]);

        connection.release();
        return res.status(200).json({ error: false, msg: "Registration successful. Please check your mail to verify.", url: "/signin" });
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: "An error occurred during registration. Please try again later." });
    }
}

export default signup;