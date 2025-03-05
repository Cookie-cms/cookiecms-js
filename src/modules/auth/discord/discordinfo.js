import mysql from '../../inc/mysql.js';

export async function getDiscordInfo(userId) {
    const connection = await mysql.getConnection();
    const [[discordInfo]] = await connection.query(
        "SELECT * FROM discord WHERE userid = ?",
        [userId]
    );
    connection.release();
    return discordInfo;
}

export async function updateDiscordInfo(userResponse) {
    const connection = await mysql.getConnection();
    const randomCode = Math.floor(Math.random() * 99) + 1;
    const timexp = Math.floor(Date.now() / 1000) + 3600;

    await connection.query(
        `UPDATE discord SET avatar_cache = ?, name_gb = ?, conn_id = ?, expire = ?, mail = ? WHERE userid = ?`,
        [
            userResponse.avatar,
            userResponse.username,
            randomCode,
            timexp,
            userResponse.email || null,
            userResponse.id,
        ]
    );
    connection.release();
}

export async function insertDiscordInfo(userResponse) {
    const connection = await mysql.getConnection();
    const randomCode = Math.floor(Math.random() * 99) + 1;
    const timexp = Math.floor(Date.now() / 1000) + 3600;

    await connection.query(
        `INSERT INTO discord (avatar_cache, name_gb, conn_id, expire, mail, userid) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userResponse.avatar,
            userResponse.username,
            randomCode,
            timexp,
            userResponse.email || null,
            userResponse.id,
        ]
    );
    connection.release();
}
