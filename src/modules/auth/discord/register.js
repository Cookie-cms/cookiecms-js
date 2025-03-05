import mysql from '../../inc/mysql.js';

function generateToken(userId) {
    return jwt.sign(
        {
            iss: config.NameSite,
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
        },
        config.securecode,
        { algorithm: 'HS256' }
    );
}

async function registerUser(userResponse, res) {
    const token = userResponse.headers['authorization'] ? userResponse.headers['authorization'].replace('Bearer ', '') : '';

    try {
        const connection = await mysql.getConnection();
        const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
    
        const [[existingUser]] = await connection.query(
            "SELECT id FROM users WHERE dsid = ?",
            [userResponse.id]
        );

        const randomCode = Math.floor(Math.random() * 99) + 1;
        const timexp = Math.floor(Date.now() / 1000) + 3600;
        
        const [[discordInfo]] = await connection.query(
            "SELECT * FROM discord WHERE userid = ?",
            [userResponse.id]
        );

        if (discordInfo) {
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
        } else {
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
        }
        connection.release();

        if (token) {
            const status = await isJwtExpiredOrBlacklisted(token, connection, JWT_SECRET_KEY);
            if (status.valid) {
                // Update user's Discord connection
                await connection.query(
                    "UPDATE users SET dsid = ? WHERE id = ?",
                    [userResponse.id, status.data.sub]
                );

                // Insert Discord info
                const [[discordInfo]] = await connection.query(
                    "SELECT * FROM discord WHERE userid = ?",
                    [userResponse.id]
                );

                if (!discordInfo) {
                    await connection.query(
                        `INSERT INTO discord (avatar_cache, name_gb, expire, mail, userid) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            userResponse.avatar,
                            userResponse.username,
                            Math.floor(Date.now() / 1000) + 3600,
                            userResponse.email || null,
                            userResponse.id,
                        ]
                    );
                }

                // Add audit log
                await addaudit(connection, status.data.sub, 9, status.data.sub, null, userResponse.id, 'dsid');
                
                connection.release();
                res.status(200).json(createResponse(false, 'Successfully connected account', "/home"));
            }
        }

        if (existingUser) {
            const userData = {
                jwt: generateToken(existingUser.id),
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(200).json(createResponse(false, 'Successfully logged in', "/home", userData));
        } else {
            const registerData = {
                userid: userResponse.id,
                username: userResponse.username,
                avatar: userResponse.avatar,
                conn_id: randomCode,
            };
            res.status(404).json(createResponse(true, 'User not found, do you want to create or link?', "/home", registerData));
        }
    } catch (error) {
        logger.error('Error during user registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default registerUser;