import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mysql from '../../inc/mysql.js';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';


const config = readConfig();
const JWT_SECRET_KEY = config.securecode;

// logger.info('SEC', JWT_SECRET_KEY);


function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

function isEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

async function login(req, res) {
    const { username, password, meta } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: true, msg: 'Username or password not provided' });
    }

    const validatedUsername = validate(username);
    const validatedPassword = validate(password);

    try {
        const connection = await mysql.getConnection();

        let query;
        let params;
        if (isEmail(validatedUsername)) {
            query = "SELECT * FROM users WHERE BINARY mail = ?";
            params = [validatedUsername];
        } else {
            query = "SELECT * FROM users WHERE BINARY username = ?";
            params = [validatedUsername];
        }

        const [user] = await connection.query(query, params);

        if (!user.length) {
            connection.release();
            return res.status(403).json({ error: true, msg: 'Incorrect username or password' });
        }

        if (user[0].mail_verify === 0) {
            connection.release();
            return res.status(403).json({ error: true, msg: 'Please verify your mail' });
        }

        const passwordMatch = await bcrypt.compare(validatedPassword, user[0].password);

        
        if (passwordMatch) {
            if (meta) {

                if (!meta.id || !meta.conn_id) {
                    return res.status(400).json({ error: true, msg: 'id or conn_id not provided' });
                }

                    // Step 1: Verify if this game account is not already connected to another Discord account
                const query = "SELECT dsid FROM users WHERE id = ?";
                const [discord] = await connection.query(query, [user[0].id]);

                if (discord.length > 0 && discord[0].dsid && discord[0].dsid !== meta.id) {
                    console.log('Discord:', discord[0].dsid, 'Meta:', meta.id);
                    connection.release();
                    return res.status(403).json({ error: true, msg: 'This game account is already linked to another Discord account' });
                }
    

                // Step 2: Check if the conn_id matches
                const [discord_link] = await connection.query("SELECT * FROM discord WHERE userid = ?", [meta.id]);
                if (discord_link.length === 0 || discord_link[0].conn_id !== meta.conn_id) {
                    console.log('Discord:', discord_link[0].conn_id, 'Meta:', conn_id, 'Discord:', discord_link);
                    connection.release();
                    return res.status(404).json({ error: true, msg: 'Account cannot be connected' });
                }

                // Step 3: Update the MySQL database
                await connection.query("UPDATE users SET dsid = ? WHERE id = ?", [meta.id, user[0].id]);

            }
    
            const payload = {
                iss: config.NameSite,
                sub: user[0].id,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };
            console.log('Payload:', );

            try {
                const userId = user[0].id;
                const token = generateJwtToken(userId, JWT_SECRET_KEY);

                connection.release();
                return res.status(200).json({
                    error: false,
                    msg: 'Login successful',
                    url: '/home',
                    data: { jwt: token }
                });
            } catch (err) {
                console.error("[ERROR] JWT Error: ", err);
                connection.release();
                return res.status(500).json({ error: true, msg: 'JWT Error' });
            }
        } else {
            connection.release();
            return res.status(400).json({ error: true, msg: 'Incorrect username or password' });
        }
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: 'Database Error' });
    }
}

export default login;