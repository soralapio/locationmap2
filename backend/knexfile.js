const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3', // Using sqlite3 database for development
    connection: {
      filename: path.join(__dirname, '../tools/dev-db/dev.db'),
    },
  },
  production: {
    client: 'pg',
    version: '11.1',
    connection: {
      host: 'bigdata5.sis.uta.fi',
      database: 'postgres',
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
    },
  },
};
