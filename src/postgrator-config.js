// postgrator-config.js
module.exports = {
  migrationDirectory: 'migrations',
  driver: 'pg',
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/postgres',
  ssl: false,
};
