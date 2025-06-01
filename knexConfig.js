import readConfig from './yamlReader.js';

const config = readConfig();

// Determine which database client to use based on configuration
const dbType = config.database.type || 'pg'; // Default to mysql2 if not specified

const knexConfig = {
  client: dbType,
  connection: {
    host: config.database.host,
    user: config.database.username,
    password: config.database.pass,
    database: config.database.db,
    port: config.database.port
  },
  pool: {
    min: 2,
    max: 10
  }
};

export default knexConfig;