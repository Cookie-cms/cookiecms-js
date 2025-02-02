import axios from 'axios';
import readConfig from './yamlReader.js';

const config = readConfig();


function createResponse(error = false, msg = '', url = null, data = {}) {
    return {
        error: error,
        msg: msg,
        url: url,
        data: data
    };
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


export default createResponse;