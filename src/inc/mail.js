import nodemailer from 'nodemailer';
import logger from '../logger.js';
import { readFile } from 'fs/promises';

import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
    }
});

async function sendHtmlEmail({ to, subject, templatePath, variables }) {
    try {
        logger.debug('Sending email to:', to);
        logger.debug('Email subject:', subject);
        logger.debug('Template path:', templatePath);
        logger.debug('Variables:', variables);

        // Read HTML template
        let html = await readFile(templatePath, 'utf8');
        
        // Replace variables in template
        Object.entries(variables).forEach(([key, value]) => {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });

        // Send mail
        const info = await transporter.sendMail({
            from: {
                name: 'Noreply',
                address: process.env.SMTP_USERNAME
            },
            to,
            subject,
            html
        });

        return { url: nodemailer.getTestMessageUrl(info) };

    } catch (error) {
        logger.error('Mail send error:', error);
        throw new Error('Failed to send email');
    }
}

export default sendHtmlEmail;