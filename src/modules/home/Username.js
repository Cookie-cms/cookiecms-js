import knex from '../../inc/knex.js';
import bcrypt from 'bcrypt';
import logger from '../../logger.js';
import { addaudit } from '../../inc/common.js';


async function validatePassword(userId, password) {
    try {
        const user = await knex('users')
            .where('id', userId)
            .first('password');
            
        if (!user || !user.password) {
            logger.warn(`Password validation failed: User ${userId} not found or no password set`);
            return false;
        }
        
        // Используем try-catch для обработки ошибок bcrypt
        try {
            const isValid = await bcrypt.compare(password, user.password);
            return isValid;
        } catch (cryptError) {
            logger.error(`Bcrypt error: ${cryptError.message}`);
            return false;
        }
    } catch (error) {
        logger.error(`Password validation database error: ${error.message}`);
        return false; // Не бросаем исключение, а возвращаем false
    }
}

async function updateUsername(userId, newUsername, currentPassword) {
    // Проверка пароля
    const isValidPassword = await validatePassword(userId, currentPassword);
    if (!isValidPassword) {
        throw new Error('Invalid password');
    }

    // Проверка на существующее имя пользователя
    const existingUser = await knex('users')
        .where('username', newUsername)
        .whereNot('id', userId)
        .first();
        
    if (existingUser) {
        throw new Error('Username is already taken by another user');
    }

    // Обновление имени пользователя
    await knex('users')
        .where('id', userId)
        .update({ username: newUsername });

    return newUsername;
}

async function username(req, res) {
    try {
        const userId = req.user.sub;
        const { username, password } = req.body;

        // Проверка входных данных
        if (!username || !password) {
            return res.status(400).json({ 
                error: true, 
                msg: 'Missing required fields for updating username' 
            });
        }

        try {
            // Get the old username for audit log
            const user = await knex('users')
                .where('id', userId)
                .first('username');
                
            if (!user) {
                return res.status(404).json({ error: true, msg: 'User not found' });
            }
                
            const oldUsername = user.username;
            
            // Проверяем и обновляем имя пользователя
            await updateUsername(userId, username, password);
            
            // Добавляем аудит только после успешного обновления
            await addaudit(userId, 5, userId, oldUsername, username, 'username');
            
            return res.status(200).json({ 
                error: false, 
                msg: 'Username updated successfully', 
                username: username 
            });
        } catch (updateError) {
            // Возвращаем понятную ошибку пользователю
            if (updateError.message === 'Invalid password') {
                return res.status(401).json({ error: true, msg: 'Invalid password' });
            } else if (updateError.message.includes('already taken')) {
                return res.status(409).json({ error: true, msg: 'Username is already taken' });
            } else {
                throw updateError; // Пробрасываем другие ошибки в общий обработчик
            }
        }
    } catch (err) {
        logger.error("[ERROR] Username update error: ", err);
        return res.status(500).json({ 
            error: true, 
            msg: 'Internal Server Error' // Не возвращаем детали ошибки в production
        });
    }
}

export default username;