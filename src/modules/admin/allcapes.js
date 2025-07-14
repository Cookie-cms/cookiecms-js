import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { checkPermissionInc } from '../../inc/common.js';

export async function allcapes(req, res) {
    try {
        // Using Knex to query the database

        if (!await checkPermissionInc(req, 'admin.capes')) {
            // разрешено
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
                code: 403
            });
        }

        const capes = await knex('cloaks_lib').select('*');
        
        res.json({ data: capes });
    } catch (error) {
        logger.error('Error getting capes:', error);
        res.status(500).json({ 
            error: true, 
            msg: 'Internal server error', 
            code: 500 
        });
    }
}

export default allcapes;