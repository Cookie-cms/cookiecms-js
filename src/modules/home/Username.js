import knex from '../../inc/knex.js';
import bcrypt from 'bcrypt';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import logger from '../../logger.js';
import { addaudit } from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function validatePassword(userId, password) {
    const user = await knex('users')
        .where('id', userId)
        .first('password');
        
    if (!user) return false;
    
    return bcrypt.compare(password, user.password);
}

async function updateUsername(userId, newUsername, currentPassword) {
    if (!await validatePassword(userId, currentPassword)) {
        throw new Error('Invalid password');
    }

    const existingUser = await knex('users')
        .where('username', newUsername)
        .whereNot('id', userId)
        .first();
        
    if (existingUser) {
        throw new Error('Username is already taken by another user');
    }

    await knex('users')
        .where('id', userId)
        .update({ username: newUsername });

    return newUsername;
}

async function username(req, res) {
    const token = req.headers['authorization']?.replace('Bearer ', '') || '';
    
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const userId = status.data.sub;
        const { username, password } = req.body;

        if (username && password) {
            // Get the old username for audit log
            const user = await knex('users')
                .where('id', userId)
                .first('username');
                
            const oldUsername = user?.username;
            
            // Use transaction for data consistency
            await knex.transaction(async (trx) => {
                // Add audit log
                await addaudit(userId, 5, userId, oldUsername, username, 'username');
                
                // Update username
                await updateUsername(userId, username, password);
            });
            
            return res.status(200).json({ 
                error: false, 
                msg: 'Username updated successfully', 
                username: username 
            });
        } else {
            return res.status(400).json({ 
                error: true, 
                msg: 'Missing required fields for updating username' 
            });
        }

    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ 
            error: true, 
            msg: 'Internal Server Error: ' + err.message 
        });
    }
}

export default username;