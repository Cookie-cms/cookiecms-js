



async function welcomemail(mail, createdate, accoundid, logo) {
    await sendHtmlEmail({
        to: mail,
        subject: 'Welcome',
        templatePath: './templates/welcome.html',
        variables: {
            mail: mail,
            date: createdate,
            accountid: accoundid,
            logo: logo
        }
    });
}

