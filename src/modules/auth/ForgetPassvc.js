import knex from '../../inc/knex.js';
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

    if (config.production === "demo") {
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
        // Check if email exists
        const user = await knex('users')
            .where(knex.raw('BINARY mail = ?', [validatedMail]))
            .first('id');

        if (!user) {
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
        await knex('verify_codes').insert({
            userid: user.id,
            code: randomCode,
            expire: timexp,
            action: action
        });

        return res.status(200).json({ error: false, msg: 'Code for resetting password sent.' });
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred while generating the verification code. Please try again.' });
    }
}

export default resetPassword;