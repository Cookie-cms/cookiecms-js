import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermissionInc } from '../../inc/common.js';
import logger from '../../logger.js';



async function users(req, res) {
    try {
    
        console.log(req.user.permissions)

        if (!await checkPermissionInc(req, 'admin.users')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
            });
        }

        const users = await knex('users').select('*');

        res.json({ error: false, data: users });

    } catch (err) {
        logger.error("[ERROR] Failed to get users:", err);
        res.status(500).json({ error: true, msg: 'Failed to get users' });
    }
}

export default users;