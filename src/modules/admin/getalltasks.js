import { checkPermission } from '../../inc/common.js';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';



async function GetAllTasks(req, res) {
    try {
        

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