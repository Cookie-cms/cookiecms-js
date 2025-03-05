import mysql from '../../inc/mysql.js';

async function UsersList(req, res) {
    const connection = await mysql.getConnection();
    try {
        const [users] = await connection.query(`
            SELECT 
                u.username,
                u.dsid as discordid,
                COALESCE(d.avatar, '') as discordcache,
                u.id as uuid
            FROM users u
            LEFT JOIN discord_avatar_cache d ON u.dsid = d.dsid
        `);

        return res.json({
            error: false,
            users: users.map(user => ({
                username: user.username,
                discordid: user.discordid || "",
                discordcache: user.discordcache,
                uuid: user.uuid
            }))
        });
    } catch (err) {
        logger.error("[ERROR] Failed to get users list:", err);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to get users list' 
        });
    } finally {
        connection.release();
    }
}

export default UsersList;