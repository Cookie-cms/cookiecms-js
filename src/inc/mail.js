import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import readConfig from '../inc/yamlReader.js';

const config = readConfig();

const transporter = nodemailer.createTransport({
    host: config.smtp.Host,
    port: config.smtp.Port,
    secure: config.smtp.Secure, // true for 465, false for other ports
    auth: {
        user: config.smtp.Username,
        pass: config.smtp.Password
    }
});

async function sendHtmlEmail({ to, subject, templatePath, variables }) {
    try {
        console.log('Sending email to:', to);
        console.log('Email subject:', subject);
        console.log('Template path:', templatePath);
        console.log('Variables:', variables);

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