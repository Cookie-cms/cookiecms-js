import { sendHtmlEmail } from '../modules/mail.js';

async function sendVerificationEmail(mail, username, verificationCode, verificationLink, logoUrl) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Email Verification',
        templatePath: './src/modules/mail/emailVerification.html',
        variables: {
            USER_NAME: username,
            YOUR_VERIFICATION_CODE: verificationCode,
            LINK: verificationLink,
            VERIFICATION_PAGE_LINK: verificationLink,
            logoimg: logoUrl
        }
    });
}

async function sendDiscordUnlinkNotification(mail, dateTime, logoUrl) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Discord Account Unlinking Request',
        templatePath: './src/modules/mail/3.html',
        variables: {
            MAIL: mail,
            DATE_TIME: new Date(dateTime).toLocaleString(),
            logoimg: logoUrl
        }
    });
}

async function sendPromotion(mail, expiryDate, redemptionLink) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Exclusive Promotion',
        templatePath: './src/modules/mail/6.html',
        variables: {
            EXPIRY_DATE: expiryDate,
            REDEMPTION_LINK: redemptionLink
        }
    });
}

async function sendAlert(mail, reason, supportLink) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Important Alert',
        templatePath: './src/modules/mail/7.html',
        variables: {
            REASON: reason,
            SUPPORT_LINK: supportLink
        }
    });
}

async function sendMailUnlinkNotification(mail, username, dateTime, logoUrl) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Mail Account Unlinking Request',
        templatePath: './src/modules/mail/unlinking.html',
        variables: {
            USER_NAME: username,
            DATE_TIME: new Date(dateTime).toLocaleString(),
            logoimg: logoUrl
        }
    });
}

export {
    sendVerificationEmail,
    sendDiscordUnlinkNotification,
    sendPromotion,
    sendAlert,
    sendMailUnlinkNotification
};