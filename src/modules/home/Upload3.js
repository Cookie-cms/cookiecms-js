import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as Jimp from 'jimp';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import fs from 'fs/promises';
import path from 'path';

const config = readConfig();


const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uuid = uuidv4();
    req.fileUuid = uuid;
    cb(null, `${uuid}.png`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'image/png') {
      cb(new Error('Only PNG files are allowed'));
      return;
    }
    cb(null, true);
  }
}).single('file');


async function uploadSkinRoute(req, res) {
  let connection;
  try {
    // Validate JWT
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: true, msg: 'Invalid token' });
    }

    connection = await mysql.getConnection();
    const status = await isJwtExpiredOrBlacklisted(token, connection, config.securecode);
    
    if (!status.valid) {
      return res.status(401).json({ error: true, msg: status.message });
    }

    const userId = status.data.sub;

    // Handle file upload
    uploadMulter(req, res, async (err) => {
      try {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ error: true, msg: 'File upload error: ' + err.message });
        } else if (err) {
          return res.status(500).json({ error: true, msg: 'Unknown error: ' + err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: true, msg: 'No file uploaded' });
        }

        // Process image
        const image = await Jimp.read(req.file.path);
        const { width, height } = image.bitmap;
        const hd = width > 64 || height > 64;
        const slim = req.body.slim === 'true' || req.body.slim === true;

        // Check HD permissions
        if (hd) {
          const [userPerms] = await connection.query('SELECT perms FROM users WHERE id = ?', [userId]);
          if (!userPerms.length || !config.permissions[userPerms[0].perms]?.includes('profile.changeskinHD')) {
            await fs.unlink(req.file.path);
            return res.status(403).json({ error: true, msg: 'No permission to upload HD skins' });
          }
        }

        // Save to database
        await connection.query(
          'INSERT INTO skins_library (uuid, name, ownerid, slim, hd, disabled, cloak_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.fileUuid, req.file.originalname, userId, slim, hd, false, '0']
        );

        await connection.query(
          'INSERT INTO skin_user (uid, skin_id) VALUES (?, ?)',
          [userId, req.fileUuid]
        );

        res.status(200).json({
          error: false,
          msg: 'Skin uploaded successfully',
          data: {
            uuid: req.fileUuid,
            name: req.file.originalname,
            slim: slim,
            hd: hd
          }
        });
      } catch (error) {
        if (req.file) {
          await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({ error: true, msg: 'Error processing upload: ' + error.message });
      }
    });
  } catch (error) {
    console.error('Error during skin upload:', error);
    res.status(500).json({ error: true, msg: 'Internal server error' });
  } finally {
    if (connection) connection.release();
  }
}

export default uploadSkinRoute;