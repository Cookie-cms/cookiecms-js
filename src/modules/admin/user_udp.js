import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission } from '../../inc/common.js';
import logger from '../../logger.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.securecode;

export async function user_udp(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }
    
    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }
    
        if (!await checkPermission(status.data.sub, 'admin.useredit')) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;
        const updateData = req.body;

        // Validate id
        if (!id) {
            return res.status(400).json({ error: true, msg: 'User id is required' });
        }

        // Define allowed fields for update
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

        // Filter update data to only include allowed fields
        const filteredUpdateData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                filteredUpdateData[key] = value;
            }
        }

        if (Object.keys(filteredUpdateData).length === 0) {
            return res.status(400).json({ error: true, msg: 'No valid fields to update' });
        }

        // Update user with Knex
        const rowsUpdated = await knex('users')
            .where({ id: id })
            .orWhere({ username: id })
            .update(filteredUpdateData);

        if (rowsUpdated === 0) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        return res.json({
            error: false,
            msg: 'User updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        return res.status(500).json({ error: true, msg: 'Internal server error' });
    }
}

export default user_udp;