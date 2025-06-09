import axios from 'axios';
import knex from './knex.js';
import logger from '../logger.js';
import bcrypt from 'bcrypt';
import argon2 from 'argon2';

import dotenv from 'dotenv';

dotenv.config();

export function createResponse(error = false,msg = '', url = null, data = {}) {
    return {
        error: error,
        msg: msg,
        url: url,
        data: data
    };
}

export async function addaudit(iss, action, forId, oldValue = null, newValue = null, fieldChanged = null, time = null) {
    // try {
    //     if (!time) {
    //         time = Math.floor(Date.now() / 1000);
    //     }

    //     // Helper: для числовых полей всегда возвращать число или null
    //     const safeInt = (v) => {
    //         if (v === null || v === undefined) return null;
    //         if (typeof v === 'object' && v !== null) {
    //             if ('id' in v) return Number(v.id) || null;
    //             return null;
    //         }
    //         return Number(v) || null;
    //     };
    //     // Для текстовых полей
    //     const safeText = (v) => {
    //         if (v === null || v === undefined) return null;
    //         if (typeof v === 'object') return JSON.stringify(v);
    //         return String(v);
    //     };

    //     await knex('audit_log').insert({
    //         iss: safeInt(iss),
    //         action: safeInt(action),
    //         target_id: safeInt(forId),
    //         old_value: oldValue === null ? null : safeText(oldValue),
    //         new_value: newValue === null ? null : safeText(newValue),
    //         field_changed: fieldChanged === null ? null : safeText(fieldChanged),
    //         time: safeInt(time)
    //     });

    //     logger.info('Audit entry added successfully');

    //     // Send audit webhook if enabled
    //     if (config.AuditSecret?.enabled) {
            
    //         let description;
            
    //         switch (action) {
    //             case 1:
    //                 description = `New user registered\nUser ID: ${forId}`;
    //                 break;
    //             case 2:
    //                 description = `Password changed\nUser ID: ${forId}`;
    //                 break;
    //             case 3:
    //                 description = `Email confirmed\nUser ID: ${forId}\nEmail: ${newValue}`;
    //                 break;
    //             case 4:
    //                 description = `Registration completed\nUser ID: ${forId}`;
    //                 break;
    //             case 5:
    //                 description = `Username updated\nUser ID: ${forId}\nOld: ${oldValue}\nNew: ${newValue}`;
    //                 break;
    //             case 6:
    //                 description = `Password updated\nUser ID: ${forId}`;
    //                 break;
    //             case 7:
    //                 description = `Email updated\nUser ID: ${forId}\nOld: ${oldValue}\nNew: ${newValue}`;
    //                 break;
    //             case 8:
    //                 description = `Discord unlinked\nUser ID: ${forId}\nDiscord ID: ${oldValue}`;
    //                 break;
    //             case 9:
    //                 description = `Discord linked\nUser ID: ${forId}\nDiscord ID: ${newValue}`;
    //                 break;
    //             case 10:
    //                 description = `Admin updated user\nTarget User ID: ${forId}\nField: ${fieldChanged}\nOld: ${oldValue}\nNew: ${newValue}`;
    //                 break;
    //             case 11:
    //                 description = `User role updated\nTarget User ID: ${forId}\nOld Role: ${oldValue}\nNew Role: ${newValue}`;
    //                 break;
    //             default:
    //                 description = `Action: ${action}\nUser: ${iss}\nTarget: ${forId}\nField Changed: ${fieldChanged}\nOld Value: ${oldValue}\nNew Value: ${newValue}`;
    //         }

    //         description += `\nTime: ${new Date(time * 1000).toLocaleString()}`;

    //         const embed = {
    //             title: action,
    //             description,
    //             color: 11624960,
    //             footer: {
    //                 text: "CookieCMS",
    //                 icon_url: "https://avatars.githubusercontent.com/u/152858724?s=200&v=4"
    //             }
    //         };

    //         const data = { embeds: [embed] };
    //         const auditUrl = `${config.AuditSecret.url}`;
    //         await axios.post(auditUrl, data);
    //         logger.info('Audit notification sent.');
    //     }
    // } catch (err) {
    //     logger.error('Error adding audit entry or sending notification:', err);
    //     throw err; // Re-throw to handle in calling function
    // }
}

