// knexfile.js
dotenv.config();

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'cookiecms',
    password: process.env.DB_PASSWORD || 'cookiecms',
    database: process.env.DB_NAME || 'cookiecms'
  },
  migrations: {
    directory: './migrations'
  }
};