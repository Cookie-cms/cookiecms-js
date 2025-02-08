import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import readConfig from './yamlReader.js';

const config = readConfig();

const transporter = nodemailer.createTransport({
    host: config.smtp.host || 'smtp.gmail.com',
    port: config.smtp.port || 587,
    secure: false,
    auth: {
        user: config.smtp.username,
        pass: config.smtp.password
    }
});

/**
 * Send HTML email with [PLACEHOLDER] format
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} options.templatePath Path to HTML template
 * @param {Object} [options.variables={}] Template variables
 * @returns {Promise<void>}
 */
export async function sendHtmlEmail({ to, subject, templatePath, variables = {} }) {
    try {
        let html = await readFile(templatePath, 'utf8');
        
        // Replace [PLACEHOLDER] format
        Object.entries(variables).forEach(([key, value]) => {
            html = html.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
        });

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

export default sendHtmlEmail;

/* Usage example:
await sendHtmlEmail({
    to: 'user@example.com',
    subject: 'Welcome',
    templatePath: './templates/welcome.html',
    variables: {
        USERNAME: 'John',
        CREATED_DATE: new Date().toLocaleDateString()
    }
});
*/