export async function checkPermission(userId, permission) {
    if (!userId || !permission) return false;
    
    // Добавляем дебаг-информацию в начале
    console.log(`[PERMISSION CHECK] Checking permission "${permission}" for user ID: ${userId}`);
    
    try {
        // 1. Проверяем индивидуальные разрешения пользователя (они имеют приоритет)
        const userPerm = await knex('user_permissions as up')
            .join('permissions as p', 'up.permission_id', 'p.id')
            .where('up.user_id', userId)
            .where('p.name', permission)
            .where(function() {
                this.whereNull('up.expires_at')
                    .orWhere('up.expires_at', '>', new Date());
            })
            .select('up.granted')
            .first();
        
        // Если есть индивидуальное разрешение, возвращаем его значение (granted)
        if (userPerm) {
            logger.debug(`[PERMISSION CHECK] User ID ${userId} has individual permission "${permission}" with granted=${userPerm.granted}`);
            return userPerm.granted;
        }
        
        // 2. Если нет индивидуального разрешения, проверяем группу пользователя
        const user = await knex('users')
            .select('permission_group_id', 'username') // Добавляем username для логирования
            .where('id', userId)
            .first();
            
        if (!user || !user.permission_group_id) {
            logger.debug(`[PERMISSION CHECK] User ID ${userId} not found or has no permission group`);
            return false; // Пользователь не найден или не имеет группы
        }
        
        // Получаем группу пользователя и её уровень
        const group = await knex('permissions_groups')
            .where('id', user.permission_group_id)
            .select('level', 'name') // Добавляем name для логирования
            .first();
            
        if (!group) {
            logger.debug(`[PERMISSION CHECK] Group ID ${user.permission_group_id} for user ID ${userId} not found`);
            return false; // Группа не найдена
        }
        
        logger.debug(`[PERMISSION CHECK] User ID ${userId} (${user.username}) has group "${group.name}" (level: ${group.level})`);
        
        // 3. Ищем разрешение в группе пользователя
        const hasPermission = await knex('permission_group_relations as pgr')
            .join('permissions as p', 'pgr.permission_id', 'p.id')
            .where('p.name', permission)
            .where('pgr.group_id', user.permission_group_id)
            .first();
            
        const result = !!hasPermission;
        logger.debug(`[PERMISSION CHECK] Permission "${permission}" for user ID ${userId} in group ${group.name}: ${result ? 'GRANTED' : 'DENIED'}`);
        
        return result;
        
    } catch (error) {
        logger.error(`[PERMISSION CHECK] Error checking permission "${permission}" for user ID ${userId}: ${error.message}`);
        return false; // В случае ошибки возвращаем false для безопасности
    }
}
export async function addNewTask(task, userId, value, time, removeold = false) {
    try {
        // Use transaction to ensure data consistency
        await knex.transaction(async (trx) => {
            if (removeold === true) {
                await trx('cron_tasks')
                    .where({ userId: userId })
                    .delete();
            }
            
            const runAt = new Date(time * 1000); // Convert UNIX time to date
            
            await trx('cron_tasks').insert({
                run_at: runAt,
                type: task,
                target: userId,
                update_value: value
            });
        });
        
        return { success: true };
    } catch (error) {
        logger.error("Error adding task to cron_tasks:", error);
        return { success: false, error: error.message };
    }
}

export async function sendEmbed(mail) {
    const time = new Date().toLocaleString();
    if (config.AuditSecret?.enabled) {
        // Prepare the payload
        const embed = {
            "title": "New User Registered",
            "description": `mail ${mail}\ntime ${time}`,
            "color": 11624960,
            "footer": {
                "text": "Cookiecms",
                "icon_url": "https://avatars.githubusercontent.com/u/152858724?s=200&v=4"
            }
        };
        
        const data = { embeds: [embed] };
        
        const spamming = config.AuditSecret.spamming;
        logger.info(`Spamming: ${spamming}`);    
        
        const auditUrl = `${config.AuditSecret.url}?thread_id=${spamming}`;
        await axios.post(auditUrl, data);
    } else {
        logger.info("Audit not enabled");
    }
}

export async function verifyPassword(password, hash) {
  if (hash.startsWith('$2')) {
    // bcrypt
    return await bcrypt.compare(password, hash, );
  }
  if (hash.startsWith('$argon2id')) {
    // argon2
    return await argon2.verify(hash, password);
  }
  throw new Error('Unknown hash algorithm!');
}

export async function hashPassword(password) {
  if (process.env.PASSCRYPT_TYPE === 'bcrypt') {
    return await bcrypt.hash(password, process.env.PASSCRYPT_ROUNDS || 10);
  } else if (process.env.PASSCRYPT_TYPE === 'argon2') {
    return await argon2.hash(password);
  } else {
    throw new Error('Unknown hash algorithm');
  }
}

export default {
    createResponse,
    addaudit,
    checkPermission,
    addNewTask,
    sendEmbed,
    verifyPassword,
    hashPassword
};