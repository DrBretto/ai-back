// config.js
module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/postgres',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://postgres@localhost:5432/postgres_test',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '3h',
};
