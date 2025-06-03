import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission } from '../../inc/common.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function users(req, res) {
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const hasPermission = await checkPermission(status.data.sub, 'admin.users');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const users = await knex('users').select('*');

        res.json({ error: false, data: users });

    } catch (err) {
        logger.error("[ERROR] Failed to get users:", err);
        res.status(500).json({ error: true, msg: 'Failed to get users' });
    }
}

export default users;