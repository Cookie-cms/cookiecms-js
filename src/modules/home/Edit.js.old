import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import { v4 as uuidv4 } from 'uuid';
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
            return false;
        }
        return { valid: true, data: decoded };
    } catch (err) {
        return false;
    }
}

async function updateUsername(connection, userId, newUsername, currentPassword) {
    if (!await validatePassword(connection, userId, currentPassword)) {
        throw new Error('Invalid password');
    }

    const [existingUser] = await connection.query("SELECT id FROM users WHERE username = ? AND id != ?", [newUsername, userId]);
    if (existingUser.length > 0) {
        throw new Error('Username is already taken by another user');
    }

    await connection.query("UPDATE users SET username = ? WHERE id = ?", [newUsername, userId]);
}

async function changePassword(connection, userId, currentPassword, newPassword) {
    if (!await validatePassword(connection, userId, currentPassword)) {
        throw new Error('Invalid password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
}

async function changeCape(connection, userId, capeId) {
    await connection.query("UPDATE users SET cape_id = ? WHERE id = ?", [capeId, userId]);
}

// async function uploadSkin(connection, userId, skinFile) {
//     const targetDir = path.join(__dirname, '../../skins/');

//     if (!fs.existsSync(targetDir)) {
//         fs.mkdirSync(targetDir, { recursive: true });
//     }

//     if (!skinFile || skinFile.mimetype !== 'image/png') {
//         throw new Error('Only PNG images are allowed');
//     }

//     const { width, height } = await new Promise((resolve, reject) => {
//         const image = new Image();
//         image.onload = () => resolve({ width: image.width, height: image.height });
//         image.onerror = reject;
//         image.src = skinFile.path;
//     });

//     if (width !== 64 || height !== 64) {
//         throw new Error('Image dimensions must be 64x64 pixels');
//     }

//     const skinName = generateUUIDv4();
//     const newFileName = `${skinName}.png`;
//     const targetFile = path.join(targetDir, newFileName);

//     const [countSkin] = await connection.query("SELECT COUNT(*) AS total_rows FROM skin_lib WHERE uid = ?", [userId]);
//     const maxfile = parseInt(config.MaxSavedSkins, 10);

//     if (countSkin[0].total_rows >= maxfile) {
//         throw new Error(`You have reached the limit of ${maxfile} skins.`);
//     }

//     fs.renameSync(skinFile.path, targetFile);

//     await connection.query("INSERT INTO skin_lib (uid, name, nff) VALUES (?, ?, ?)", [userId, newFileName, skinName]);
// }

async function removeSkin(connection, userId, skinId) {
    const [skinData] = await connection.query("SELECT name FROM skin_lib WHERE uid = ? AND id = ?", [userId, skinId]);

    if (!skinData.length) {
        throw new Error('Skin not found.');
    }

    const skinFileName = skinData[0].name;
    const targetDir = path.join(__dirname, '../../skins/');
    const skinFilePath = path.join(targetDir, skinFileName);

    await connection.query("DELETE FROM skin_lib WHERE uid = ? AND id = ?", [userId, skinId]);

    if (fs.existsSync(skinFilePath)) {
        fs.unlinkSync(skinFilePath);
    }
}

async function validatePassword(connection, userId, password) {
    const [user] = await connection.query("SELECT password FROM users WHERE id = ?", [userId]);
    return bcrypt.compare(password, user[0].password);
}

async function editProfile(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status) {
            connection.release();
            return res.status(401).json({ error: true, msg: 'Invalid token or session expired.' });
        }

        const userId = status.data.sub;
        const { action, username, password, new_password, cape } = req.body;

        switch (action) {
            case 'update_username':
                if (username && password) {
                    await updateUsername(connection, userId, username, password);
                    res.status(200).json({ error: false, msg: 'Username updated successfully' });
                } else {
                    res.status(400).json({ error: true, msg: 'Missing required fields for updating username' });
                }
                break;
            case 'change_password':
                if (password && new_password) {
                    await changePassword(connection, userId, password, new_password);
                    res.status(200).json({ error: false, msg: 'Password updated successfully' });
                } else {
                    res.status(400).json({ error: true, msg: 'Missing required fields for changing password' });
                }
                break;
            case 'change_cape':
                if (cape) {
                    await changeCape(connection, userId, cape);
                    res.status(200).json({ error: false, msg: 'Cape updated successfully' });
                } else {
                    res.status(400).json({ error: true, msg: 'Missing required fields for changing cape' });
                }
                break;
            default:
                if (req.file) {
                    await uploadSkin(connection, userId, req.file);
                    res.status(200).json({ error: false, msg: 'Skin uploaded successfully' });
                } else {
                    res.status(400).json({ error: true, msg: 'Missing action parameter' });
                }
                break;
        }

        connection.release();
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        res.status(500).json({ error: true, msg: 'Internal Server Error: ' + err.message });
    }
};

export default editProfile;