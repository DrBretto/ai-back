/* eslint-disable no-unused-vars */
/* eslint-disable strict */
require('dotenv').config();
const knex = require('knex');

const knexInstance = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL, //'postgres://lamvinadmin@lambin-reverb-postgresql-db:LAMVINtech2022!@lambin-reverb-postgresql-db.postgres.database.azure.com:5432/reverb', //process.env.DATABASE_URL,
});
