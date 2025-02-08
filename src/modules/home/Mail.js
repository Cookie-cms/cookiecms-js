import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import readConfig from '../../inc/yamlReader.js';

const config = readConfig();

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: config.smtp.host || 'smtp.gmail.com',
    port: config.smtp.Port || 587,
    secure: config.smtp.SMTPSecure || false,
    auth: {
        user: config.smtp.Username,
        pass: config.smtp.Password
    }
});

/**
 * Send HTML email
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} options.templatePath Path to HTML template
 * @param {Object} [options.variables={}] Template variables
 * @returns {Promise<void>}
 */
export async function sendHtmlEmail({ to, subject, templatePath, variables = {} }) {
    try {
        // Read HTML template
        let html = await readFile(templatePath, 'utf8');
        
        // Replace variables in template
        Object.entries(variables).forEach(([key, value]) => {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });

        // Send mail
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            html
        });
    } catch (error) {
        console.error('Mail send error:', error);
        throw new Error('Failed to send email');
    }
}

// Usage example:
/*
await sendHtmlEmail({
    to: 'user@example.com',
    subject: 'Welcome',
    templatePath: './templates/welcome.html',
    variables: {
        username: 'John',
        date: new Date().toLocaleDateString()
    }
});
*/