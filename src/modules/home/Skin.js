import fs from 'fs/promises';
import path from 'path';
import knex from '../../inc/knex.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function removeSkin(userId, skinId) {
    // Check if skin exists and is owned by user
    const skin = await knex('skins_library')
        .where({
            uuid: skinId,
            ownerid: userId
        })
        .first();
        
    if (!skin) {
        throw new Error('Skin not found or not owned by user');
    }
    
    // Use transaction for data consistency
    await knex.transaction(async (trx) => {
        // Remove skin selection if it's the selected skin
        await trx('skin_user')
            .where({
                uid: userId,
                skin_id: skinId
            })
            .delete();
            
        // Delete the skin
        await trx('skins_library')
            .where({
                uuid: skinId,
                ownerid: userId
            })
            .delete();
    });
    
    // Delete the skin file if it exists
    const skinPath = path.join('uploads/skins', `${skinId}.png`);
    try {
        await fs.access(skinPath);
        await fs.unlink(skinPath);
    } catch (error) {
        // File doesn't exist or cannot be deleted
        logger.warn(`Could not delete skin file: ${error.message}`);
    }
}

async function isownercape(userId, capeId) {
    const cape = await knex('cloaks_users')
        .where({
            uid: userId,
            cloak_id: capeId
        })
        .first();
        
    return !cape;
}

async function selectskin(userId, skinId) {
    const existingSkin = await knex('skin_user')
        .where('uid', userId)
        .first();

    if (existingSkin) {
        await knex('skin_user')
            .where('uid', userId)
            .update({ skin_id: skinId });
    } else {
        await knex('skin_user')
            .insert({
                uid: userId,
                skin_id: skinId
            });
    }
}

async function editSkin(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message });
        }

        const userId = status.data.sub;
        const { skinid, name = null, slim = null, cloakid = null } = req.body;

        if (req.method === 'PUT') {
            const existingSkin = await knex('skins_library')
                .where({
                    uuid: skinid,
                    ownerid: userId
                })
                .first();

            if (!existingSkin) {
                return res.status(404).json({ error: true, msg: 'Skin not found' });
            }

            if (cloakid && await isownercape(userId, cloakid)) {
                logger.info(cloakid);
                logger.info(await isownercape(userId, cloakid));
                return res.status(403).json({ error: true, msg: 'You do not own this cape' });
            }

            // Build update object
            const updateData = {};
            if (name !== null) updateData.name = name;
            if (slim !== null) updateData.slim = slim;
            if (cloakid !== null) updateData.cloak_id = cloakid;
            
            if (Object.keys(updateData).length > 0) {
                await knex('skins_library')
                    .where({
                        uuid: skinid,
                        ownerid: userId
                    })
                    .update(updateData);
            }
            
            return res.status(200).json({ error: false, msg: 'Skin updated successfully' });
            
        } else if (req.method === 'DELETE') {
            await removeSkin(userId, skinid);
            return res.status(200).json({ error: false, msg: 'Skin deleted successfully' });
            
        } else if (req.method === 'POST') {
            await selectskin(userId, skinid);
            return res.status(200).json({ error: false, msg: 'Skin updated successfully' });
            
        } else {
            return res.status(400).json({ error: true, msg: 'Invalid request method' });
        }

    } catch (err) {
        logger.error("[ERROR] Database Error: ", err);
        return res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export default editSkin;