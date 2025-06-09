import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission } from '../../inc/common.js';
import logger from '../../logger.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

async function audit(req, res) {
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const hasPermission = await checkPermission(status.data.sub, 'admin.audit');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

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