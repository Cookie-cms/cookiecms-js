import Client from 'discord-oauth2-api';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig(process.env.CONFIG_PATH || '../config.yml');
const discordClient = new Client({
    clientId: config.discord.client_id,
    clientSecret: config.discord.secret_id,
    redirectUri: config.discord.redirect_url
});

async function isDiscordUserRegistered(connection, email) {
    const [existingUser] = await connection.query("SELECT * FROM users WHERE BINARY mail = ?", [email]);
    return existingUser.length > 0;
}

async function SingupDiscord(user) {
    const connection = await mysql.getConnection();

    const mail = user.email;
    const userId = user.user_id;

    if (await isDiscordUserRegistered(connection, mail)) {
        connection.release();
        return { error: true, msg: "Email is already registered." };
    }

    // Your registration logic here
}

export default SingupDiscord;