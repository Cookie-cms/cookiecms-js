import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;

function readConfig() {
    // if (cachedConfig) {
    //     console.info('Returning cached config:', cachedConfig);
    //     return cachedConfig;
    // }

    try {
        const filePath = path.resolve(__dirname, '../config.yml');
        const fileContents = fs.readFileSync(filePath, 'utf8');

        const config = yaml.load(fileContents);

        cachedConfig = config;
        return config;
    } catch (e) {
        console.error('Error reading config file:', e);
        throw e;
    }
}

export default readConfig;
