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

// Функция проверки валидности UUID для PostgreSQL
function isValidUUID(str) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidPattern.test(str);
}

export async function getSkinFile(req, res) {
    try {
        const uuid = req.params.uuid;
        
        // Проверка на валидность UUID
        if (!isValidUUID(uuid)) {
            return res.status(400).send('Invalid UUID format');
        }
        
        const skin = await knex('users as u')
            .join('skin_user as su', 'u.id', '=', 'su.uid')
            .join('skins_library as sl', 'su.skin_id', '=', 'sl.uuid')
            .where('u.uuid', uuid)
            .select(
                'sl.uuid',
                'sl.slim',
                knex.raw("NULLIF(sl.cloak_id, '0') as cloak_id")
            )
            .first();

        let filePath;
        
        // Если скин найден, пробуем использовать его
        if (skin && skin.uuid) {
            filePath = path.join('uploads/skins/', `${skin.uuid}.png`);
            
            // Проверяем, существует ли файл
            if (fs.existsSync(filePath)) {
                return sendFile(res, filePath);
            } else {
                logger.warn(`Skin file not found for UUID ${skin.uuid}, using default skin`);
            }
        } else {
            logger.warn(`Skin not found in database for user UUID ${uuid}, using default skin`);
        }
        
        // Используем дефолтный скин
        const defaultSkinPath = path.join('uploads/skins/', 'default.png');
        
        // Проверяем, существует ли дефолтный скин
        if (fs.existsSync(defaultSkinPath)) {
            return sendFile(res, defaultSkinPath);
        } else {
            logger.error('Default skin file not found');
            return res.status(404).send('Default skin not found');
        }

    } catch (error) {
        logger.error('Error getting skin:', error);
        
        // В случае ошибки также пробуем вернуть дефолтный скин
        try {
            const defaultSkinPath = path.join('uploads/skins/', 'default.png');
            if (fs.existsSync(defaultSkinPath)) {
                return sendFile(res, defaultSkinPath);
            }
        } catch (fallbackError) {
            logger.error('Error sending default skin:', fallbackError);
        }
        
        res.status(500).send('Internal server error');
    }
}

export default getSkinFile;