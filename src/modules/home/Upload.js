import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import fs from 'fs/promises';
import path from 'path';

const config = readConfig();


const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/skins/');
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

async function validateUser(connection, userId) {
  console.log(userId);
  const [user] = await connection.query('SELECT id, perms FROM users WHERE id = ?', [userId]);
  if (!user.length) {
    throw new Error('User not found');
  }
  return user[0];
}

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

    // Validate user exists
    const user = await validateUser(connection, userId);

    upload(req, res, async (err) => {
      try {
        if (err) {
          return res.status(400).json({ error: true, msg: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: true, msg: 'No file uploaded' });
        }

        // Process image
        const metadata = await sharp(req.file.path).metadata();
        const hd = metadata.width > 64 || metadata.height > 64;
        const slim = req.body.slim === 'true' || req.body.slim === true;
        

        // Check HD permissions
        if (hd && !config.permissions[user.perms]?.includes('profile.changeskinHD')) {
          await fs.unlink(req.file.path);
          return res.status(403).json({ error: true, msg: 'No permission to upload HD skins' });
        }

        // Save to database using transaction
        await connection.beginTransaction();
        try {
          const [a] = await connection.query(
            'INSERT INTO skins_library (uuid, name, ownerid, slim, hd, disabled, cloak_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.fileUuid, req.file.originalname, userId, slim, hd, false, '0']
          );

          const [existingSkin] = await connection.query("SELECT * FROM skin_user WHERE uid = ?", [userId]);

          if (existingSkin.length > 0) {
              await connection.query('UPDATE skin_user SET skin_id = ? WHERE uid = ?', [req.fileUuid, userId]);
          } else {
              await connection.query(
                'INSERT INTO skin_user (uid, skin_id) VALUES (?, ?)',
                [userId, req.fileUuid]
              );
          }


          await connection.commit();

          res.status(200).json({
            error: false,
            msg: 'Skin uploaded successfully',
            data: { uuid: req.fileUuid, name: req.file.originalname, slim, hd }
          });
        } catch (dbError) {
          await connection.rollback();
          throw dbError;
        }
      } catch (error) {
        if (req.file) {
          await fs.unlink(req.file.path).catch(console.error);
        }
        console.log('Error processing upload:', error);
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