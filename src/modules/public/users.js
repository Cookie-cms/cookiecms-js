import knex from '../../inc/knex.js';
import logger from '../../logger.js';

async function UsersList(req, res) {
    try {
        const users = await knex('users as u')
            .select(
                'u.username',
                'u.dsid as discordid',
                knex.raw('COALESCE(d.avatar, "") as discordcache'),
                'u.id as uuid'
            )
            .leftJoin('discord_avatar_cache as d', 'u.dsid', '=', 'd.dsid');

        return res.json({
            error: false,
            users: users.map(user => ({
                username: user.username,
                discordid: user.discordid || "",
                discordcache: user.discordcache,
                uuid: user.uuid
            }))
        });
    } catch (err) {
        logger.error("[ERROR] Failed to get users list:", err);
        return res.status(500).json({ 
            error: true, 
            msg: 'Failed to get users list' 
        });
    }
}

export default UsersList;