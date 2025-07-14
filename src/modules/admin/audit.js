import knex from '../../inc/knex.js';
import { checkPermissionInc } from '../../inc/common.js';
import logger from '../../logger.js';




async function audit(req, res) {
    try {
        if (!await checkPermissionInc(req, 'admin.audit')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
                code: 403
            });
        }

        // const hasPermission = await checkPermission(status.data.sub, 'admin.audit');
        // if (!hasPermission) {
        //     return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        // }

        const audit = await knex('audit_log')
            .orderBy('time', 'desc')
            .select('*');

        res.json({ error: false, data: audit });

    } catch (err) {
        logger.error("[ERROR] Failed to get audit logs:", err);
        res.status(500).json({ error: true, msg: 'Failed to get audit logs' });
    }
}

export default audit;