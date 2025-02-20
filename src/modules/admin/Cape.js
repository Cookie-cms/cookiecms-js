import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';

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

async function checkPermission(connection, userId) {
    const [userPerms] = await connection.query(
        "SELECT permlvl FROM users WHERE id = ?", 
        [userId]
    );
    
    if (!userPerms.length) return false;
    
    const permLevel = userPerms[0].permlvl;
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
    const connection = await mysql.getConnection();
    try {
        const hasPermission = await checkPermission(connection, req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        upload(req, res, async (err) => {
            if (err) return res.status(400).json({ error: true, msg: err.message });

            const { name } = req.body;
            const owners = JSON.parse(req.body.owners || '[]'); // Parse owner array
            const uuid = req.capeUuid;

            // Insert cape
            await connection.query(
                "INSERT INTO cloaks_lib (uuid, name) VALUES (?, ?)",
                [uuid, name]
            );

            // Insert owners if provided
            if (owners.length > 0) {
                const ownerValues = owners.map(uid => [uid, uuid]);
                await connection.query(
                    "INSERT INTO cloaks_users (uid, cloak_id) VALUES ?",
                    [ownerValues]
                );
            }

            res.json({ error: false, msg: 'Cape uploaded', id: uuid });
        });
    } catch (err) {
        console.error("[ERROR] Cape upload failed:", err);
        res.status(500).json({ error: true, msg: 'Upload failed' });
    } finally {
        connection.release();
    }
}

async function updateCape(req, res) {
    const connection = await mysql.getConnection();
    try {
        const hasPermission = await checkPermission(connection, req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;
        const { name } = req.body;

        await connection.query(
            "UPDATE cloaks_lib SET name = ? WHERE uuid = ?",
            [name, id]
        );

        res.json({ error: false, msg: 'Cape updated' });
    } catch (err) {
        console.error("[ERROR] Cape update failed:", err);
        res.status(500).json({ error: true, msg: 'Update failed' });
    } finally {
        connection.release();
    }
}

async function deleteCape(req, res) {
    const connection = await mysql.getConnection();
    try {
        const hasPermission = await checkPermission(connection, req.userId);
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;

        // Delete owners first (foreign key constraint)
        await connection.query(
            "DELETE FROM cloaks_users WHERE cloak_id = ?",
            [id]
        );

        // Delete cape record
        await connection.query(
            "DELETE FROM cloaks_lib WHERE uuid = ?",
            [id]
        );

        // Delete file
        await fs.unlink(path.join('uploads/capes', `${id}.png`));

        res.json({ error: false, msg: 'Cape deleted' });
    } catch (err) {
        console.error("[ERROR] Cape deletion failed:", err);
        res.status(500).json({ error: true, msg: 'Deletion failed' });
    } finally {
        connection.release();
    }
}

export { uploadCape, updateCape, deleteCape };