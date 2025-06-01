import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import logger from '../../logger.js';
import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/capes/');
    },
    filename: (req, file, cb) => {
        const uuid = uuidv4();
        req.capeUuid = uuid;
        cb(null, `${uuid}.png`);
    }
});

async function checkPermission(userId) {
    const user = await knex('users')
        .where({ id: userId })
        .first('permlvl');
    
    if (!user) return false;
    
    const permLevel = user.permlvl;
    const permissions = config.permissions[permLevel] || [];
    
    return permissions.includes('admin.capes');
}

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'image/png') {
            cb(new Error('Only PNG files allowed'));
            return;
        }
        cb(null, true);
    }
}).single('cape');

async function uploadCape(req, res) {
    try {
        const hasPermission = await checkPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        upload(req, res, async (err) => {
            if (err) return res.status(400).json({ error: true, msg: err.message });

            const { name } = req.body;
            const owners = JSON.parse(req.body.owners || '[]'); // Parse owner array
            const uuid = req.capeUuid;

            // Using knex transaction to ensure all operations succeed or fail together
            await knex.transaction(async (trx) => {
                // Insert cape
                await trx('cloaks_lib').insert({
                    uuid: uuid,
                    name: name
                });

                // Insert owners if provided
                if (owners.length > 0) {
                    const ownerInserts = owners.map(uid => ({
                        uid: uid,
                        cloak_id: uuid
                    }));
                    
                    await trx('cloaks_users').insert(ownerInserts);
                }
            });

            res.json({ error: false, msg: 'Cape uploaded', id: uuid });
        });
    } catch (err) {
        logger.error("[ERROR] Cape upload failed:", err);
        res.status(500).json({ error: true, msg: 'Upload failed' });
    }
}

async function updateCape(req, res) {
    try {
        const hasPermission = await checkPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;
        const { name } = req.body;

        await knex('cloaks_lib')
            .where('uuid', id)
            .update({ name: name });

        res.json({ error: false, msg: 'Cape updated' });
    } catch (err) {
        logger.error("[ERROR] Cape update failed:", err);
        res.status(500).json({ error: true, msg: 'Update failed' });
    }
}

async function deleteCape(req, res) {
    try {
        const hasPermission = await checkPermission(req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;

        await knex.transaction(async (trx) => {
            // Delete owners first (foreign key constraint)
            await trx('cloaks_users')
                .where('cloak_id', id)
                .delete();

            // Delete cape record
            await trx('cloaks_lib')
                .where('uuid', id)
                .delete();
        });

        // Delete file
        await fs.unlink(path.join('uploads/capes', `${id}.png`));

        res.json({ error: false, msg: 'Cape deleted' });
    } catch (err) {
        logger.error("[ERROR] Cape deletion failed:", err);
        res.status(500).json({ error: true, msg: 'Deletion failed' });
    }
}

export { uploadCape, updateCape, deleteCape };