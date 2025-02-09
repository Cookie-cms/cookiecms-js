import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import readConfig from '../inc/yamlReader.js';

const config = readConfig();

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.smtp.Host,
  port: config.smtp.Port,  // Port (465 for SSL)
  secure: config.smtp.SMTPSecure,  // Secure should be true for SSL
  auth: {
    user: config.smtp.Username,
    pass: config.smtp.Password,
  },
  socketTimeout: 5000,  // Optional: Increase socket timeout if needed
});

/**
 * Send HTML email
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} optihiyons.templatePath Path to HTML template
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
            from: {
                name: 'Noreply', // Display name
                address: config.smtp.Username
            },            
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

