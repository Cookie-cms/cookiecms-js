import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';

const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

async function getUserSkins(userId) {
    return await knex('skins_library')
        .select('skins_library.uuid', 'skins_library.name')
        .select(knex.raw(`COALESCE(skins_library.cloak_id, '0') AS cloak_id`))
        .where('skins_library.ownerid', userId);
}

async function home(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';

    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }

    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }

        const userId = status.data.sub;
        logger.info(userId);
        const user = await knex('users')
            .where({ id: userId })
            .first();

        if (!user) {
            return res.status(404).json({ error: true, msg: 'User not found', code: 404 });
        }

        if (!user.username || !user.uuid || !user.password) {
            logger.info(user);
            const response = {
                username_create: !user.username,
                password_create: !user.password
            };
            return res.status(401).json({ error: true, msg: 'Your account is not finished', code: 401, url: '/login', data: response });
        }

        const selectedSkin = await knex('skin_user')
            .join('skins_library', 'skin_user.skin_id', '=', 'skins_library.uuid')
            .select('skin_user.skin_id', 'skins_library.name as skin_name', 'skins_library.cloak_id')
            .where('skin_user.uid', userId)
            .first();

        logger.info(selectedSkin);

        const capes = await knex('cloaks_users')
            .join('cloaks_lib', 'cloaks_users.cloak_id', '=', 'cloaks_lib.uuid')
            .select('cloaks_lib.uuid as id', 'cloaks_lib.name')
            .where('cloaks_users.uid', userId);

        const capeList = capes.length > 0 ? capes.map(cape => ({
            Id: cape.id,
            Name: cape.name
        })) : [];

        let selectedCape = null;
        
        const skinList = await getUserSkins(status.data.sub);

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
            msg: "Home data fetched successfully",
            url: null,
            data: {
                Username: user.username,
                Uuid: user.uuid,
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

export default home;