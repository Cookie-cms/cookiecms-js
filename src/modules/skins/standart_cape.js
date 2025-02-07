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
        console.error('Error sending file:', error);
        res.status(500).send('Internal server error');
    }
}

export async function getCloakFile(req, res) {
    let connection;
    try {
        connection = await mysql.getConnection();
        
        const [skin] = await connection.execute(`
            SELECT 
                NULLIF(sl.cloak_id, '0') as cloak_id
            FROM users u
            JOIN skin_user su ON u.id = su.uid
            JOIN skins_library sl ON su.skin_id = sl.uuid
            WHERE u.uuid = ?
        `, [req.params.uuid]);

        console.log(skin);

        if (!skin.length || !skin[0].cloak_id || skin[0].cloak_id === 'null') {
            return res.status(404).send('Cloak not found');
        }

        const filePath = path.join('uploads', `${skin[0].cloak_id}.png`);
        return sendFile(res, filePath);

    } catch (error) {
        console.error('Error getting cloak:', error);
        res.status(500).send('Internal server error');
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

export default getCloakFile;
