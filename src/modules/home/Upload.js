import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as Jimp from 'jimp';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';

const config = readConfig();
const uploadMulter = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'image/png') {
      return cb(new Error('Only PNG files are allowed'), false);
    }
    cb(null, true);
  }
});

export async function uploadSkinRoute(req, res) {
  try {
    // 1. Get JWT
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Invalid JWT' });

    // 2. Check token
    const connection = await mysql.getConnection();
    const status = await isJwtExpiredOrBlacklisted(token, connection, config.securecode);
    if (!status.valid) {
      connection.release();
      return res.status(401).json({ error: status.message });
    }

    // 3. Get user perms
    const userId = status.data.sub;
    const [userRows] = await connection.query('SELECT perms FROM users WHERE id = ?', [userId]);
    if (!userRows.length) {
      connection.release();
      return res.status(404).json({ error: 'User not found' });
    }
    const userPerm = userRows[0].perms;

    // Check if user has the permission (example logic)
    const permsConfig = config.permissions[userPerm] || [];
    if (!permsConfig.includes('profile.changeskinHD')) {
      connection.release();
      return res.status(403).json({ error: 'No permission to change HD skin' });
    }

    // 4. Multer to handle file
    uploadMulter.single('file')(req, res, async (err) => {
      if (err) {
        connection.release();
        return res.status(400).json({ error: err.message });
      }

      // 5. Check file
      if (!req.file) {
        connection.release();
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // 6. Check image resolution
      const image = await Jimp.read(req.file.path);
      const { width, height } = image.bitmap;
      const hd = (width > 64 || height > 64);

      // 7. Validate slim option
      const slim = req.body.slim === 'true' || req.body.slim === true;

      // 8. Generate filename with uuid
      const newUuid = uuidv4();
      const newName = `${newUuid}.png`;

      // 9. Insert into DB (example)
      await connection.query(
        'INSERT INTO skins_library (uuid, name, ownerid, slim, hd, disabled, cloak_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newName, 'Uploaded Skin', userId, slim, hd, false, 0]
      );

      connection.release();
      res.json({ success: true, file: newName });
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

export default uploadSkinRoute;