import fs from 'fs';
import path from 'path';
import mysql from '../../inc/mysql.js';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function isJwtExpiredOrBlacklisted(token, connection, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        const [blacklistedToken] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
        if (blacklistedToken.length > 0) {
            return { valid: false, message: 'Token is blacklisted' };
        }
        return { valid: true, data: decoded };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { valid: false, message: 'Token has expired' };
        } else if (err.name === 'JsonWebTokenError') {
            return { valid: false, message: 'Invalid token' };
        }
        return { valid: false, message: 'JWT verification failed' };
    }
}

async function removeSkin(connection, userId, skinId) {
    const [skinData] = await connection.query("SELECT name FROM skins_library WHERE ownerid = ? AND uuid = ?", [userId, skinId]);

    if (!skinData.length) {
        throw new Error('Skin not found.');
    }

    const skinFileName = skinData[0].name;
    const targetDir = path.join('../../skins/');
    const skinFilePath = path.join(targetDir, skinFileName);

    await connection.query("DELETE FROM skins_library WHERE ownerid = ? AND uuid = ?", [userId, skinId]);

    if (fs.existsSync(skinFilePath)) {
        fs.unlinkSync(skinFilePath);
    }
}

async function isownercape(connection, userId, capeId) {
    const [cape] = await connection.query("SELECT uid FROM cloaks_users WHERE cloak_id = ?", [capeId]);

    return cape[0].ownerid === userId;
}

async function selectskin(connection, userId, skinId) {
    const [existingSkin] = await connection.query("SELECT * FROM skin_user WHERE uid = ?", [userId]);

    if (existingSkin.length > 0) {
        await connection.query('UPDATE skin_user SET skin_id = ? WHERE uid = ?', [skinId, userId]);
    } else {
        await connection.query(
          'INSERT INTO skin_user (uid, skin_id) VALUES (?, ?)',
          [userId, skinId]
        );
    }
}


async function editSkin(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message });
        }

        const userId = status.data.sub;
        const { skinid, name = null, slim = null, cloakid = null } = req.body;

        if (req.method === 'PUT') {
            const [existingSkin] = await connection.query("SELECT uuid FROM skins_library WHERE uuid = ? AND ownerid = ?", [skinid, userId]);

            if (!existingSkin.length) {
                res.status(404).json({ error: true, msg: 'Cape not found' });
                return;
            }

            if (cloakid && await isownercape(connection, userId, cloakid)) {
                console.log(cloakid)
                console.log(await isownercape(connection, userId, cloakid))
                res.status(403).json({ error: true, msg: 'You do not own this cape' });
                return;
            }

            let updateFields = [];
            let params = [];
            if (name !== null) {
                updateFields.push("name = ?");
                params.push(name);
            }
            if (slim !== null) {
                updateFields.push("slim = ?");
                params.push(slim);
            }
            if (cloakid !== null) {
                updateFields.push("cloak_id = ?");
                params.push(cloakid);
            }
            if (updateFields.length > 0) {
                params.push(skinid, userId);
                await connection.query(
                    `UPDATE skins_library SET ${updateFields.join(", ")} WHERE uuid = ? AND ownerid = ?`,
                    params
                );
            }



            
            // Handle skin upload/update logic here
            // For example, you can save the skin details to the database
            // await connection.query("INSERT INTO skin_lib (uid, id, name, slim, cloakid) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, slim = ?, cloakid = ?", [userId, skinid, name, slim, cloakid, name, slim, cloakid]);
            res.status(200).json({ error: false, msg: 'Skin updated successfully' });
        } else if (req.method === 'DELETE') {
            await removeSkin(connection, userId, skinid);
            res.status(200).json({ error: false, msg: 'Skin deleted successfully' });
        } else if (req.method === 'POST') {
            await selectskin(connection, userId, skinid);
            res.status(200).json({ error: false, msg: 'Skin updated successfully' });

        } else {
            res.status(400).json({ error: true, msg: 'Invalid request method' });
        }

        connection.release();
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
}

export default editSkin;