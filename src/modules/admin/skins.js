import { checkPermission } from '../../inc/common.js';
import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import logger from '../../logger.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

async function getSkins(req, res) {
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);
    
        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
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