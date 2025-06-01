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

async function updatePassword(userId, currentPassword, newPassword) {
    // Validate current password
    if (!await validatePassword(userId, currentPassword)) {
        throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and add audit
    await knex.transaction(async (trx) => {
        await trx('users')
            .where('id', userId)
            .update({ password: hashedPassword });
            
        await addaudit(userId, 6, userId, null, '[REDACTED]', 'password');
    });

    return true;
}

async function editPassword(req, res) {
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
        const { currentPassword, newPassword } = req.body;

        if (currentPassword && newPassword) {
            await updatePassword(userId, currentPassword, newPassword);
            res.status(200).json({ error: false, msg: 'Password updated successfully' });
        } else {
            res.status(400).json({ error: true, msg: 'Missing required fields for changing password' });
        }
    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export default editPassword;