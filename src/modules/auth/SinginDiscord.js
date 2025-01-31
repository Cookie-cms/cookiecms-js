const express = require('express');
const Client = require('discord-oauth2-api');
const mysql = require('../../inc/mysql');
const readConfig = require('../../inc/yamlReader');

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

async function registerDiscord(user) {
    const connection = await mysql.getConnection();

    const mail = user.email;
    const userId = user.user_id;

    if (await isDiscordUserRegistered(connection, mail)) {
        connection.release();
        return { error: true, msg: "Email is already registered." };
    }

    const id = Math.floor(Math.random() * 1e18);

    await connection.query("INSERT INTO users (id, mail) VALUES (?, ?)", [id, mail]);

    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomCode = '';
    const length = 6;
    for (let i = 0; i < length; i++) {
        randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const timexp = Math.floor(Date.now() / 1000) + 3600;
    const action = 1;

    await connection.query("INSERT INTO verify_codes (userid, code, expire, action) VALUES (?, ?, ?, ?)", [id, randomCode, timexp, action]);

    connection.release();
    return { error: false, msg: "Registration successful. Please proceed to registration.", url: "/home" };
}

async function signinDiscord(req, res) {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: true, msg: 'Code not provided' });
    }

    try {
        const token = await discordClient.getAccessToken(code);
        const user = await discordClient.getUser(token.access_token);

        const result = await registerDiscord(user);
        if (result.error) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error("[ERROR] Discord OAuth Error: ", err);
        return res.status(500).json({ error: true, msg: 'An error occurred during Discord authentication. Please try again later.' });
    }
}

module.exports = signinDiscord;