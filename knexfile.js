// knexfile.js
export default {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'cookiecms',
    password: 'cookiecms',
    database: 'cookiecms'
  },
  migrations: {
    directory: './migrations'
  }
};