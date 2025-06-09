import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import knex from '../../inc/knex.js';
import dotenv from 'dotenv';
import logger from '../../logger.js';

dotenv.config();

const domain = process.env.DOMAIN;

function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function generateFileHash(filePath) {
    try {
        await fs.access(filePath);
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
        logger.error(`Error generating hash for file ${filePath}:`, error);
        return null;
    }
}

export async function getSkinData(userUuid) {
    if (!isValidUUID(userUuid)) {
        throw new Error('Invalid UUID format');
    }

    try {
        const selectedSkin = await knex('users as u')
            .join('skin_user as su', 'u.id', '=', 'su.uid')
            .join('skins_library as sl', 'su.skin_id', '=', 'sl.uuid')
            .where('u.uuid', userUuid)
            .select(
                'sl.uuid',
                'sl.slim',
                knex.raw('NULLIF(sl.cloak_id, \'0\') as cloak_id')
            )
            .first();

        if (!selectedSkin || !selectedSkin.uuid) {
            return null;
        }

        const skinPath = path.join('uploads/skins/', `${selectedSkin.uuid}.png`);
        const skinHash = await generateFileHash(skinPath);
        
        if (!skinHash) {
            return null;
        }

        const response = {
            SKIN: {
                url: `${domain}/skins/${selectedSkin.uuid}.png`,
                digest: skinHash
            }
        };

        if (selectedSkin.slim) {
            response.SKIN.metadata = { model: 'slim' };
        }
        
        if (selectedSkin.cloak_id) {
            const cloakPath = path.join('uploads/capes/', `${selectedSkin.cloak_id}.png`);
            const cloakHash = await generateFileHash(cloakPath);
            if (cloakHash) {
                response.CAPE = {
                    url: `${domain}/cloaks/${selectedSkin.cloak_id}.png`,
                    digest: cloakHash
                };
            }
        }

        return response;
    } catch (error) {
        logger.error('Error getting skin data:', error);
        throw error;
    }
}

export async function gravitLauncherResponse(req, res) {
    try {
        const skinData = await getSkinData(req.params.uuid);
        if (!skinData) {
            return res.status(404).json({ error: 'Skin not found' });
        }
        res.json(skinData);
    } catch (error) {
        if (error.message === 'Invalid UUID format') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}



export default gravitLauncherResponse;