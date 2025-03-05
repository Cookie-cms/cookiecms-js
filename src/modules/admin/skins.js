import {checkPermission} from '../../inc/_common.js';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function getSkins(req, res) {
    const connection = await mysql.getConnection();
    try {
        const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
        if (!token) {
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
    
        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }


        // Delete owners first (foreign key constraint)
        const [skins] = await connection.query(
            "SELECT * FROM skins_library"
        );

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
        logger.error("[ERROR] Cape deletion failed:", err);
        res.status(500).json({ error: true, msg: 'Deletion failed' });
    } finally {
        connection.release();
    }
}

export default getSkins;