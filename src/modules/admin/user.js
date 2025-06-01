import knex from '../../inc/knex.js';
import readConfig from '../../inc/yamlReader.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import Mail from 'nodemailer/lib/mailer/index.js';
import { checkPermission, addaudit } from '../../inc/_common.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function getUserSkins(req, res) {
    try {
        // Check permissions
        const hasPermission = await checkPermission(req.userId, 'admin.userskins');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { ownerid } = req.params;

        // Get skins for user using Knex
        const skins = await knex('skins_library')
            .select('uuid', 'name')
            .where('ownerid', ownerid);

        res.json({
            error: false,
            skins: skins
        });

    } catch (err) {
        logger.error("[ERROR] Failed to get user skins:", err);
        res.status(500).json({ error: true, msg: 'Failed to get skins' });
    }
}

async function getUserSkins_s(userId) {
    return await knex('skins_library')
        .select('skins_library.uuid', 'skins_library.name')
        .select(knex.raw('IFNULL(skins_library.cloak_id, 0) AS cloak_id'))
        .where('skins_library.ownerid', userId);
}

export async function user(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    const { id } = req.params;

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }
        const userId = status.data.sub;

        const hasPermission = await checkPermission(userId, 'admin.user');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        logger.info(userId);
        const user = await knex('users').where('id', id).first();

        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found', code: 404 });
        }

        const selectedSkin = await knex('skin_user')
            .join('skins_library', 'skin_user.skin_id', '=', 'skins_library.uuid')
            .select('skin_user.skin_id', 'skins_library.name as skin_name', 'skins_library.cloak_id')
            .where('skin_user.uid', id)
            .first();

        logger.info(selectedSkin);

        const capes = await knex('cloaks_users')
            .join('cloaks_lib', 'cloaks_users.cloak_id', '=', 'cloaks_lib.uuid')
            .select('cloaks_lib.uuid as id', 'cloaks_lib.name')
            .where('cloaks_users.uid', id);

        const capeList = capes.length > 0 ? capes.map(cape => ({
            Id: cape.id,
            Name: cape.name
        })) : [];

        let selectedCape = null;
        
        const skinList = await getUserSkins_s(id);

        if (selectedSkin && selectedSkin.cloak_id) {
            const cape = await knex('cloaks_lib')
                .select('uuid as id', 'name')
                .where('uuid', selectedSkin.cloak_id)
                .first();

            if (cape) {
                selectedCape = {
                    Id: cape.id,
                    Name: cape.name
                };
            }
        }

        const discordid = await knex('users')
            .select('dsid')
            .where('id', userId)
            .first();

        let discordIntegration = false;
        let discordData = {
            userid: "",
            username: "",
            avatar: ""
        };

        if (discordid && discordid.dsid) {
            const discordInfo = await knex('discord')
                .where('userid', discordid.dsid)
                .first();

            if (discordInfo) {
                discordIntegration = true;
                discordData = {
                    userid: discordInfo.userid,
                    username: discordInfo.name_gb,
                    avatar: discordInfo.avatar_cache
                };
            }
        }

        const userdata = {
            error: false,
            msg: "User data fetched successfully",
            url: null,
            data: {
                Username: user.username,
                Uuid: user.uuid,
                Mail: user.mail,
                Mail_verify: user.mail_verify,
                Selected_Cape: selectedCape ? selectedCape.Id : 0,
                Selected_Skin: selectedSkin ? selectedSkin.skin_id : 0,
                PermLvl: user.perms,
                Capes: capeList,
                Skins: skinList,
                Discord_integration: discordIntegration,
                Discord: discordData,
                Mail_verification: user.mail_verify === 1
            }
        };

        res.status(200).json(userdata);
    } catch (error) {
        logger.error('Error:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

export async function userupdate(req, res) {
    try {
        // Check permissions
        const hasPermission = await checkPermission(req.userId, 'admin.useredit');
        if (!hasPermission) {
            return res.status(403).json({ 
                error: true, 
                msg: 'Insufficient permissions' 
            });
        }

        const { id } = req.params;
        const { username, uuid, mail, mail_verify } = req.body;

        // Get current user data for audit
        const currentUser = await knex('users')
            .select('username', 'uuid', 'mail', 'mail_verify')
            .where('id', id)
            .first();

        if (!currentUser) {
            return res.status(404).json({ 
                error: true, 
                msg: 'User not found' 
            });
        }

        // Update user using Knex transaction
        await knex.transaction(async trx => {
            // Update user
            await trx('users')
                .where('id', id)
                .update({
                    username,
                    uuid,
                    mail,
                    mail_verify
                });

            // Add audit entries for changed fields
            if (username !== currentUser.username) {
                await addaudit(req.userId, 11, id, 
                    currentUser.username, username, 'username');
            }

            if (uuid !== currentUser.uuid) {
                await addaudit(req.userId, 11, id, 
                    currentUser.uuid, uuid, 'uuid');
            }

            if (mail !== currentUser.mail) {
                await addaudit(req.userId, 11, id, 
                    currentUser.mail, mail, 'mail');
            }

            if (mail_verify !== currentUser.mail_verify) {
                await addaudit(req.userId, 11, id, 
                    currentUser.mail_verify, mail_verify, 'mail_verify');
            }
        });

        return res.json({
            error: false,
            msg: 'User updated successfully'
        });

    } catch (error) {
        logger.error('[ERROR] User update failed:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to update user' 
        });
    }
}

export async function addcape(req, res) {
    try {
        // Check permissions
        const hasPermission = await checkPermission(req.userId, 'admin.users');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { user, cape } = req.body;

        // Insert new capes if provided using Knex
        if (cape && cape.length > 0) {
            const capeValues = cape.map(capeId => ({
                uid: user,
                cloak_id: capeId
            }));
            
            await knex('cloaks_users').insert(capeValues);
        }

        res.json({ 
            error: false, 
            msg: 'Capes updated successfully'
        });

    } catch (error) {
        logger.error('[ERROR] Cape update failed:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to update capes' 
        });
    }
}

export async function RemoveCape(req, res) {
    try {
        // Check permissions
        const hasPermission = await checkPermission(req.userId, 'admin.users');
        if (!hasPermission) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { user, cape } = req.body;

        // Remove capes if provided using Knex
        if (cape && cape.length > 0) {
            await knex('cloaks_users')
                .where('uid', user)
                .whereIn('cloak_id', cape)
                .delete();
        }

        res.json({ 
            error: false,
            msg: 'Capes removed successfully'
        });

    } catch (error) {
        logger.error('[ERROR] Cape removal failed:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to remove capes' 
        });
    }
}

export { getUserSkins };