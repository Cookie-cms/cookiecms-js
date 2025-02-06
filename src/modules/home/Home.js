import mysql from '../../inc/mysql.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function home(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);

        if (!status.valid) {
            connection.release();
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const userId = status.data.sub;
        const [user] = await connection.query("SELECT * FROM users WHERE id = ?", [userId]);

        if (!user.length || !user[0].username || !user[0].uuid || !user[0].password) {
            connection.release();
            const response = {
                username_create: !user[0].username,
                password_create: !user[0].password
            };
            return res.status(401).json({ error: true, msg: 'Your account is not finished', code: 401, url: '/login', data: response });
        }

        const [selectedSkin] = await connection.query(`
            SELECT skin_user.skin_id, skins_library.name AS skin_name, skins_library.cloak_id
            FROM skin_user
            JOIN skins_library ON skin_user.skin_id = skins_library.uuid
            WHERE skin_user.uid = ?
        `, [userId]);

        console.log(selectedSkin);

        const [capes] = await connection.query(`
            SELECT cloaks_lib.uuid AS id, cloaks_lib.name
            FROM cloaks_users
            JOIN cloaks_lib ON cloaks_users.cloak_id = cloaks_lib.uuid
            WHERE cloaks_users.uid = ?
        `, [userId]);

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

        const [discordid] = await connection.query("SELECT dsid FROM users WHERE id = ?", [userId]);

        let discordIntegration = false;
        let discordData = {
            Discord_Global_Name: "",
            Discord_Ava: ""
        };

        if (discordid.length > 0) {
            const [discordInfo] = await connection.query("SELECT * FROM discord WHERE userid = ?", [discordid[0].dsid]);

            if (discordInfo.length > 0) {
                discordIntegration = true;
                discordData = {
                    Discord_Global_Name: discordInfo[0].name_gb,
                    Discord_Ava: discordInfo[0].avatar_cache
                };
            }
        }

        connection.release();

        const userdata = {
            error: false,
            msg: "Home data fetched successfully",
            url: null,
            data: {
                Username: user[0].username,
                Uuid: user[0].uuid,
                Selected_Cape: selectedCape ? selectedCape.Id : 0,
                Selected_Skin: selectedSkin.length > 0 ? selectedSkin[0].skin_id : 0,
                PermLvl: user[0].perms,
                Capes: capeList,
                Skins: selectedSkin.length > 0 ? [{
                    Id: selectedSkin[0].skin_id,
                    Name: selectedSkin[0].skin_name
                }] : [],
                Discord_integration: discordIntegration,
                Discord: discordData,
                Mail_verification: user[0].mail_verify === 1
            }
        };

        res.status(200).json(userdata);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default home;