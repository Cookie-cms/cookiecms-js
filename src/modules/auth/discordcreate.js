import pool from '../../inc/mysql.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import readConfig from '../../inc/yamlReader.js';
import logger from '../../logger.js';
import sendEmbed from '../../inc/_common.js';
import { generateJwtToken } from '../../inc/jwtHelper.js';

const config = readConfig();

function validate(data) {
    data = data.trim();
    data = data.replace(/<[^>]*>?/gm, '');
    return data;
}

export async function discordcreate(req, res) {
    const { meta = {id, conn_id} } = req.body;

    if (!meta.id || !meta.conn_id) {
        return res.status(400).json({ error: true, msg: "Incomplete form data provided." });
    }

    try {
        const connection = await pool.getConnection();        
        const JWT_SECRET_KEY = config.securecode;

        // const [existingUser] = await connection.query("SELECT * FROM users WHERE BINARY mail = ?", [validatedMail]);

        // if (existingUser.length > 0) {
        //     connection.release();
        //     return res.status(409).json({ error: true, msg: "Email is already registered." });
        // }

        const [discord_link] = await connection.query("SELECT * FROM discord WHERE userid = ?", [meta.id]);
        // console.log('Discord:', discord_link[0].conn_id, 'Meta:', meta.conn_id, 'Discord:', discord_link);
        if (discord_link.length === 0 || discord_link[0].conn_id !== meta.conn_id) {
            console.log('Discord:', discord_link[0].conn_id, 'Meta:', conn_id, 'Discord:', discord_link);
            connection.release();
            return res.status(404).json({ error: true, msg: 'Account cannot be connected' });
        }
        // console.log('Discord:', discord_link[0].mail);
        if (discord_link[0].mail) {
            console.log('Discord:', discord_link[0].mail);
            await connection.query("INSERT INTO users (dsid, mail, mail_verify) VALUES (?, ?, ?, 1)", [meta.id, discord_link[0].mail]);            
        } else {
            await connection.query("INSERT INTO users (dsid) VALUES (?, ?)", [meta.id]);
        }
        const token = generateJwtToken(userID, JWT_SECRET_KEY);

        connection.release();
        return res.status(200).json({ 
            error: false, 
            msg: "Registration successful", 
            url: "/home",  // Optional redirect URL
            data: {
            jwt: token  // The JWT token for authenticated requests
            }
        });
    } catch (err) {
        console.error("[ERROR] MySQL Error: ", err);
        return res.status(500).json({ error: true, msg: "An error occurred during registration. Please try again later." });
    }
}

export default discordcreate;