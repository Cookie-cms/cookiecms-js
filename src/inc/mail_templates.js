import sendHtmlEmail from './mail.js';

async function sendVerificationEmail(mail, verificationCode, verificationLink, logoUrl) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Email Verification',
        templatePath: './src/modules/mail/emailVerification.html',
        variables: {
            MAIL: mail,
            YOUR_VERIFICATION_CODE: verificationCode,
            LINK: "http://localhost:3000/confirm?code=" + verificationCode,
            VERIFICATION_PAGE_LINK: "http://localhost:3000/confirm",
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

async function sendMailUnlinkNotification(old_mail) {
    const mail = old_mail;
    console.info('Old mail:', mail);

    // Ensure mail is a string
    const emailAddress = typeof mail === 'string' ? mail : mail[0].mail;

    console.info('Sending mail unlink notification to:', emailAddress);

    await sendHtmlEmail({
        to: emailAddress,
        subject: 'Mail Account Unlinking Request',
        templatePath: './src/modules/mail/unlinking.html',
        variables: {
            USER_NAME: emailAddress,
        }
    });
}
async function sendWelcomeEmail(mail, accountId, logoUrl) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Welcome to Our Community!',
        templatePath: './src/modules/mail/welcome.html',
        variables: {
            MAIL: mail,
            ACCOUNT_ID: accountId,
            CREATED_DATE: new Date().toLocaleString(),
            logoimg: logoUrl
        }
    });
}
export {
    sendVerificationEmail,
    sendDiscordUnlinkNotification,
    sendPromotion,
    sendAlert,
    sendMailUnlinkNotification,
    sendWelcomeEmail
};