const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mysql = require('../../inc/mysql');
const readConfig = require('../../inc/yamlReader');

const config = readConfig(process.env.CONFIG_PATH || '../config.yml');
const JWT_SECRET_KEY = config.securecode;

async function isTokenBlacklisted(connection, token) {
    const [result] = await connection.query("SELECT * FROM blacklisted_jwts WHERE jwt = ?", [token]);
    return result.length > 0;
}

async function blacklistToken(connection, token) {
    await connection.query("INSERT INTO blacklisted_jwts (jwt) VALUES (?)", [token]);
}

async function logout(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(400).json({ error: true, msg: "Authorization header not found" });
    }

    const token = authHeader.replace("Bearer ", "");

    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        const connection = await mysql.getConnection();

        if (await isTokenBlacklisted(connection, token)) {
            connection.release();
            return res.status(400).json({ error: true, msg: "Token has already been blacklisted", url: "/login" });
        }

        await blacklistToken(connection, token);

        connection.release();
        return res.status(200).json({ error: false, msg: "Logout successful, token added to blacklist", url: "/login" });
    } catch (err) {
        console.error("[ERROR] JWT Error: ", err);
        return res.status(400).json({ error: true, msg: "Invalid or expired token", url: "/login" });
    }
};

module.exports = router;