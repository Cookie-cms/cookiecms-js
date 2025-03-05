import mysql from 'mysql2/promise';
import readConfig from './yamlReader.js';

const config = readConfig();

const pool = mysql.createPool({
    host: config.database.host,
    user: config.database.username,
    password: config.database.pass,
    database: config.database.db,
    port: config.database.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export default pool;