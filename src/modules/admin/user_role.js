import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission, addNewTask } from '../../inc/common.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

export async function user_role(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
        
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        if (!await checkPermission(status.data.sub, 'admin.useredit')) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { user, role_level, expired_at } = req.body;

        // Validate inputs
        if (!user || !role_level) {
            return res.status(400).json({ error: true, msg: 'User ID and role level are required' });
        }

        if (![1, 2, 3].includes(Number(role_level))) {
            return res.status(400).json({ error: true, msg: 'Invalid role level. Must be 1, 2, or 3' });
        }

        // Check if user exists
        const userExists = await knex('users')
            .where({ id: user })
            .first();

        if (!userExists) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Update user role using Knex transaction
        await knex.transaction(async (trx) => {
            // Add task
            await addNewTask('role', user, role_level, expired_at);
            
            // Update user
            await trx('users')
                .where({ id: user })
                .update({ role: role_level });
        });

        return res.json({
            error: false,
            msg: 'User role updated successfully',
            data: {
                user,
                role_level,
                expired_at: expired_at || null
            }
        });

    } catch (error) {
        logger.error('Error updating user role:', error);
        return res.status(500).json({ error: true, msg: 'Internal server error' });
    }
}

export default user_role;