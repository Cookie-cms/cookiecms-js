import axios from 'axios';
import knex from './knex.js';
import readConfig from './yamlReader.js';
import logger from '../logger.js';

const config = readConfig();

export function createResponse(error = false, msg = '', url = null, data = {}) {
    return {
        error: error,
        msg: msg,
        url: url,
        data: data
    };
}

export async function addaudit(iss, action, forId, oldValue = null, newValue = null, fieldChanged = null, time = null) {
    try {
        // Set current time if not provided
        if (!time) {
            time = Math.floor(Date.now() / 1000);
        }

        // Insert audit log entry
        await knex('audit_log').insert({
            iss: iss,
            action: action,
            target_id: forId,
            old_value: oldValue,
            new_value: newValue,
            field_changed: fieldChanged,
            time: time
        });

        logger.info('Audit entry added successfully');

        // Send audit webhook if enabled
        if (config.AuditSecret?.enabled) {
            
            let description;
            
            switch (action) {
                case 1:
                    description = `New user registered\nUser ID: ${forId}`;
                    break;
                case 2:
                    description = `Password changed\nUser ID: ${forId}`;
                    break;
                case 3:
                    description = `Email confirmed\nUser ID: ${forId}\nEmail: ${newValue}`;
                    break;
                case 4:
                    description = `Registration completed\nUser ID: ${forId}`;
                    break;
                case 5:
                    description = `Username updated\nUser ID: ${forId}\nOld: ${oldValue}\nNew: ${newValue}`;
                    break;
                case 6:
                    description = `Password updated\nUser ID: ${forId}`;
                    break;
                case 7:
                    description = `Email updated\nUser ID: ${forId}\nOld: ${oldValue}\nNew: ${newValue}`;
                    break;
                case 8:
                    description = `Discord unlinked\nUser ID: ${forId}\nDiscord ID: ${oldValue}`;
                    break;
                case 9:
                    description = `Discord linked\nUser ID: ${forId}\nDiscord ID: ${newValue}`;
                    break;
                case 10:
                    description = `Admin updated user\nTarget User ID: ${forId}\nField: ${fieldChanged}\nOld: ${oldValue}\nNew: ${newValue}`;
                    break;
                case 11:
                    description = `User role updated\nTarget User ID: ${forId}\nOld Role: ${oldValue}\nNew Role: ${newValue}`;
                    break;
                default:
                    description = `Action: ${action}\nUser: ${iss}\nTarget: ${forId}\nField Changed: ${fieldChanged}\nOld Value: ${oldValue}\nNew Value: ${newValue}`;
            }

            description += `\nTime: ${new Date(time * 1000).toLocaleString()}`;

            const embed = {
                title: action,
                description,
                color: 11624960,
                footer: {
                    text: "CookieCMS",
                    icon_url: "https://avatars.githubusercontent.com/u/152858724?s=200&v=4"
                }
            };

            const data = { embeds: [embed] };
            const auditUrl = `${config.AuditSecret.url}`;
            await axios.post(auditUrl, data);
            logger.info('Audit notification sent.');
        }
    } catch (err) {
        logger.error('Error adding audit entry or sending notification:', err);
        throw err; // Re-throw to handle in calling function
    }
}

export async function checkPermission(userId, permission) {
    if (!userId || !permission) return false;
    
    const userPerms = await knex('users')
        .where({ id: userId })
        .select('perms')
        .first();

    if (!userPerms) return false;

    const permLevel = userPerms.perms;
    let allPermissions = [];

    // Combine all permissions from lower levels up to user's level
    for (let level = 0; level <= permLevel; level++) {
        const levelPermissions = config.permissions[level] || [];
        allPermissions = [...allPermissions, ...levelPermissions];
    }

    return allPermissions.includes(permission);
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

export default {
    createResponse,
    addaudit,
    checkPermission,
    addNewTask,
    sendEmbed
};