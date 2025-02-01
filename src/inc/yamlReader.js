import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readConfig() {
    try {
        const filePath = path.resolve(__dirname, '../config.yml');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const config = yaml.load(fileContents);
        return config;
    } catch (e) {
        logger.error('Error reading config file:', e);
        throw e;
    }
}

export default readConfig;