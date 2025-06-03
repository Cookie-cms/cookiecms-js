import { checkPermission } from '../../inc/common.js';
import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function GetAllTasks(req, res) {
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const hasPermission = await checkPermission(status.data.sub, 'admin.tasks');

        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const tasks = await knex('job_schedule').select('*');

        res.json({ error: false, data: tasks });
    } catch (err) {
        logger.error("[ERROR] Failed to get tasks:", err);
        res.status(500).json({ error: true, msg: 'Failed to get tasks' });
    }
}

export default GetAllTasks;