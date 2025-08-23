import sendHtmlEmail from '../src/inc/mail.js';
import path from 'path';

async function testSendMail() {
  const to = 'test@example.com';
  const subject = 'Test Email';
  const templatePath = path.resolve('src/modules/mail/welcome.html');
  const variables = { ACCOUNT_ID: 'Misha', CREATED_DATE: '123456' };

  try {
    const result = await sendHtmlEmail({ to, subject, templatePath, variables });
    console.log('Email sent!');
    if (result?.url) {
      console.log('Preview URL:', result.url);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

testSendMail();