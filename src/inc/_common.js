import axios from 'axios';
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

export async function addaudit(connection, iss, action, forId, oldValue = null, newValue = null, fieldChanged = null, time = null) {
    try {
        // Если время не передано, устанавливаем текущее время
        if (!time) {
            time = Math.floor(Date.now() / 1000); // UNIX timestamp
        }

        // SQL-запрос для добавления записи в таблицу аудита
        const query = `
            INSERT INTO audit_log (iss, action, target_id, old_value, new_value, field_changed, time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        // Параметры для предотвращения SQL-инъекций
        const values = [iss, action, forId, oldValue, newValue, fieldChanged, time];

        // Выполнение запроса с использованием Promises для асинхронного кода
        const [results] = await connection.promise().query(query, values);
        logger.info('Audit entry added successfully:', results);

        // Если аудит включен, отправляем уведомление
        if (config.AuditSecret.enabled == true) {
            const embed = {
                title: action.charAt(0).toUpperCase() + action.slice(1),
                description: `Action: ${action}\nUser: ${iss}\nTarget: ${forId}\nField Changed: ${fieldChanged}\nOld Value: ${oldValue}\nNew Value: ${newValue}\nTime: ${new Date(time * 1000).toLocaleString()}`,
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
    }
}


// function sendEmbed(mail) {
//     const time = new Date().toLocaleString();
//     if (config.AuditSecret.enabled) {
//         // Prepare the payload
//        const time = new Date().toLocaleString();
//        const embed = {
//        "title": "New User Registered",
//        description: `mail ${mail}\ntime ${time}`, // Use template literals to insert values
//        "color": 11624960,
//        "footer": {
//            "text": "Cookiecms",
//            "icon_url": "https://avatars.githubusercontent.com/u/152858724?s=200&v=4"
//        }
//        };
//        const data = {
//            embeds: [embed]
//        };
//        const spamming = config.AuditSecret.spamming;
//        logger.info(`Spamming: ${spamming}`);    
//        const auditUrl = `${config.AuditSecret.url}?thread_id=${spamming}`;

//        axios.post(auditUrl, data)
//    } else {
//          logger.info("Audit not enabled");
//     }
// }


export default {
    createResponse,
    addaudit,
    // sendEmbed
};