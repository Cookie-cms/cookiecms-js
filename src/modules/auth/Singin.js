import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';
import { addaudit } from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

function isEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

async function login(req, res) {
    const { username, password, meta } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: true, msg: 'Username or password not provided' });
    }

    const validatedUsername = validate(username);
    const validatedPassword = validate(password);

    try {
        // Find user by email or username
        let query;
        if (isEmail(validatedUsername)) {
            query = knex('users')
                .whereRaw('BINARY mail = ?', [validatedUsername]);
        } else {
            query = knex('users')
                .whereRaw('BINARY username = ?', [validatedUsername]);
        }

        const user = await query.first();

        if (!user) {
            return res.status(403).json({ error: true, msg: 'Incorrect username or password' });
        }

        if (user.mail_verify === 0) {
            return res.status(403).json({ error: true, msg: 'Please verify your mail' });
        }

        const passwordMatch = await bcrypt.compare(validatedPassword, user.password);

        if (passwordMatch) {
            if (meta) {
                if (!meta.id || !meta.conn_id) {
                    return res.status(400).json({ error: true, msg: 'id or conn_id not provided' });
                }

                // Verify if this game account is not already connected to another Discord account
                const discordCheck = await knex('users')
                    .select('dsid')
                    .where('id', user.id)
                    .first();

                if (discordCheck && discordCheck.dsid && discordCheck.dsid !== meta.id) {
                    logger.info('Discord:', discordCheck.dsid, 'Meta:', meta.id);
                    return res.status(403).json({ error: true, msg: 'This game account is already linked to another Discord account' });
                }

                // Check if the conn_id matches
                const discordLink = await knex('discord')
                    .where('userid', meta.id)
                    .first();

                if (!discordLink || discordLink.conn_id !== meta.conn_id) {
                    logger.info('Discord:', discordLink?.conn_id, 'Meta:', meta.conn_id, 'Discord:', discordLink);
                    return res.status(404).json({ error: true, msg: 'Account cannot be connected' });
                }

                // Use transaction for data consistency
                await knex.transaction(async (trx) => {
                    // Add audit log
                    await addaudit(user.id, 12, user.id, null, meta.id, 'dsid');
                    
                    // Update user's Discord connection
                    await trx('users')
                        .where('id', user.id)
                        .update({ dsid: meta.id });
                });
            }
    
            try {
                const userId = user.id;
                const token = generateJwtToken(userId, JWT_SECRET_KEY);

                return res.status(200).json({
                    error: false,
                    msg: 'Login successful',
                    url: '/home',
                    data: { jwt: token }
                });
            } catch (err) {
                logger.error("[ERROR] JWT Error: ", err);
                return res.status(500).json({ error: true, msg: 'JWT Error' });
            }
        } else {
            return res.status(400).json({ error: true, msg: 'Incorrect username or password' });
        }
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'Database Error' });
    }
}

export default login;