import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission,addNewTask } from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

export async function user_role(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    let connection;
    try {
        connection = await mysql.getConnection();
        
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
        
        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        if (!await checkPermission(connection, status.data.sub, 'admin.useredit')) {
            connection.release();
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { user, role_level, expired_at } = req.body;

        // Validate inputs
        if (!user || !role_level) {
            connection.release();
            return res.status(400).json({ error: 'User ID and role level are required' });
        }

        if (![1, 2, 3].includes(Number(role_level))) {
            connection.release();
            return res.status(400).json({ error: 'Invalid role level. Must be 1, 2, or 3' });
        }

        // Check if user exists
        const [userExists] = await connection.execute(
            'SELECT id FROM users WHERE id = ?',
            [user]
        );

        if (userExists.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user role
        addNewTask(connection, user, 'role', role_level, expired_at);

        const query = "UPDATE users SET role = ? WHERE id = ?";
        const values = [role_level, user];

        const [result] = await connection.execute(query, values);

        connection.release();

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to update user role' });
        }

        return res.json({
            success: true,
            message: 'User role updated successfully',
            data: {
                user,
                role_level,
                expired_at: expired_at || null
            }
        });

    } catch (error) {
        if (connection) connection.release();
        logger.error('Error updating user role:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default user_role;