import fs from 'fs/promises';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import path from 'path';
import crypto from 'crypto';

const configPath = path.join(__dirname, '../src/config.yml');

function generateSECURE_CODE(length = 64) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

async function createDirectories() {
    const directories = [
        'uploads/skins/',
        'uploads/capes/'
    ];

    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.info(`Directory ${dir} created.`);
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    }
}

async function runDbInit() {
    return new Promise((resolve, reject) => {
        exec('npm run db:init', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error running db:init: ${error.message}`);
                return reject(error);
            }
            if (stderr) {
                console.error(`db:init stderr: ${stderr}`);
                return reject(new Error(stderr));
            }
            console.info(`db:init stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

async function initConfig() {
    const questions = [
        {
            type: 'input',
            name: 'NameSite',
            message: 'Enter the site name:',
            default: 'cookiecms'
        },
        {
            type: 'input',
            name: 'MaxSavedSkins',
            message: 'Enter the max saved skins:',
            default: 1
        },
        {
            type: 'input',
            name: 'domain',
            message: 'Enter the domain:',
            default: 'http://localhost:3000'
        },
        {
            type: 'input',
            name: 'production',
            message: 'Enter the production mode:',
            default: 'demo'
        },
        {
            type: 'input',
            name: 'smtp.Host',
            message: 'Enter the SMTP host:',
            default: 'mail.coffeedev.dev'
        },
        {
            type: 'input',
            name: 'smtp.Username',
            message: 'Enter the SMTP username:',
            default: 'noreply@coffeedev.dev'
        },
        {
            type: 'password',
            name: 'smtp.Password',
            message: 'Enter the SMTP password:',
            default: '45,chESIo,='
        },
        {
            type: 'confirm',
            name: 'smtp.SMTPSecure',
            message: 'Use SMTP secure (SSL)?',
            default: true
        },
        {
            type: 'input',
            name: 'smtp.Port',
            message: 'Enter the SMTP port:',
            default: 465
        },
        {
            type: 'input',
            name: 'database.host',
            message: 'Enter the database host:',
            default: 'localhost'
        },
        {
            type: 'input',
            name: 'database.user',
            message: 'Enter the database user:',
            default: 'root'
        },
        {
            type: 'password',
            name: 'database.password',
            message: 'Enter the database password:',
            default: 'password'
        },
        {
            type: 'input',
            name: 'database.database',
            message: 'Enter the database name:',
            default: 'cookiecms'
        },
        {
            type: 'input',
            name: 'database.port',
            message: 'Enter the database port:',
            default: 3306
        },
        {
            type: 'confirm',
            name: 'discord.enabled',
            message: 'Enable Discord integration?',
            default: true
        },
        {
            type: 'input',
            name: 'discord.client_id',
            message: 'Enter the Discord client ID:',
        },
        {
            type: 'input',
            name: 'discord.secret_id',
            message: 'Enter the Discord client secret:',
        },
        {
            type: 'input',
            name: 'discord.redirect_url',
            message: 'Enter the Discord redirect URL:',
            default: 'http://localhost:3000/callback'
        },
        {
            type: 'input',
            name: 'discord.bot',
            message: 'Enter the Discord bot token:',
            default: ''
        },
        {
            type: 'input',
            name: 'discord.guild_id',
            message: 'Enter the Discord guild ID:',
            default: 0
        },
        {
            type: 'input',
            name: 'discord.role',
            message: 'Enter the Discord role ID:',
            default: 0
        }
    ];

    const answers = await inquirer.prompt(questions);

    const config = {
        NameSite: answers.NameSite,
        SECURE_CODE: generateSECURE_CODE(),
        ServiceApiToken: generateSECURE_CODE(),
        MaxSavedSkins: answers.MaxSavedSkins,
        domain: answers.domain,
        production: answers.production,
        smtp: {
            Host: answers['smtp.Host'],
            Username: answers['smtp.Username'],
            Password: answers['smtp.Password'],
            SMTPSecure: answers['smtp.SMTPSecure'],
            Port: answers['smtp.Port']
        },
        database: {
            host: answers['database.host'],
            user: answers['database.user'],
            password: answers['database.password'],
            database: answers['database.database'],
            port: answers['database.port']
        },
        discord: {
            enabled: answers['discord.enabled'],
            client_id: answers['discord.client_id'],
            secret_id: answers['discord.secret_id'],
            scopes: ['identify', 'email'],
            redirect_url: answers['discord.redirect_url'],
            bot: answers['discord.bot'],
            guild_id: answers['discord.guild_id'],
            role: answers['discord.role']
        },
        permissions: {
            0: ['page.userlist'],
            1: [
                'profile.changeusername',
                'profile.changeskin',
                'profile.changemail',
                'profile.changepassword',
                'profile.discord'
            ],
            2: ['profile.changeskinHD'],
            3: [
                'admin.userslist',
                'admin.useredit',
                'admin.mailsend'
            ]
        }
    };

    const yamlStr = yaml.dump(config);
    await fs.writeFile(configPath, yamlStr, 'utf8');
    console.info('Configuration saved to', configPath);

    await createDirectories();
    await runDbInit();
}

initConfig().catch(err => {
    console.error('Error initializing configuration:', err);
});