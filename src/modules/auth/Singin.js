const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('../../inc/mysql');
const readConfig = require('../../inc/yamlReader');

const config = readConfig(process.env.CONFIG_PATH || '../config.yml');
const JWT_SECRET_KEY = config.securecode;

async function loginDiscord(mail) {
    const connection = await mysql.getConnection();

    const [user] = await connection.query("SELECT * FROM users WHERE BINARY mail = ?", [mail]);

    if (!user.length) {
        connection.release();
        return { error: true, msg: 'User not found' };
    }

    if (user[0].mail_verify === 0) {
        connection.release();
        return { error: true, msg: 'Please verify your mail' };
    }

    const payload = {
        iss: config.NameSite,
        sub: user[0].id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
    };

    try {
        const token = jwt.sign(payload, JWT_SECRET_KEY, { algorithm: 'HS256' });

        connection.release();
        return {
            error: false,
            msg: 'Login successful',
            url: '/home',
            data: { jwt: token }
        };
    } catch (err) {
        console.error("[ERROR] JWT Error: ", err);
        connection.release();
        return { error: true, msg: 'JWT Error' };
    }
}

module.exports = loginDiscord;