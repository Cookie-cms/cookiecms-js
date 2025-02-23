import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

async function checkPermission(connection, userId) {
    if (!userId) return false; // Проверка на случай, если userId отсутствует

    const [userPerms] = await connection.query(
        "SELECT permlvl FROM users WHERE id = ?", 
        [userId]
    );

    if (!userPerms.length) return false;

    const permLevel = userPerms[0].permlvl;
    const permissions = config.permissions[permLevel] || [];

    return permissions.includes('admin.audit');
}

async function audit(req, res) {
    const connection = await mysql.getConnection();
    try {
        // Проверка прав
        const hasPermission = await checkPermission(connection, req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        // Запрос всех записей из `audit_log`
        const [audit] = await connection.query("SELECT * FROM audit_log ORDER BY time DESC");

        // Отправляем данные клиенту
        res.json({ error: false, data: audit });

    } catch (err) {
        console.error("[ERROR] Failed to get audit logs:", err);
        res.status(500).json({ error: true, msg: 'Failed to get audit logs' });
    } finally {
        connection.release();
    }
}

export default audit;
