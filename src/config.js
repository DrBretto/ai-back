// eslint-disable-next-line strict
module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgres://gpt_extension_user:eVOMTGbFbsho14iHxQMEuRqP0HKyL1K8@dpg-chrmhtbhp8ud4n7sr3qg-a.oregon-postgres.render.com/gpt_extension',
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    'postgres://gpt_extension_user:eVOMTGbFbsho14iHxQMEuRqP0HKyL1K8@dpg-chrmhtbhp8ud4n7sr3qg-a.oregon-postgres.render.com/gpt_extension',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '3h',
};
