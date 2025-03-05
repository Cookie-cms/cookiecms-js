import path from 'path';
import fs from 'fs';
import mysql from '../../inc/mysql.js';

async function sendFile(res, filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found');
        }
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        logger.error('Error sending file:', error);
        res.status(500).send('Internal server error');
    }
}

export async function getSkinFile(req, res) {
    let connection;
    try {
        connection = await mysql.getConnection();
        
        const [skin] = await connection.execute(`
            SELECT 
                sl.uuid,
                sl.slim,
                NULLIF(sl.cloak_id, '0') as cloak_id
            FROM users u
            JOIN skin_user su ON u.id = su.uid
            JOIN skins_library sl ON su.skin_id = sl.uuid
            WHERE u.uuid = ?
        `, [req.params.uuid]);

        if (!skin.length || !skin[0].uuid) {
            return res.status(404).send('Skin not found');
        }

        const filePath = path.join('uploads/skins/', `${skin[0].uuid}.png`);
        return sendFile(res, filePath);

    } catch (error) {
        logger.error('Error getting skin:', error);
        res.status(500).send('Internal server error');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

export default getSkinFile;

