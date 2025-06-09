import knex from '../../inc/knex.js';
import { isJwtExpiredOrBlacklisted } from '../../inc/jwtHelper.js';
import { checkPermission } from '../../inc/common.js';
import logger from '../../logger.js';
import { addaudit } from '../../inc/common.js';

import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET_KEY = process.env.SECURE_CODE;

export async function user_udp(req, res) {
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : '';
    if (!token) {
        return res.status(401).json({ error: true, msg: 'Invalid JWT', code: 401 });
    }
    
    try {
        const status = await isJwtExpiredOrBlacklisted(token, JWT_SECRET_KEY);

        if (!status.valid) {
            return res.status(401).json({ error: true, msg: status.message, code: 401 });
        }
    
        if (!await checkPermission(status.data.sub, 'admin.useredit')) {
            return res.status(403).json({ error: true, msg: 'Insufficient permissions' });
        }

        const { id } = req.params;
        const updateData = req.body;

        // Validate id
        if (!id) {
            return res.status(400).json({ error: true, msg: 'User id is required' });
        }

        // Получаем текущие данные пользователя для сравнения
        const currentUser = await knex('users').where('id', id).first();
        if (!currentUser) {
            return res.status(404).json({ error: true, msg: 'User not found' });
        }

        // Получаем текущие плащи пользователя
        const currentCapes = await knex('cloaks_users')
            .where('uid', id)
            .select('cloak_id');
        
        const currentCapeIds = currentCapes.map(cape => cape.cloak_id);

        // Получаем текущий выбранный скин (из таблицы skin_user, если есть)
        const currentSkinUser = await knex('skin_user')
            .where('uid', id)
            .first('skin_id');
        
        // Достаем новый выбранный скин из данных запроса
        const newSelectedSkin = updateData.Selected_Skin;

        // На основе схемы из миграции, создаем маппинг полей
        const fieldMapping = {
            'Username': 'username',
            'Mail': 'mail',
            'Mail_verify': 'mail_verify',
            'PermLvl': 'perms', // В миграции используется 'perms'
        };

        // Преобразуем данные запроса в подходящий формат для БД
        const filteredUpdateData = {};
        
        for (const [key, value] of Object.entries(updateData)) {
            // Если есть в маппинге - используем соответствующее имя поля
            // Пропускаем поля Selected_Skin и Selected_Cape, т.к. они в других таблицах
            if (fieldMapping[key] && key !== 'Selected_Skin' && key !== 'Selected_Cape') {
                filteredUpdateData[fieldMapping[key]] = value;
            }
        }

        // Особая обработка Discord объекта
        if (updateData.Discord && typeof updateData.Discord === 'object' && updateData.Discord.userid) {
            filteredUpdateData.dsid = updateData.Discord.userid;
        }

        // Обработка плащей (Capes)
        const newCapes = updateData.Capes || [];
        const newCapeIds = newCapes.map(cape => cape.Id);
        
        // Проверяем, есть ли данные для обновления
        const hasDataToUpdate = 
            Object.keys(filteredUpdateData).length > 0 || 
            !arraysEqual(currentCapeIds, newCapeIds) ||
            (newSelectedSkin && (!currentSkinUser || currentSkinUser.skin_id !== newSelectedSkin));

        if (!hasDataToUpdate) {
            return res.status(400).json({ error: true, msg: 'No valid fields to update' });
        }

        // Начинаем транзакцию для обновления всех данных
        await knex.transaction(async (trx) => {
            // Обновляем основные данные пользователя
            if (Object.keys(filteredUpdateData).length > 0) {
                await trx('users')
                    .where('id', id)
                    .update(filteredUpdateData);
                
                logger.debug(`Updated user ${id} data: ${JSON.stringify(filteredUpdateData)}`);
            }
            
            // Обновляем выбранный скин (через таблицу skin_user)
            if (newSelectedSkin) {
                if (currentSkinUser) {
                    // Если есть запись - обновляем
                    await trx('skin_user')
                        .where('uid', id)
                        .update({ skin_id: newSelectedSkin });
                    
                    logger.debug(`Updated user ${id} selected skin to: ${newSelectedSkin}`);
                } else {
                    // Если записи нет - добавляем
                    await trx('skin_user').insert({
                        uid: id,
                        skin_id: newSelectedSkin
                    });
                    
                    logger.debug(`Set new selected skin for user ${id}: ${newSelectedSkin}`);
                }
            }
            
            // Обновляем плащи пользователя - только добавляем новые плащи в библиотеку
            if (newCapeIds.length > 0) {
                // Находим только те плащи, которых нет у пользователя
                const capesToAdd = newCapeIds.filter(capeId => !currentCapeIds.includes(capeId));
                
                if (capesToAdd.length > 0) {
                    logger.debug(`Adding capes to user ${id}: ${JSON.stringify(capesToAdd)}`);
                    
                    const insertRows = capesToAdd.map(capeId => ({
                        uid: id,
                        cloak_id: capeId
                    }));
                    
                    await trx('cloaks_users').insert(insertRows);
                    logger.debug(`Added ${capesToAdd.length} new capes to user library`);
                }
            }
            
            // Добавляем запись в аудит, если изменен уровень прав
            if (filteredUpdateData.perms !== undefined && 
                filteredUpdateData.perms !== currentUser.perms) {
                
                await addaudit(
                    status.data.sub,        // кто изменил
                    11,                     // код действия (смена роли)
                    id,                     // для кого изменение
                    currentUser.perms,      // старое значение
                    filteredUpdateData.perms, // новое значение
                    'permissions_group'     // какое поле изменено
                );
            }
        });

        return res.json({
            error: false,
            msg: 'User updated successfully'
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        logger.error(error.stack); // Для полного стека ошибки
        return res.status(500).json({ error: true, msg: 'Internal server error' });
    }
}

// Вспомогательная функция для сравнения массивов
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    for (let i = 0; i < sortedA.length; i++) {
        if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
}

export default user_udp;