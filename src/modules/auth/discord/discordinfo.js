import knex from '../../../inc/knex.js';

export async function getDiscordInfo(userId) {
    return await knex('discord')
        .where('userid', userId)
        .first();
}

export async function updateDiscordInfo(userResponse) {
    const randomCode = Math.floor(Math.random() * 99) + 1;
    const timexp = Math.floor(Date.now() / 1000) + 3600;

    await knex('discord')
        .where('userid', userResponse.id)
        .update({
            avatar_cache: userResponse.avatar,
            name_gb: userResponse.username,
            conn_id: randomCode,
            expire: timexp,
            mail: userResponse.email || null
        });

    return { randomCode, timexp };
}

export async function insertDiscordInfo(userResponse) {
    const randomCode = Math.floor(Math.random() * 99) + 1;
    const timexp = Math.floor(Date.now() / 1000) + 3600;

    await knex('discord').insert({
        avatar_cache: userResponse.avatar,
        name_gb: userResponse.username,
        conn_id: randomCode,
        expire: timexp,
        mail: userResponse.email || null,
        userid: userResponse.id
    });

    return { randomCode, timexp };
}