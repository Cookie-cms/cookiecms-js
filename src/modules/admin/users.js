import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import {checkPermission} from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;


async function users(req, res) {
    const connection = await mysql.getConnection();
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
    
        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const hasPermission = await checkPermission(connection, status.data.sub, 'admin.users');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const [audit] = await connection.query("SELECT * FROM users");

        res.json({ error: false, data: audit });

    } catch (err) {
        logger.error("[ERROR] Failed to get audit logs:", err);
        res.status(500).json({ error: true, msg: 'Failed to get audit logs' });
    } finally {
        connection.release();
    }
}

export default users;
