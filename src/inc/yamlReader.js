import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;

function readConfig() {
    // if (cachedConfig) {
    //     console.log('Returning cached config:', cachedConfig);
    //     return cachedConfig;
    // }

    try {
        const filePath = path.resolve(__dirname, '../config.yml');
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Выводим содержимое файла
        // console.log('Raw file contents:', fileContents);

        const config = yaml.load(fileContents);

        // Выводим распарсенный объект
        // console.log('Parsed config:', config);

        // Логируем стек вызовов
        // console.trace('Config read from:', filePath);

        cachedConfig = config;
        return config;
    } catch (e) {
        console.error('Error reading config file:', e);
        throw e;
    }
}

export default readConfig;
