/* eslint-disable no-unused-vars */
/* eslint-disable strict */
require('dotenv').config();
const knex = require('knex');

const knexInstance = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL, 
});
