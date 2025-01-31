const mysql = require('mysql');
const readConfig = require('./yamlReader');
const config = readConfig('../config.yml');

const pool = mysql.createPool({
    host: config.database.host,
    user: config.database.username,
    password: config.database.pass,
    database: config.database.db,
    port: config.database.port
});

module.exports = pool;