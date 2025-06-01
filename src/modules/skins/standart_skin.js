import path from 'path';
import fs from 'fs';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';

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
    try {
        const skin = await knex('users as u')
            .join('skin_user as su', 'u.id', '=', 'su.uid')
            .join('skins_library as sl', 'su.skin_id', '=', 'sl.uuid')
            .where('u.uuid', req.params.uuid)
            .select(
                'sl.uuid',
                'sl.slim',
                knex.raw('NULLIF(sl.cloak_id, \'0\') as cloak_id')
            )
            .first();

        if (!skin || !skin.uuid) {
            return res.status(404).send('Skin not found');
        }

        const filePath = path.join('uploads/skins/', `${skin.uuid}.png`);
        return sendFile(res, filePath);

    } catch (error) {
        logger.error('Error getting skin:', error);
        res.status(500).send('Internal server error');
    }
}

export default getSkinFile;