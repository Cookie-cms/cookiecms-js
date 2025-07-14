// import { checkPermission } from '../../inc/common.js';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';
import { checkPermissionInc } from '../../inc/common.js';

import dotenv from 'dotenv';

dotenv.config();

async function getSkins(req, res) {
    try {
      
    if (!await checkPermissionInc(req, 'admin.userskins')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
            });
    }



        const skins = await knex('skins_library').select('*');

        const skins_data = skins.map(skin => ({
            uuid: skin.uuid,
            name: skin.name,
            ownerid: skin.ownerid,
            slim: skin.slim,
            hd: skin.hd,
            cloak_id: skin.cloak_id
        }));

        res.json({ error: false, data: skins_data });

    } catch (err) {
        logger.error("[ERROR] Failed to retrieve skins:", err);
        res.status(500).json({ error: true, msg: 'Failed to retrieve skins' });
    }
}

export default getSkins;