const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

function readConfig(configPath) {
    try {
        const filePath = path.resolve(__dirname, configPath);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const config = yaml.load(fileContents);
        return config;
    } catch (e) {
        console.error('Error reading YAML config file:', e);
        throw e;
    }
}

module.exports = readConfig;