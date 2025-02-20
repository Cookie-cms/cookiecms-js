import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

async function checkPermission(connection, userId) {
    const [userPerms] = await connection.query(
        "SELECT permlvl FROM users WHERE id = ?", 
        [userId]
    );
    
    if (!userPerms.length) return false;
    
    const permLevel = userPerms[0].permlvl;
    const permissions = config.permissions[permLevel] || [];
    
    return permissions.includes('admin.userskins');
}

async function getUserSkins(req, res) {
    const connection = await mysql.getConnection();
    try {
        // Check permissions
        const hasPermission = await checkPermission(connection, req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { ownerid } = req.params;

        // Get skins for user
        const [skins] = await connection.query(
            "SELECT uuid, name FROM skins_library WHERE ownerid = ?",
            [ownerid]
        );

        res.json({
            error: false,
            skins: skins
        });

    } catch (err) {
        console.error("[ERROR] Failed to get user skins:", err);
        res.status(500).json({ error: true, msg: 'Failed to get skins' });
    } finally {
        connection.release();
    }
}

export { getUserSkins };