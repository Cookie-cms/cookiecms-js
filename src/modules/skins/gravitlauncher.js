import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

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
        console.error(`Error generating hash for file ${filePath}:`, error);
        return null;
    }
}

async function getSkinData(userUuid) {
    if (!isValidUUID(userUuid)) {
        throw new Error('Invalid UUID format');
    }

    let connection;
    try {
        connection = await mysql.getConnection();
        
        const [selectedSkin] = await connection.execute(`
            SELECT 
                sl.uuid,
                sl.slim,
                NULLIF(sl.cloak_id, '0') as cloak_id
            FROM users u
            JOIN skin_user su ON u.id = su.uid
            JOIN skins_library sl ON su.skin_id = sl.uuid
            WHERE u.uuid = ?
        `, [userUuid]);

        if (!selectedSkin.length || !selectedSkin[0].uuid) {
            return null;
        }

        const skinPath = path.join('uploads/skins/', `${selectedSkin[0].uuid}.png`);
        const skinHash = await generateFileHash(skinPath);
        
        if (!skinHash) {
            return null;
        }

        const response = {
            SKIN: {
                url: `${config.domain}/skins/${selectedSkin[0].uuid}.png`,
                digest: skinHash
            }
        };

        if (selectedSkin[0].slim) {
            response.SKIN.metadata = { model: 'slim' };
        }
        
        if (selectedSkin[0].cloak_id) {
            const cloakPath = path.join('uploads/capes/', `${selectedSkin[0].cloak_id}.png`);
            const cloakHash = await generateFileHash(cloakPath);
            if (cloakHash) {
                response.CAPE = {
                    url: `${config.domain}/cloaks/${selectedSkin[0].cloak_id}.png`,
                    digest: cloakHash
                };
            }
        }

        return response;
    } catch (error) {
        console.error('Error getting skin data:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
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