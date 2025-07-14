import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import knex from '../../inc/knex.js';
import logger from '../../logger.js';


// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/skins/');
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    req.fileUuid = uuid;
    cb(null, `${uuid}.png`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: function (req, file, cb) {
    // Accept only images
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
}).single('skin');

async function uploadSkinRoute(req, res) {
  try {
  

    const userId = req.user.sub;
    
    console.log(req.user)

    // // Check if user exists and has permissions
    // const user = await knex('users')
    //   .where('id', userId)
    //   .first('perms');

    // if (!user) {
    //   return res.status(404).json({ error: true, msg: 'User not found' });
    // }

    // // Check if user has permission to upload skins
    if (!req.user.permissions.includes('profile.changeskin')) {
      return res.status(403).json({ error: true, msg: 'You do not have permission to upload skins' });
    }

    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: true, msg: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: true, msg: `Error: ${err.message}` });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ error: true, msg: 'No file uploaded' });
        }

        const metadata = await sharp(req.file.path).metadata();
        const hd = metadata.width > 64 || metadata.height > 64;
        const slim = req.body.slim === 'true' || req.body.slim === true;
        
        // Check HD permissions
        if (hd && !req.user.permissions.includes('profile.changeskinHD')) {
          await fs.unlink(req.file.path);
          return res.status(403).json({ error: true, msg: 'No permission to upload HD skins' });
        }

        logger.info(`User ${userId} uploading skin: ${req.file.originalname}, HD: ${hd}, Slim: ${slim}`);

        // Save to database using transaction
        await knex.transaction(async (trx) => {
          // Insert skin record
          await trx('skins_library').insert({
            uuid: req.fileUuid,
            name: req.file.originalname,
            ownerid: userId,
            slim: slim,
            hd: hd,
            disabled: false,
            cloak_id: '0'
          });

          // Check if user has a selected skin and update or insert
          const existingSkin = await trx('skin_user')
            .where('uid', userId)
            .first();

          if (existingSkin) {
            await trx('skin_user')
              .where('uid', userId)
              .update({ skin_id: req.fileUuid });
          } else {
            await trx('skin_user')
              .insert({
                uid: userId,
                skin_id: req.fileUuid
              });
          }
        });

        return res.status(200).json({
          error: false,
          msg: 'Skin uploaded successfully',
          data: { uuid: req.fileUuid, name: req.file.originalname, slim, hd }
        });
      } catch (error) {
        // Clean up file on error
        if (req.file) {
          await fs.unlink(req.file.path).catch(logger.error);
        }
        logger.error('Upload error:', error);
        return res.status(500).json({ error: true, msg: `Error processing upload: ${error.message}` });
      }
    });
  } catch (error) {
    logger.error(`Error in upload route: ${error} `, );
    return res.status(500).json({ error: true, msg: 'Internal server error' });
  }
}

export default uploadSkinRoute;