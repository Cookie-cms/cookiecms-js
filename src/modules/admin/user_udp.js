import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import {checkPermission} from '../../inc/_common.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

export async function user_udp(req, res) {
    const connection = await mysql.getConnection();
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }
    const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

    if (!status.valid) {
        connection.release();
        return res.status(401).json({ error: true, msg: status.message, code: 401 });
    }
    try {
    
        if (!await checkPermission(connection, status.data.sub, 'admin.useredit')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const { id } = req.params;
        const updateData = req.body;

        // Validate id
        if (!id) {
            return res.status(400).json({ error: 'User id is required' });
        }

        // Build dynamic update query
        const allowedFields = [
            'username',
            'mail',
            'mail_verify',
            'selected_skin',
            'password',
            'perms',
            'dsid',
            'mail_verification'
        ];

        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Add id to values array
        values.push(id);

        const query = `
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = ? OR username = ?
        `;

        const [result] = await mysql.execute(query, [...values, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default user_udp;