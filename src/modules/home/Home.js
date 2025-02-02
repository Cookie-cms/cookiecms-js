import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';

const config = readConfig(process.env.CONFIG_PATH || '../config.yml');
const JWT_SECRET_KEY = config.securecode;

async function getUserSkins(connection, userId) {
    const [skins] = await connection.query(`
        SELECT skins_library.uuid, skins_library.name, IFNULL(skins_library.cloak_id, 0) AS cloak_id
        FROM skins_library
        WHERE skins_library.ownerid = ?
    `, [userId]);
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

        const [selectedSkin] = await connection.query(`
            SELECT skin_user.skin_id, skins_library.name AS skin_name, skins_library.cloak_id
            FROM skin_user
            JOIN skins_library ON skin_user.skin_id = skins_library.uuid
            WHERE skin_user.uid = ?
        `, [status.data.sub]);

        const [capes] = await connection.query(`
            SELECT cloaks_lib.uuid AS id, cloaks_lib.name
            FROM cloaks_users
            JOIN cloaks_lib ON cloaks_users.cloak_id = cloaks_lib.uuid
            WHERE cloaks_users.uid = ?
        `, [status.data.sub]);

        const skinList = await getUserSkins(connection, status.data.sub);

        const capeList = capes.length > 0 ? capes.map(cape => ({
            Id: cape.id,
            Name: cape.name
        })) : [];

        let selectedCape = null;

        if (selectedSkin.length > 0 && selectedSkin[0].cloak_id) {
            const [cape] = await connection.query(`
                SELECT uuid AS id, name FROM cloaks_lib WHERE uuid = ?;
            `, [selectedSkin[0].cloak_id]);

            if (cape.length > 0) {
                selectedCape = {
                    Id: cape[0].id,
                    Name: cape[0].name
                };
            }
        }

        const response = {
            error: false,
            msg: "",
            url: null,
            data: {
                Username: user[0].username,
                Uuid: user[0].uuid,
                Selected_Skin: selectedSkin.length > 0 ? selectedSkin[0].skin_id : null,
                Capes: capeList,
                Skins: skinList.map(skin => ({
                    uuid: skin.uuid,
                    name: skin.name,
                    capesid: skin.cloak_id
                })),
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