import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import Mail from 'nodemailer/lib/mailer/index.js';
import {checkPermission} from '../../inc/_common.js';


const config = readConfig();
const JWT_SECRET_KEY = config.securecode;



async function getUserSkins(req, res) {
    const connection = await mysql.getConnection();
    try {
        // Check permissions
        const hasPermission = await checkPermission(connection, req.userId, 'admin.userskins');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { ownerid } = req.params;

        // Get skins for user
        const [skins] = await connection.query(
            "SELECT uuid, name FROM skins_library WHERE ownerid = ?",
            [ownerid]
        );

        res.json({
            error: false,
            skins: skins
        });

    } catch (err) {
        console.error("[ERROR] Failed to get user skins:", err);
        res.status(500).json({ error: true, msg: 'Failed to get skins' });
    } finally {
        connection.release();
    }
}


async function getUserSkins_s(connection, userId) {
    const [skins] = await connection.query(`
        SELECT skins_library.uuid, skins_library.name, IFNULL(skins_library.cloak_id, 0) AS cloak_id
        FROM skins_library
        WHERE skins_library.ownerid = ?
    `, [userId]);
    return skins;
}

// async function getUserSkins(connection, userId) {
//     const [skins] = await connection.query(`
//         SELECT skins_library.uuid, skins_library.name, IFNULL(skins_library.cloak_id, 0) AS cloak_id
//         FROM skins_library
//         WHERE skins_library.ownerid = ?
//     `, [userId]);
//     return skins;
// }

async function user(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    const { id } = req.params;

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

        const hasPermission = await checkPermission(connection, userId, 'admin.user');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }
    

        console.log(userId);
        const [user] = await connection.query("SELECT * FROM users WHERE id = ?", [id]);

        if (!user.length) {
            connection.release();
            return res.status(404).json({ error: true, msg: 'User not found', code: 404 });
        }



        const [selectedSkin] = await connection.query(`
            SELECT skin_user.skin_id, skins_library.name AS skin_name, skins_library.cloak_id
            FROM skin_user
            JOIN skins_library ON skin_user.skin_id = skins_library.uuid
            WHERE skin_user.uid = ?
        `, [id]);

        console.log(selectedSkin);

        const [capes] = await connection.query(`
            SELECT cloaks_lib.uuid AS id, cloaks_lib.name
            FROM cloaks_users
            JOIN cloaks_lib ON cloaks_users.cloak_id = cloaks_lib.uuid
            WHERE cloaks_users.uid = ?
        `, [id]);

        const capeList = capes.length > 0 ? capes.map(cape => ({
            Id: cape.id,
            Name: cape.name
        })) : [];

        let selectedCape = null;
        
        const skinList = await getUserSkins_s(connection, id);


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
            userid: "",
            username: "",
            avatar: ""
        };

        if (discordid.length > 0) {
            const [discordInfo] = await connection.query("SELECT * FROM discord WHERE userid = ?", [discordid[0].dsid]);

            if (discordInfo.length > 0) {
                discordIntegration = true;
                discordData = {
                    userid: discordInfo[0].userid,
                    username: discordInfo[0].name_gb,
                    avatar: discordInfo[0].avatar_cache
                };
            }
        }


        connection.release();

        const userdata = {
            error: false,
            msg: "User data fetched successfully",
            url: null,
            data: {
                Username: user[0].username,
                Uuid: user[0].uuid,
                Mail: user[0].mail,
                Mail_verify: user[0].mail_verify,
                Selected_Cape: selectedCape ? selectedCape.Id : 0,
                Selected_Skin: selectedSkin.length > 0 ? selectedSkin[0].skin_id : 0,
                PermLvl: user[0].perms,
                Capes: capeList,
                Skins: skinList,
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

export async function userupdate(req, res) {
    const connection = await pool.getConnection();
    try {
        // Check permissions
        const hasPermission = await checkPermission(connection, req.userId, 'admin.useredit');
        if (!hasPermission) {
            return res.status(403).json({ 
                error: true, 
                msg: 'Insufficient permissions' 
            });
        }

        const { id } = req.params;
        const { username, uuid, mail, mail_verify } = req.body;

        // Get current user data for audit
        const [currentUser] = await connection.query(
            "SELECT username, uuid, mail, mail_verify FROM users WHERE id = ?",
            [id]
        );

        if (!currentUser.length) {
            return res.status(404).json({ 
                error: true, 
                msg: 'User not found' 
            });
        }

        // Update user
        await connection.query(
            `UPDATE users 
             SET username = ?, 
                 uuid = ?, 
                 mail = ?, 
                 mail_verify = ? 
             WHERE id = ?`,
            [username, uuid, mail, mail_verify, id]
        );

        // Add audit entries for changed fields
        if (username !== currentUser[0].username) {
            await addaudit(connection, req.userId, 'username_change', id, 
                currentUser[0].username, username, 'username');
        }

        if (uuid !== currentUser[0].uuid) {
            await addaudit(connection, req.userId, 'uuid_change', id, 
                currentUser[0].uuid, uuid, 'uuid');
        }

        if (mail !== currentUser[0].mail) {
            await addaudit(connection, req.userId, 'mail_change', id, 
                currentUser[0].mail, mail, 'mail');
        }

        if (mail_verify !== currentUser[0].mail_verify) {
            await addaudit(connection, req.userId, 'mail_verify_change', id, 
                currentUser[0].mail_verify, mail_verify, 'mail_verify');
        }

        return res.json({
            error: false,
            msg: 'User updated successfully'
        });

    } catch (error) {
        console.error('[ERROR] User update failed:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to update user' 
        });
    } finally {
        connection.release();
    }
}

export { getUserSkins, user };