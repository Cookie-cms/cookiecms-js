import bcrypt from 'bcrypt';
import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { addaudit } from '../../inc/common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;


async function validatePassword(userId, password) {
    const user = await knex('users')
        .where({ id: userId })
        .first('password');
        
    if (!user) {
        throw new Error('User not found');
    }
    return bcrypt.compare(password, user.password);
}

async function removediscordconn(req, res) {
    const token = req.headers['authorization']?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ 
            error: true, 
            msg: 'Invalid token' 
        });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ 
                error: true, 
                msg: status.message 
            });
        }

        const userId = status.data.sub;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                error: true, 
                msg: 'Password required' 
            });
        }

        // Validate password
        if (!await validatePassword(userId, password)) {
            return res.status(401).json({ 
                error: true, 
                msg: 'Invalid password' 
            });
        }

        const user = await knex('users')
            .where({ id: userId })
            .first('dsid');
            
        const oldDiscordId = user?.dsid;
        
        // Add audit log
        await addaudit(userId, 8, userId, oldDiscordId, null, 'dsid');
        
        // Remove discord connection
        await knex('users')
            .where({ id: userId })
            .update({ dsid: null });

        res.status(200).json({ 
            error: false, 
            msg: 'Discord connection removed successfully' 
        });

    } catch (error) {
        logger.error('Error removing discord:', error);
        res.status(500).json({ 
            error: true, 
            msg: 'Internal server error' 
        });
    }
}

export default removediscordconn;