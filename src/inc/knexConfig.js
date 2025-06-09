import dotenv from 'dotenv';

dotenv.config();

// Determine which database client to use based on configuration
const dbType = process.env.DB_TYPE || 'pg'; // Default to mysql2 if not specified

const knexConfig = {
  client: dbType,
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  },
  pool: {
    min: 2,
    max: 10
  }
};

export default knexConfig;