import bcrypt from 'bcrypt';
import mysql from '../../inc/mysql.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';


const config = readConfig(process.env.CONFIG_PATH || '../config.yml');
const JWT_SECRET_KEY = config.securecode;

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

async function isJwtExpiredOrBlacklisted(token, connection, secret) {
    try {
        const decoded = jwt.verify(token, secret);
        const [blacklistedToken] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
        if (blacklistedToken.length > 0) {
            return false;
        }
        return { valid: true, data: decoded };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return false;
        }
        throw err;
    }
}

async function getUserSkins(connection, userId) {
    const [skins] = await connection.query("SELECT id, name, nff FROM skins_lib WHERE uid = ?", [userId]);
    return skins;
}

async function home(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status) {
            connection.release();
            return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
        }

        const [user] = await connection.query("SELECT * FROM users WHERE id = ?", [status.data.sub]);

        if (!user.length || !user[0].username || !user[0].uuid || !user[0].password) {
            connection.release();
            const response = {
                data: {
                    username_create: !user[0].username,
                    password_create: !user[0].password
                }
            };
            return res.status(401).json({ error: true, msg: 'Your account is not finished', code: 401, url: '/login', data: response });
        }

        const [capes] = await connection.query(`
            SELECT cloaks.*, cloaks_lib.name AS cloak_name
            FROM cloaks
            JOIN cloaks_lib ON cloaks.cid = cloaks_lib.id
            WHERE cloaks.uid = ?
        `, [status.data.sub]);

        const skinList = await getUserSkins(connection, status.data.sub);

        const capeList = capes.map(cape => ({
            Id: cape.cid ? parseInt(cape.cid, 10) : null,
            Name: cape.cloak_name || ""
        }));

        const response = {
            error: false,
            msg: "",
            url: null,
            data: {
                Username: user[0].username,
                Uuid: user[0].uuid,
                Selected_Cape: 0,
                Selected_Skin: 0,
                Capes: capeList,
                Skin: skinList,
                Discord_integration: null,
                Discord: {
                    Discord_Global_Name: "",
                    Discord_Ava: ""
                },
                Mail_verification: user[0].mail_verify
            }
        };

        connection.release();
        return res.status(200).json(response);
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred. Please try again later.' });
    }
}

export default home;