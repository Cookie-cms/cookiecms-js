import knex from '../../inc/knex.js';

export async function userFind(req, res) {
    const { DiscordId, Playername } = req.body;

    // Проверка: должен быть только один из параметров
    if ((DiscordId && Playername) || (!DiscordId && !Playername)) {
        return res.status(400).json({ error: true, msg: 'Specify either DiscordId or Playername, not both.' });
    }

    let user;
    if (DiscordId) {
        // Поиск по Discord ID
        user = await knex('users')
            .where('dsid', DiscordId)
            .first();
    } else if (Playername) {
        // Поиск по имени игрока
        user = await knex('users')
            .where('username', Playername)
            .first();
    }

    if (!user) {
        return res.status(404).json({ error: true, msg: 'User not found' });
    }

    // Формируем ответ
    return res.json({
        discord: {
            username: user.discord_username || "",
            id: user.dsid || ""
        },
        account: {
            username: user.username || "",
            uuid: user.uuid || ""
        }
    });
}

export default userFind;