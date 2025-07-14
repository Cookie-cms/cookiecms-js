import knex from '../../inc/knex.js';
import Mail from 'nodemailer/lib/mailer/index.js';
import { checkPermissionInc, addaudit } from '../../inc/common.js';
import logger from '../../logger.js';



async function getUserSkins(req, res) {
    try {
        // Check permissions
        if (!await checkPermissionInc(req, 'admin.user')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
                code: 403
            });
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
        .select(
            'skins_library.uuid',
            'skins_library.name',
            knex.raw("COALESCE(skins_library.cloak_id, '') AS cloak_id")
        )
        .where('skins_library.ownerid', userId);
}

export async function user(req, res) {
    const { id } = req.params;


    try {
       

        if (!await checkPermissionInc(req, 'admin.user')) {
            return res.status(403).json({
                error: true,
                msg: 'Permission denied',
                code: 403
            });
    }

        const user = await knex('users')
                    .leftJoin('permissions_groups', 'users.permission_group_id', 'permissions_groups.id')
                    .select(
                        'users.*',
                        'permissions_groups.name as group_name',
                        'permissions_groups.description as group_description'
                    )
                    .where('users.id', id)
                    .first();
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
            .where('id', id)
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
                Permission_Group_Id: user.permission_group_id,
                Permission_Group_Name: user.group_name,
                Capes: capeList,
                Skins: skinList,
                Discord_integration: discordIntegration,
                Discord: discordData,
                Mail_verification: user.mail_verify === 1
            }
        };

        console.log(userdata);
        res.status(200).json(userdata);
    } catch (error) {
        logger.error('Error:', error);
        res.status(500).json({ error: true, msg: 'Internal Server Error' });
    }
}

export async function userupdate(req, res) {
    try {
        // Check permissions
        // const hasPermission = await checkPermission(req.userId, 'admin.useredit');
        // if (!hasPermission) {
        //     return res.status(403).json({ 
        //         error: true, 
        //         msg: 'Insufficient permissions' 
        //     });
        // }

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
        const { id } = req.params;

        const user = id;
        // Check permissions
        // const hasPermission = await checkPermission(req.userId, 'admin.users');
        // if (!hasPermission) {
        //     return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        // }

        const { cape } = req.body;

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
        const { id: user } = req.params;

        // Check permissions
        // const hasPermission = await checkPermission(req.userId, 'admin.users');
        // if (!hasPermission) {
        //     return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        // }

        const { cape } = req.body;

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

// Отдельная функция для изменения группы пользователя
export async function updateUserGroup(req, res) {
    try {
        // Check permissions
        // const hasPermission = await checkPermission(req.userId, 'admin.useredit.group');
        // if (!hasPermission) {
        //     return res.status(403).json({ 
        //         error: true, 
        //         msg: 'Insufficient permissions' 
        //     });
        // }

        const { id } = req.params;
        const { permission_group_id } = req.body;

        // Validate required fields
        if (permission_group_id === undefined) {
            return res.status(400).json({
                error: true,
                msg: 'Permission group ID is required'
            });
        }

        // Get current user data for audit
        const currentUser = await knex('users')
            .select('permission_group_id', 'username')
            .where('id', id)
            .first();

        if (!currentUser) {
            return res.status(404).json({ 
                error: true, 
                msg: 'User not found' 
            });
        }

        // Validate permission group exists
        if (permission_group_id !== null) {
            const groupExists = await knex('permissions_groups')
                .where('id', permission_group_id)
                .first();

            if (!groupExists) {
                return res.status(400).json({
                    error: true,
                    msg: 'Invalid permission group'
                });
            }
        }

        // Check if group is actually changing
        if (permission_group_id === currentUser.permission_group_id) {
            return res.status(400).json({
                error: true,
                msg: 'User already has this permission group'
            });
        }

        // Update user group using Knex transaction
        await knex.transaction(async trx => {
            // Update user's permission group
            await trx('users')
                .where('id', id)
                .update({
                    permission_group_id: permission_group_id
                });

            // Add audit entry for permission group change
            await addaudit(req.userId, 11, id, 
                currentUser.permission_group_id, permission_group_id, 'permission_group_id');
        });

        // Get group name for response
        let groupName = null;
        if (permission_group_id !== null) {
            const group = await knex('permissions_groups')
                .select('name')
                .where('id', permission_group_id)
                .first();
            groupName = group ? group.name : null;
        }

        logger.info(`User ${currentUser.username} (ID: ${id}) permission group changed from ${currentUser.permission_group_id} to ${permission_group_id} by user ${req.userId}`);

        return res.json({
            error: false,
            msg: 'User permission group updated successfully',
            data: {
                user_id: id,
                old_group_id: currentUser.permission_group_id,
                new_group_id: permission_group_id,
                new_group_name: groupName
            }
        });

    } catch (error) {
        logger.error('[ERROR] User group update failed:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to update user permission group' 
        });
    }
}

// Отдельная функция для получения доступных групп
export async function getPermissionGroups(req, res) {
    try {
        // Check permissions
        // const hasPermission = await checkPermission(req.userId, 'admin.groups');
        // if (!hasPermission) {
        //     return res.status(403).json({ 
        //         error: true, 
        //         msg: 'Insufficient permissions' 
        //     });
        // }

        const groups = await knex('permissions_groups')
            .select('id', 'name', 'description')
            .orderBy('name');

        return res.json({
            error: false,
            msg: 'Permission groups retrieved successfully',
            data: groups
        });

    } catch (error) {
        logger.error('[ERROR] Failed to get permission groups:', error);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to get permission groups' 
        });
    }
}


export { getUserSkins };